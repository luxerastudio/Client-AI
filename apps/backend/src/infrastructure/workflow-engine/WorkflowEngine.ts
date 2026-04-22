import { AIEngine, AIRequest, AIResponse } from '../ai/AIEngine';
import { config } from '../../config';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  variables?: Record<string, any>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'ai' | 'condition' | 'action' | 'parallel' | 'delay';
  config: any;
  next?: string | string[];
  onError?: string;
  retryPolicy?: RetryPolicy;
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'event' | 'webhook';
  config: any;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential' | 'linear';
  delay: number;
  maxDelay?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: any;
  output?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  currentStepId?: string;
  stepResults: Map<string, any>;
  metadata: Record<string, any>;
}

export interface WorkflowContext {
  execution: WorkflowExecution;
  variables: Record<string, any>;
  stepResults: Map<string, any>;
  aiEngine: AIEngine;
  metadata: Record<string, any>;
}

export class WorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private aiEngine: AIEngine;
  private config: any;
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private scheduledWorkflows: Map<string, NodeJS.Timeout> = new Map();

  constructor(workflowConfig?: any, aiEngine?: AIEngine) {
    this.config = workflowConfig || config.workflow;
    this.aiEngine = aiEngine!;
  }

  async initialize(): Promise<void> {
    console.log('Initializing Workflow Engine...');
    
    // Set up cleanup interval
    setInterval(() => {
      this.cleanupCompletedExecutions();
    }, 60000); // Every minute

    console.log('Workflow Engine initialized');
  }

  // Workflow registration
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.validateWorkflow(workflow);
    this.workflows.set(workflow.id, workflow);
    console.log(`Workflow registered: ${workflow.name} (${workflow.id})`);
  }

  unregisterWorkflow(workflowId: string): void {
    this.workflows.delete(workflowId);
    console.log(`Workflow unregistered: ${workflowId}`);
  }

  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  // Execution management
  async executeWorkflow(workflowId: string, input: any, userId?: string): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Check concurrent execution limit
    const runningCount = Array.from(this.executions.values())
      .filter(exec => exec.status === 'running').length;
    
    if (runningCount >= this.config.maxConcurrentWorkflows) {
      throw new Error('Maximum concurrent workflows reached');
    }

    const execution: WorkflowExecution = {
      id: this.generateId(),
      workflowId,
      userId,
      status: 'pending',
      input,
      startedAt: new Date(),
      stepResults: new Map(),
      metadata: {}
    };

    this.executions.set(execution.id, execution);

    // Start execution asynchronously
    this.runWorkflow(execution, workflow).catch(error => {
      console.error(`Workflow execution failed: ${execution.id}`, error);
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date();
    });

    return execution;
  }

  private async runWorkflow(execution: WorkflowExecution, workflow: WorkflowDefinition): Promise<void> {
    execution.status = 'running';
    
    try {
      const context: WorkflowContext = {
        execution,
        variables: { ...workflow.variables, ...execution.input },
        stepResults: execution.stepResults,
        aiEngine: this.aiEngine!,
        metadata: {}
      };

      // Start with trigger steps or first step
      let currentSteps = workflow.steps.filter(step => 
        workflow.triggers.some(trigger => trigger.type === 'manual')
      ).map(step => step.id);

      if (currentSteps.length === 0 && workflow.steps.length > 0) {
        currentSteps = [workflow.steps[0].id];
      }

      while (currentSteps.length > 0 && execution.status === 'running') {
        const nextSteps: string[] = [];

        for (const stepId of currentSteps) {
          const step = workflow.steps.find(s => s.id === stepId);
          if (!step) continue;

          execution.currentStepId = stepId;

          try {
            const result = await this.executeStep(step, context);
            context.stepResults.set(stepId, result);

            // Determine next steps
            const stepNext = this.determineNextSteps(step, result, workflow.steps);
            nextSteps.push(...stepNext);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Step execution failed: ${stepId}`, error);

            // Handle error with retry or error step
            const handled = await this.handleStepError(step, error, context);
            if (!handled) {
              execution.status = 'failed';
              execution.error = errorMessage;
              break;
            }
          }
        }

        currentSteps = [...new Set(nextSteps)]; // Remove duplicates
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
        execution.output = this.collectOutput(context);
      }
    } finally {
      execution.completedAt = new Date();
    }
  }

  private async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    console.log(`Executing step: ${step.name} (${step.id})`);

    switch (step.type) {
      case 'ai':
        return await this.executeAIStep(step, context);
      case 'condition':
        return await this.executeConditionStep(step, context);
      case 'action':
        return await this.executeActionStep(step, context);
      case 'parallel':
        return await this.executeParallelStep(step, context);
      case 'delay':
        return await this.executeDelayStep(step, context);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeAIStep(step: WorkflowStep, context: WorkflowContext): Promise<string> {
    const config = step.config as { prompt: string; systemPrompt?: string };
    
    // Replace variables in prompt
    const prompt = this.replaceVariables(config.prompt, context);
    const systemPrompt = config.systemPrompt ? this.replaceVariables(config.systemPrompt, context) : undefined;

    const aiRequest: AIRequest = {
      prompt,
      systemPrompt,
      context: JSON.stringify(context.variables),
      temperature: 0.7,
      maxTokens: 1000
    };

    const response = await context.aiEngine.generate(aiRequest);
    return response.content;
  }

  private async executeConditionStep(step: WorkflowStep, context: WorkflowContext): Promise<boolean> {
    const config = step.config as { condition: string };
    
    // Evaluate condition (simplified)
    const condition = this.replaceVariables(config.condition, context);
    
    // Basic condition evaluation (in production, use a proper expression parser)
    try {
      // This is a simplified evaluation - in production use a safe expression evaluator
      const result = eval(condition);
      return Boolean(result);
    } catch (error) {
      console.error('Condition evaluation failed:', error);
      return false;
    }
  }

  private async executeActionStep(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const config = step.config as { action: string; params?: any };
    
    // Execute predefined actions
    switch (config.action) {
      case 'log':
        console.log('Workflow Action Log:', config.params?.message || 'No message');
        return { logged: true };
      case 'store':
        const key = config.params?.key;
        const value = config.params?.value;
        if (key && value !== undefined) {
          context.variables[key] = this.replaceVariables(JSON.stringify(value), context);
        }
        return { stored: true };
      case 'calculate':
        // Simple calculation action
        return { result: Math.random() * 100 }; // Mock calculation
      default:
        throw new Error(`Unknown action: ${config.action}`);
    }
  }

  private async executeParallelStep(step: WorkflowStep, context: WorkflowContext): Promise<any[]> {
    const config = step.config as { steps: string[] };
    const workflow = this.workflows.get(context.execution.workflowId)!;
    
    const parallelSteps = config.steps.map(stepId => 
      workflow.steps.find(s => s.id === stepId)
    ).filter(Boolean) as WorkflowStep[];

    const results = await Promise.all(
      parallelSteps.map(async (parallelStep) => {
        return await this.executeStep(parallelStep, context);
      })
    );

    return results;
  }

  private async executeDelayStep(step: WorkflowStep, context: WorkflowContext): Promise<void> {
    const config = step.config as { delay: number };
    const delayMs = config.delay || 1000;
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  private determineNextSteps(step: WorkflowStep, result: any, allSteps: WorkflowStep[]): string[] {
    if (!step.next) return [];
    
    if (typeof step.next === 'string') {
      return [step.next];
    }
    
    if (Array.isArray(step.next)) {
      return step.next;
    }
    
    // Handle conditional next steps
    if (typeof step.next === 'object') {
      const condition = step.next as { condition: string; true: string; false: string };
      if (result === true || result === 'true') {
        return [condition.true];
      } else {
        return [condition.false];
      }
    }
    
    return [];
  }

  private async handleStepError(step: WorkflowStep, error: any, context: WorkflowContext): Promise<boolean> {
    if (step.onError) {
      const errorStep = this.workflows.get(context.execution.workflowId)!
        .steps.find(s => s.id === step.onError);
      
      if (errorStep) {
        await this.executeStep(errorStep, context);
        return true;
      }
    }

    // Apply retry policy
    if (step.retryPolicy) {
      const retryCount = context.metadata[`retry_${step.id}`] || 0;
      if (retryCount < step.retryPolicy.maxAttempts) {
        context.metadata[`retry_${step.id}`] = retryCount + 1;
        
        const delay = this.calculateRetryDelay(step.retryPolicy, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the step
        await this.executeStep(step, context);
        return true;
      }
    }

    return false;
  }

  private calculateRetryDelay(policy: RetryPolicy, attempt: number): number {
    switch (policy.backoffType) {
      case 'fixed':
        return policy.delay;
      case 'exponential':
        const delay = policy.delay * Math.pow(2, attempt);
        return policy.maxDelay ? Math.min(delay, policy.maxDelay) : delay;
      case 'linear':
        return policy.delay * (attempt + 1);
      default:
        return policy.delay;
    }
  }

  private replaceVariables(template: string, context: WorkflowContext): string {
    let result = template;
    
    // Replace step results
    context.stepResults.forEach((value, key) => {
      result = result.replace(new RegExp(`\\{\\{stepResults\\.${key}\\}\\}`, 'g'), String(value));
    });
    
    // Replace variables
    Object.entries(context.variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    });
    
    return result;
  }

  private collectOutput(context: WorkflowContext): any {
    const output: any = {};
    
    // Collect variables marked as output
    context.stepResults.forEach((value, key) => {
      output[key] = value;
    });
    
    return output;
  }

  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.id || !workflow.name) {
      throw new Error('Workflow must have id and name');
    }
    
    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }
    
    // Validate step references
    const stepIds = new Set(workflow.steps.map(step => step.id));
    
    workflow.steps.forEach(step => {
      if (!step.id || !step.name || !step.type) {
        throw new Error('Step must have id, name, and type');
      }
      
      if (step.next) {
        const nextIds = Array.isArray(step.next) ? step.next : [step.next];
        nextIds.forEach(nextId => {
          if (!stepIds.has(nextId)) {
            throw new Error(`Step ${step.id} references non-existent next step: ${nextId}`);
          }
        });
      }
    });
  }

  // Execution management
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  listExecutions(userId?: string): WorkflowExecution[] {
    const executions = Array.from(this.executions.values());
    return userId ? executions.filter(exec => exec.userId === userId) : executions;
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.completedAt = new Date();
    }
  }

  private cleanupCompletedExecutions(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [id, execution] of this.executions) {
      if (execution.completedAt && execution.completedAt < cutoff) {
        this.executions.delete(id);
      }
    }
  }

  // Event handling
  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    const running = Array.from(this.executions.values())
      .filter(exec => exec.status === 'running').length;
    
    return {
      healthy: running < this.config.maxConcurrentWorkflows,
      details: {
        workflows: this.workflows.size,
        executions: this.executions.size,
        running,
        maxConcurrent: this.config.maxConcurrentWorkflows
      }
    };
  }

  // Utility methods
  private generateId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up Workflow Engine...');
    
    // Cancel all running executions
    for (const execution of this.executions.values()) {
      if (execution.status === 'running') {
        execution.status = 'cancelled';
        execution.completedAt = new Date();
      }
    }
    
    // Clear scheduled workflows
    for (const timeout of this.scheduledWorkflows.values()) {
      clearTimeout(timeout);
    }
    this.scheduledWorkflows.clear();
    
    // Clear data
    this.workflows.clear();
    this.executions.clear();
    this.eventHandlers.clear();
    
    console.log('Workflow Engine cleaned up');
  }
}
