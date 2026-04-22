import { v4 as uuidv4 } from 'uuid';
import { IAIWorkflowEngine } from '@/domain/ai-engine/services/IInputAnalysisService';
import { IInputAnalysisService, IPromptStructuringService, IAIGenerationService, IOutputRefinementService } from '@/domain/ai-engine/services/IInputAnalysisService';
import { AIWorkflow, WorkflowExecution, ProcessingLayer, WorkflowStatus } from '@/domain/ai-engine/entities/AIWorkflow';

export class AIWorkflowEngine implements IAIWorkflowEngine {
  private executions: Map<string, WorkflowExecution> = new Map();
  private stepProcessors: Map<ProcessingLayer, any> = new Map();

  constructor(
    private readonly inputAnalysisService: IInputAnalysisService,
    private readonly promptStructuringService: IPromptStructuringService,
    private readonly aiGenerationService: IAIGenerationService,
    private readonly outputRefinementService: IOutputRefinementService
  ) {
    this.initializeProcessors();
  }

  async executeWorkflow(workflow: AIWorkflow, input: Record<string, any>): Promise<{
    executionId: string;
    output: Record<string, any>;
    stepResults: Record<string, any>;
    metrics: {
      totalTokens: number;
      processingTime: number;
      cost: number;
    };
  }> {
    const executionId = uuidv4();
    const startTime = Date.now();
    
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id || 'unknown',
      status: WorkflowStatus.PROCESSING,
      input,
      stepResults: {},
      metrics: {
        totalTokens: 0,
        processingTime: 0,
        cost: 0
      },
      startedAt: new Date()
    };

    this.executions.set(executionId, execution);

    try {
      const sortedSteps = workflow.steps.sort((a, b) => a.order - b.order);
      let context = { ...input };
      let totalTokens = 0;
      let totalCost = 0;

      for (const step of sortedSteps) {
        // Check dependencies
        if (!this.areDependenciesMet(step, execution.stepResults!)) {
          throw new Error(`Dependencies not met for step: ${step.id}`);
        }

        const stepResult = await this.executeStep(step, context, workflow.modelConfig);
        execution.stepResults![step.id] = stepResult;
        
        // Update context with step results
        context = { ...context, [step.id]: stepResult.output };
        
        // Update metrics
        if (stepResult.metrics) {
          totalTokens += stepResult.metrics.tokens || 0;
          totalCost += stepResult.metrics.cost || 0;
        }
      }

      const processingTime = Date.now() - startTime;
      
      execution.status = WorkflowStatus.COMPLETED;
      execution.output = context;
      execution.completedAt = new Date();
      execution.metrics = {
        totalTokens,
        processingTime,
        cost: totalCost
      };

      return {
        executionId,
        output: context,
        stepResults: execution.stepResults!,
        metrics: execution.metrics
      };

    } catch (error) {
      execution.status = WorkflowStatus.FAILED;
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date();
      
      throw error;
    }
  }

  async validateWorkflow(workflow: AIWorkflow): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic structure
    if (!workflow.name || workflow.name.trim() === '') {
      errors.push('Workflow name is required');
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }

    // Validate steps
    const stepIds = new Set<string>();
    for (const step of workflow.steps) {
      if (!step.id || step.id.trim() === '') {
        errors.push(`Step ID is required for step at order ${step.order}`);
      }

      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);

      // Validate layer
      if (!Object.values(ProcessingLayer).includes(step.layer)) {
        errors.push(`Invalid layer: ${step.layer} for step: ${step.id}`);
      }

      // Validate dependencies
      for (const dependency of step.dependencies) {
        if (!stepIds.has(dependency)) {
          warnings.push(`Dependency '${dependency}' not found for step: ${step.id}`);
        }
      }

      // Validate step configuration
      const stepValidation = await this.validateStep(step);
      errors.push(...stepValidation.errors);
      warnings.push(...stepValidation.warnings);
    }

    // Check for circular dependencies
    const circularCheck = this.detectCircularDependencies(workflow.steps);
    if (circularCheck.hasCircularDependency) {
      errors.push(`Circular dependency detected: ${circularCheck.cycle?.join(' -> ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async getExecutionStatus(executionId: string): Promise<{
    status: string;
    currentStep?: string;
    progress: number;
    error?: string;
  }> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const completedSteps = Object.keys(execution.stepResults || {}).length;
    const totalSteps = 4; // Assuming 4 layers, this should be dynamic based on workflow
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return {
      status: execution.status,
      currentStep: this.getCurrentStep(execution),
      progress,
      error: execution.error
    };
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.status === WorkflowStatus.COMPLETED) {
      throw new Error(`Execution ${executionId} is already completed`);
    }

    execution.status = WorkflowStatus.CANCELLED;
    execution.completedAt = new Date();
    execution.error = 'Execution cancelled by user';
  }

  private initializeProcessors(): void {
    // Initialize step processors for each layer
    this.stepProcessors.set(ProcessingLayer.INPUT_ANALYSIS, this.createInputAnalysisProcessor());
    this.stepProcessors.set(ProcessingLayer.PROMPT_STRUCTURING, this.createPromptStructuringProcessor());
    this.stepProcessors.set(ProcessingLayer.AI_GENERATION, this.createAIGenerationProcessor());
    this.stepProcessors.set(ProcessingLayer.OUTPUT_REFINEMENT, this.createOutputRefinementProcessor());
  }

  private async executeStep(step: any, context: Record<string, any>, modelConfig: any): Promise<{
    output: any;
    metrics?: {
      tokens: number;
      cost: number;
      processingTime: number;
    };
  }> {
    const processor = this.stepProcessors.get(step.layer);
    if (!processor) {
      throw new Error(`No processor found for layer: ${step.layer}`);
    }

    const startTime = Date.now();
    
    try {
      const result = await processor.process(step, context, modelConfig);
      const processingTime = Date.now() - startTime;

      return {
        output: result,
        metrics: {
          tokens: result.tokens || 0,
          cost: result.cost || 0,
          processingTime
        }
      };
    } catch (error) {
      throw new Error(`Step ${step.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createInputAnalysisProcessor() {
    return {
      process: async (step: any, context: Record<string, any>) => {
        const input = context.userInput || context.input || '';
        const analysis = await this.inputAnalysisService.performFullAnalysis(input);
        return { analysis };
      }
    };
  }

  private createPromptStructuringProcessor() {
    return {
      process: async (step: any, context: Record<string, any>) => {
        const analysis = context.input_analysis?.analysis || context.analysis;
        if (!analysis) {
          throw new Error('Analysis result not found in context');
        }

        const template = await this.promptStructuringService.createPromptTemplate(
          analysis,
          step.config
        );

        // Render the template with context
        const renderedPrompt = this.renderTemplate(template.userPromptTemplate, context);
        
        return {
          systemPrompt: template.systemPrompt,
          userPrompt: renderedPrompt,
          variables: template.variables
        };
      }
    };
  }

  private createAIGenerationProcessor() {
    return {
      process: async (step: any, context: Record<string, any>, modelConfig: any) => {
        const promptData = context.prompt_structuring || context;
        const prompt = promptData.userPrompt || context.userInput || '';
        
        const generationResult = await this.aiGenerationService.generate({
          prompt,
          config: { ...modelConfig, ...step.config },
          context: { systemPrompt: promptData.systemPrompt }
        });

        return {
          content: generationResult.content,
          tokens: generationResult.tokens.total,
          cost: generationResult.cost,
          model: generationResult.model
        };
      }
    };
  }

  private createOutputRefinementProcessor() {
    return {
      process: async (step: any, context: Record<string, any>) => {
        const content = context.ai_generation?.content || context.content || '';
        const rules = step.config.refinementRules || [];

        if (rules.length === 0) {
          return { refinedContent: content };
        }

        const refinementResult = await this.outputRefinementService.refineContent(
          content,
          rules
        );

        return {
          refinedContent: refinementResult.refinedContent,
          qualityScore: refinementResult.qualityScore,
          appliedRules: refinementResult.appliedRules,
          suggestions: refinementResult.suggestions
        };
      }
    };
  }

  private renderTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? String(context[key]) : match;
    });
  }

  private areDependenciesMet(step: any, stepResults: Record<string, any>): boolean {
    return step.dependencies.every((dep: string) => stepResults[dep] !== undefined);
  }

  private getCurrentStep(execution: WorkflowExecution): string | undefined {
    const completedSteps = Object.keys(execution.stepResults || {});
    if (completedSteps.length === 0) {
      return 'input_analysis';
    }
    
    const layers = Object.values(ProcessingLayer);
    const currentIndex = completedSteps.length - 1;
    return layers[currentIndex + 1];
  }

  private detectCircularDependencies(steps: any[]): { hasCircularDependency: boolean; cycle?: string[] } {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const parent = new Map<string, string>();

    const dfs = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        // Found cycle, reconstruct it
        const cycle: string[] = [];
        let current = stepId;
        do {
          cycle.unshift(current);
          current = parent.get(current)!;
        } while (current !== stepId);
        cycle.push(stepId);
        throw new Error(`Cycle detected: ${cycle.join(' -> ')}`);
      }

      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step) {
        for (const dep of step.dependencies) {
          parent.set(dep, stepId);
          if (dfs(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    try {
      for (const step of steps) {
        if (!visited.has(step.id)) {
          dfs(step.id);
        }
      }
      return { hasCircularDependency: false };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cycle detected')) {
        return { hasCircularDependency: true, cycle: error.message.split(': ')[1].split(' -> ') };
      }
      return { hasCircularDependency: false };
    }
  }

  private async validateStep(step: any): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate step configuration based on layer
    switch (step.layer) {
      case ProcessingLayer.INPUT_ANALYSIS:
        if (step.config && typeof step.config !== 'object') {
          errors.push('Input analysis step config must be an object');
        }
        break;

      case ProcessingLayer.PROMPT_STRUCTURING:
        if (!step.config || !step.config.style) {
          warnings.push('Prompt structuring step should specify a style');
        }
        break;

      case ProcessingLayer.AI_GENERATION:
        if (!step.config || !step.config.model) {
          warnings.push('AI generation step should specify a model');
        }
        break;

      case ProcessingLayer.OUTPUT_REFINEMENT:
        if (!step.config || !step.config.refinementRules) {
          warnings.push('Output refinement step should specify refinement rules');
        }
        break;
    }

    return { errors, warnings };
  }

  // Advanced workflow features

  async executeWorkflowWithRetry(workflow: AIWorkflow, input: Record<string, any>, maxRetries: number = 3): Promise<{
    executionId: string;
    output: Record<string, any>;
    stepResults: Record<string, any>;
    metrics: {
      totalTokens: number;
      processingTime: number;
      cost: number;
    };
    attempts: number;
  }> {
    let lastError: Error | undefined;
    let attempts = 0;

    for (let i = 0; i < maxRetries; i++) {
      attempts++;
      try {
        const result = await this.executeWorkflow(workflow, input);
        return { ...result, attempts };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Wait before retry (exponential backoff)
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError || new Error('Workflow execution failed after all retries');
  }

  async scheduleWorkflow(workflow: AIWorkflow, input: Record<string, any>, scheduleTime: Date): Promise<{
    scheduledExecutionId: string;
    scheduledTime: Date;
  }> {
    const scheduledExecutionId = uuidv4();
    
    // In a real implementation, this would integrate with a job scheduler
    // For now, we'll simulate scheduling with a timeout
    const delay = scheduleTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(async () => {
        try {
          await this.executeWorkflow(workflow, input);
        } catch (error) {
          console.error(`Scheduled workflow execution failed: ${error}`);
        }
      }, delay);
    } else {
      throw new Error('Schedule time must be in the future');
    }

    return {
      scheduledExecutionId,
      scheduledTime: scheduleTime
    };
  }
}
