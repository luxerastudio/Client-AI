import { v4 as uuidv4 } from 'uuid';
import { IWorkflowEngine, IWorkflowOrchestrator, IStepProcessor } from '../../domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowTemplate, WorkflowExecution, WorkflowStep, WorkflowContext, StepResult, WorkflowStatus, StepStatus } from '../../domain/workflow-engine/entities/Workflow';
import { WorkflowRegistry } from './WorkflowRegistry';
import { WorkflowExecutionRepository, CreateWorkflowExecutionData, UpdateWorkflowExecutionData } from '../repositories/WorkflowExecutionRepository';
import { AnalyzeInputProcessor } from './step-processors/AnalyzeInputProcessor';
import { BreakdownStructureProcessor } from './step-processors/BreakdownStructureProcessor';
import { GenerateOutputProcessor } from './step-processors/GenerateOutputProcessor';
import { RefineOutputProcessor } from './step-processors/RefineOutputProcessor';

export class WorkflowExecutionEngineDB implements IWorkflowEngine, IWorkflowOrchestrator {
  private registry: WorkflowRegistry;
  private executionRepository: WorkflowExecutionRepository;
  private aiEngine: any;

  constructor(registry: WorkflowRegistry, executionRepository: WorkflowExecutionRepository, aiEngine?: any) {
    this.registry = registry;
    this.executionRepository = executionRepository;
    this.aiEngine = aiEngine;
    
    // Register real step processors
    this.registerStepProcessors();
  }

  private registerStepProcessors(): void {
    const analyzeProcessor = new AnalyzeInputProcessor();
    const breakdownProcessor = new BreakdownStructureProcessor();
    const generateProcessor = new GenerateOutputProcessor(this.aiEngine);
    const refineProcessor = new RefineOutputProcessor(this.aiEngine);

    this.registry.registerStepProcessor('analyze_input', analyzeProcessor);
    this.registry.registerStepProcessor('breakdown_structure', breakdownProcessor);
    this.registry.registerStepProcessor('generate_output', generateProcessor);
    this.registry.registerStepProcessor('refine_output', refineProcessor);
  }

  // Template Management
  async registerTemplate(template: WorkflowTemplate): Promise<void> {
    await this.registry.registerTemplate(template);
  }

  async getTemplate(id: string): Promise<WorkflowTemplate | null> {
    return await this.registry.getTemplate(id);
  }

  async getTemplatesByCategory(category: string): Promise<WorkflowTemplate[]> {
    return await this.registry.getTemplatesByCategory(category);
  }

  async getAllTemplates(): Promise<WorkflowTemplate[]> {
    return await this.registry.getAllTemplates();
  }

  async updateTemplate(id: string, template: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    return await this.registry.updateTemplate(id, template);
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.registry.deleteTemplate(id);
  }

  // Execution Management
  async executeWorkflow(templateId: string, input: Record<string, any>, config?: Record<string, any>): Promise<WorkflowExecution>;
  async executeWorkflow(template: WorkflowTemplate, input: Record<string, any>, config?: Record<string, any>): Promise<WorkflowExecution>;
  async executeWorkflow(templateOrId: string | WorkflowTemplate, input: Record<string, any>, config?: Record<string, any>): Promise<WorkflowExecution> {
    let template: WorkflowTemplate | null;
    
    if (typeof templateOrId === 'string') {
      template = await this.getTemplate(templateOrId);
      if (!template) {
        throw new Error(`Template with id '${templateOrId}' not found`);
      }
    } else {
      template = templateOrId;
    }

    return await this.executeWorkflowInternal(template, input, config || {});
  }

  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    return await this.executionRepository.findById(executionId);
  }

  async getExecutionsByTemplate(templateId: string): Promise<WorkflowExecution[]> {
    return await this.executionRepository.findByTemplateId(templateId);
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = await this.executionRepository.findById(executionId);
    if (!execution) {
      throw new Error(`Execution with id '${executionId}' not found`);
    }

    if (execution.status === WorkflowStatus.COMPLETED) {
      throw new Error(`Execution ${executionId} is already completed`);
    }

    const duration = execution.startedAt ? Date.now() - execution.startedAt.getTime() : 0;
    await this.executionRepository.markCancelled(executionId, duration);
  }

  async retryExecution(executionId: string): Promise<WorkflowExecution> {
    const originalExecution = await this.executionRepository.findById(executionId);
    if (!originalExecution) {
      throw new Error(`Execution with id '${executionId}' not found`);
    }

    const template = await this.getTemplate(originalExecution.templateId);
    if (!template) {
      throw new Error(`Template with id '${originalExecution.templateId}' not found`);
    }

    // Create new execution with same input
    return await this.executeWorkflowInternal(template, originalExecution.input, {
      retry: true,
      originalExecutionId: executionId
    });
  }

  // Step Processing
  registerStepProcessor(processor: IStepProcessor): void {
    const processorType = processor.constructor.name.replace('Processor', '').toLowerCase();
    this.registry.registerStepProcessor(processorType, processor);
  }

  async processStep(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const processor = this.registry.getStepProcessor(step.type);
    if (!processor) {
      throw new Error(`No processor found for step type: ${step.type}`);
    }

    return await processor.process(step, context);
  }

  async validateWorkflow(template: WorkflowTemplate): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate template structure
    if (!template.steps || template.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }

    // Validate step dependencies
    const dependencyValidation = await this.validateDependencies(template.steps);
    if (!dependencyValidation.isValid) {
      errors.push(...dependencyValidation.errors);
    }

    // Validate step processors
    for (const step of template.steps) {
      const processor = this.registry.getStepProcessor(step.type);
      if (!processor) {
        errors.push(`No processor available for step type: ${step.type}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async resumeExecution(executionId: string): Promise<WorkflowExecution> {
    const execution = await this.executionRepository.findById(executionId);
    if (!execution) {
      throw new Error(`Execution with id '${executionId}' not found`);
    }

    if (execution.status !== WorkflowStatus.FAILED && execution.status !== WorkflowStatus.CANCELLED) {
      throw new Error(`Cannot resume execution in status: ${execution.status}`);
    }

    const template = await this.getTemplate(execution.templateId);
    if (!template) {
      throw new Error(`Template with id '${execution.templateId}' not found`);
    }

    // Reset execution status and continue from where it left off
    await this.executionRepository.update(executionId, {
      status: WorkflowStatus.RUNNING,
      error: undefined
    });

    return await this.executeSteps(template, execution);
  }

  async pauseExecution(executionId: string): Promise<void> {
    const execution = await this.executionRepository.findById(executionId);
    if (!execution) {
      throw new Error(`Execution with id '${executionId}' not found`);
    }

    if (execution.status !== 'running') {
      throw new Error(`Cannot pause execution in status: ${execution.status}`);
    }

    const duration = execution.startedAt ? Date.now() - execution.startedAt.getTime() : 0;
    await this.executionRepository.markCancelled(executionId, duration);
  }

  async stopExecution(executionId: string): Promise<void> {
    await this.cancelExecution(executionId);
  }

  async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    return await this.processStep(step, context);
  }

  async retryStep(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const maxRetries = step.retryConfig?.maxRetries || 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.processStep(step, context);
        if (result.success) {
          return result;
        }
        lastError = new Error(result.error || 'Step failed');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }

      // Wait before retry (with exponential backoff)
      if (attempt < maxRetries) {
        const delay = (step.retryConfig?.retryDelay || 1000) * Math.pow(step.retryConfig?.backoffMultiplier || 2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Step failed after all retries'
    };
  }

  async skipStep(step: WorkflowStep, context: WorkflowContext): Promise<void> {
    // Mark step as skipped
    console.log(`Step ${step.id} skipped`);
  }

  async validateDependencies(steps: WorkflowStep[]): Promise<{
    isValid: boolean;
    errors: string[];
    circularDependencies: string[];
    missingDependencies: string[];
  }> {
    const circularDependencies: string[] = [];
    const missingDependencies: string[] = [];
    const errors: string[] = [];

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (stepId: string, path: string[]): boolean => {
      if (recursionStack.has(stepId)) {
        circularDependencies.push([...path, stepId].join(' -> '));
        return true;
      }

      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step && step.dependencies) {
        for (const dep of step.dependencies) {
          if (dfs(dep, [...path, stepId])) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        dfs(step.id, []);
      }
    }

    // Check for missing dependencies
    const stepIds = new Set(steps.map(s => s.id));
    for (const step of steps) {
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep)) {
            missingDependencies.push(`Step ${step.id} depends on missing step ${dep}`);
          }
        }
      }
    }

    return {
      isValid: circularDependencies.length === 0 && missingDependencies.length === 0,
      errors,
      circularDependencies,
      missingDependencies
    };
  }

  // Private Methods
  private async executeWorkflowInternal(template: WorkflowTemplate, input: Record<string, any>, config: Record<string, any>): Promise<WorkflowExecution> {
    const executionId = uuidv4();

    const executionData: CreateWorkflowExecutionData = {
      templateId: template.id || template.name,
      templateName: template.name,
      status: WorkflowStatus.RUNNING,
      input,
      steps: template.steps.map(step => ({ ...step, status: StepStatus.PENDING })),
      currentStep: 0,
      progress: 0,
      metadata: { ...config }
    };

    // Create execution in database
    const execution = await this.executionRepository.create(executionData);

    try {
      const result = await this.executeSteps(template, execution);
      return result;
    } catch (error) {
      const duration = execution.startedAt ? Date.now() - execution.startedAt.getTime() : 0;
      if (execution.id) {
        await this.executionRepository.markFailed(execution.id, error instanceof Error ? error.message : 'Unknown error', duration);
      }
      throw error;
    }
  }

  private async executeSteps(template: WorkflowTemplate, execution: WorkflowExecution): Promise<WorkflowExecution> {
    const context: WorkflowContext = {
      input: execution.input,
      stepResults: {},
      metadata: execution.metadata || {},
      config: {}
    };

    const sortedSteps = [...execution.steps].sort((a, b) => a.order - b.order);
    const completedSteps: string[] = [];

    for (const step of sortedSteps) {
      // Check if execution was cancelled
      if (!execution.id) {
        throw new Error('Execution ID is required');
      }
      const currentExecution = await this.executionRepository.findById(execution.id);
      if (!currentExecution || currentExecution.status === WorkflowStatus.CANCELLED) {
        break;
      }

      // Check dependencies
      if (!step.dependencies.every(dep => completedSteps.includes(dep))) {
        throw new Error(`Dependencies not met for step: ${step.id}`);
      }

      // Execute step
      step.status = StepStatus.RUNNING;
      step.startedAt = new Date();
      
      // Update progress in database
      const progress = (completedSteps.length / sortedSteps.length) * 100;
      await this.executionRepository.updateProgress(execution.id, step.order, progress, execution.steps);

      try {
        const result = await this.retryStep(step, context);
        
        step.status = StepStatus.COMPLETED;
        step.completedAt = new Date();
        step.result = result;
        context.stepResults[step.id] = result;
        completedSteps.push(step.id);

        // Update execution with completed step
        await this.executionRepository.updateProgress(execution.id, step.order, progress, execution.steps);

      } catch (error) {
        step.status = StepStatus.FAILED;
        step.error = error instanceof Error ? error.message : 'Unknown error';
        step.completedAt = new Date();
        
        const duration = execution.startedAt ? Date.now() - execution.startedAt.getTime() : 0;
        await this.executionRepository.markFailed(execution.id, step.error || 'Step failed', duration);
        
        throw error;
      }
    }

    // Execution completed successfully
    const finalOutput = this.collectFinalOutput(context);
    const duration = execution.startedAt ? Date.now() - execution.startedAt.getTime() : 0;
    
    await this.executionRepository.markCompleted(execution.id!, finalOutput, duration);

    // Return updated execution
    const completedExecution = await this.executionRepository.findById(execution.id!);
    if (!completedExecution) {
      throw new Error('Failed to retrieve completed execution');
    }

    return completedExecution;
  }

  // Legacy IWorkflowEngine interface methods
  async execute(workflow: WorkflowTemplate, input?: Record<string, any>): Promise<WorkflowExecution> {
    return await this.executeWorkflow(workflow, input || {});
  }

  async validate(workflow: WorkflowTemplate): Promise<boolean> {
    const validation = await this.validateWorkflow(workflow);
    return validation.isValid;
  }

  async getExecutionStatus(executionId: string): Promise<WorkflowExecution | null> {
    return await this.getExecution(executionId);
  }

  getExecutableSteps(steps: WorkflowStep[], completedSteps: string[]): string[] {
    return steps
      .filter(step => 
        !completedSteps.includes(step.id) &&
        step.dependencies.every(dep => completedSteps.includes(dep))
      )
      .map(step => step.id)
      .sort((a, b) => {
        const stepA = steps.find(s => s.id === a);
        const stepB = steps.find(s => s.id === b);
        return (stepA?.order || 0) - (stepB?.order || 0);
      });
  }

  private collectFinalOutput(context: WorkflowContext): Record<string, any> {
    const output: Record<string, any> = {};

    // Collect results from all steps
    for (const [stepId, result] of Object.entries(context.stepResults)) {
      if (result.success && result.data) {
        output[stepId] = result.data;
      }
    }

    // Try to find the main output (usually from the last step)
    const stepIds = Object.keys(context.stepResults);
    if (stepIds.length > 0) {
      const lastStepId = stepIds[stepIds.length - 1];
      const lastResult = context.stepResults[lastStepId];
      
      if (lastResult.success && lastResult.data) {
        // Add common output fields
        if (lastResult.data.output) {
          output.content = lastResult.data.output;
        }
        if (lastResult.data.refinedOutput) {
          output.content = lastResult.data.refinedOutput;
        }
        if (lastResult.data.metadata) {
          output.metadata = lastResult.data.metadata;
        }
      }
    }

    return output;
  }
}
