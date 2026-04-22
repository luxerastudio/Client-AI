import { IWorkflowRegistry, IStepProcessor } from '../../domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowTemplate } from '../../domain/workflow-engine/entities/Workflow';

export class WorkflowRegistry implements IWorkflowRegistry {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private stepProcessors: Map<string, IStepProcessor> = new Map();

  constructor() {
    // Templates will be registered dynamically
  }

  async registerTemplate(template: WorkflowTemplate): Promise<void> {
    // Validate template before registering
    this.validateTemplate(template);
    
    // Ensure template has an ID
    const templateId = template.id || template.name;
    if (!templateId) {
      throw new Error('Template must have either an id or name');
    }
    
    this.templates.set(templateId, template);
  }

  async unregisterTemplate(id: string): Promise<void> {
    if (!this.templates.has(id)) {
      throw new Error(`Template with id '${id}' not found`);
    }
    
    this.templates.delete(id);
  }

  async getTemplate(id: string): Promise<WorkflowTemplate | null> {
    return this.templates.get(id) || null;
  }

  async findTemplates(criteria: {
    category?: string;
    tags?: string[];
    name?: string;
  }): Promise<WorkflowTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (criteria.category) {
      templates = templates.filter(template => template.category === criteria.category);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      templates = templates.filter(template => 
        criteria.tags!.some(tag => template.tags.includes(tag))
      );
    }

    if (criteria.name) {
      templates = templates.filter(template => 
        template.name.toLowerCase().includes(criteria.name!.toLowerCase())
      );
    }

    return templates;
  }

  registerStepProcessor(type: string, processor: IStepProcessor): void {
    this.stepProcessors.set(type, processor);
  }

  getStepProcessor(type: string): IStepProcessor | null {
    return this.stepProcessors.get(type) || null;
  }

  getSupportedStepTypes(): string[] {
    return Array.from(this.stepProcessors.keys());
  }

  
  private validateTemplate(template: WorkflowTemplate): void {
    if (!template.id || template.id.trim() === '') {
      throw new Error('Template ID is required');
    }

    if (!template.name || template.name.trim() === '') {
      throw new Error('Template name is required');
    }

    if (!template.category || template.category.trim() === '') {
      throw new Error('Template category is required');
    }

    if (!template.steps || template.steps.length === 0) {
      throw new Error('Template must have at least one step');
    }

    // Validate steps
    this.validateSteps(template.steps);

    // Check for duplicate IDs
    if (this.templates.has(template.id)) {
      throw new Error(`Template with id '${template.id}' already exists`);
    }
  }

  private validateSteps(steps: any[]): void {
    const stepIds = new Set<string>();
    
    for (const step of steps) {
      if (!step.id || step.id.trim() === '') {
        throw new Error('Step ID is required');
      }

      if (stepIds.has(step.id)) {
        throw new Error(`Duplicate step ID: ${step.id}`);
      }

      stepIds.add(step.id);

      // Validate step type
      const validTypes = ['analyze_input', 'breakdown_structure', 'generate_output', 'refine_output'];
      if (!validTypes.includes(step.type)) {
        throw new Error(`Invalid step type: ${step.type}`);
      }

      // Validate dependencies
      if (step.dependencies && Array.isArray(step.dependencies)) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep) && !steps.find(s => s.id === dep)) {
            // Dependency might be on a later step, which is valid
          }
        }
      }
    }

    // Check for circular dependencies
    this.checkCircularDependencies(steps);
  }

  private checkCircularDependencies(steps: any[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        throw new Error(`Circular dependency detected involving step: ${stepId}`);
      }

      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step && step.dependencies) {
        for (const dep of step.dependencies) {
          if (dfs(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        dfs(step.id);
      }
    }
  }

  // Additional utility methods

  async getAllTemplates(): Promise<WorkflowTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplatesByCategory(category: string): Promise<WorkflowTemplate[]> {
    return Array.from(this.templates.values()).filter(template => 
      template.category === category
    );
  }

  async getActiveTemplates(): Promise<WorkflowTemplate[]> {
    return Array.from(this.templates.values()).filter(template => 
      template.isActive
    );
  }

  async updateTemplate(id: string, updates: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    const existingTemplate = this.templates.get(id);
    if (!existingTemplate) {
      throw new Error(`Template with id '${id}' not found`);
    }

    const updatedTemplate = { ...existingTemplate, ...updates };
    
    // Re-validate the updated template
    this.validateTemplate(updatedTemplate);
    
    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    if (!this.templates.has(id)) {
      throw new Error(`Template with id '${id}' not found`);
    }
    
    this.templates.delete(id);
  }

  async searchTemplates(query: string): Promise<WorkflowTemplate[]> {
    const lowercaseQuery = query.toLowerCase();
    
    return Array.from(this.templates.values()).filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      (template.description && template.description.toLowerCase().includes(lowercaseQuery)) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      template.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  getTemplateCount(): number {
    return this.templates.size;
  }

  getProcessorCount(): number {
    return this.stepProcessors.size;
  }

  async getTemplateStats(): Promise<{
    totalTemplates: number;
    activeTemplates: number;
    categories: Record<string, number>;
    stepTypes: Record<string, number>;
  }> {
    const templates = Array.from(this.templates.values());
    const activeTemplates = templates.filter(t => t.isActive);
    
    const categories: Record<string, number> = {};
    const stepTypes: Record<string, number> = {};

    templates.forEach(template => {
      categories[template.category] = (categories[template.category] || 0) + 1;
      
      template.steps.forEach(step => {
        stepTypes[step.type] = (stepTypes[step.type] || 0) + 1;
      });
    });

    return {
      totalTemplates: templates.length,
      activeTemplates: activeTemplates.length,
      categories,
      stepTypes
    };
  }
}
