import { Workflow, WorkflowExecution, WorkflowStep, WorkflowStatus } from '@/domain/entities/Workflow';
import { IWorkflowEngine, IStepProcessor } from '@/domain/services/IWorkflowEngine';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowEngine implements IWorkflowEngine {
  private processors: Map<string, IStepProcessor> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  registerProcessor(processor: IStepProcessor): void {
    this.processors.set(processor.constructor.name, processor);
  }

  async execute(workflow: Workflow, input?: Record<string, any>): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId: workflow.id || 'unknown',
      status: WorkflowStatus.ACTIVE,
      startedAt: new Date(),
      results: {}
    };

    this.executions.set(execution.id, execution);

    try {
      const context: Record<string, any> = { ...input };
      
      // Execute steps in order
      for (const step of workflow.steps.sort((a, b) => a.order - b.order)) {
        const processor = this.findProcessor(step.type);
        if (!processor) {
          throw new Error(`No processor found for step type: ${step.type}`);
        }

        const stepResult = await processor.process(step, context);
        context[step.id] = stepResult;
        execution.results[step.id] = stepResult;
      }

      execution.status = WorkflowStatus.COMPLETED;
      execution.completedAt = new Date();
    } catch (error) {
      execution.status = WorkflowStatus.FAILED;
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date();
    }

    return execution;
  }

  async validate(workflow: Workflow): Promise<boolean> {
    // Check if all steps have valid processors
    for (const step of workflow.steps) {
      const processor = this.findProcessor(step.type);
      if (!processor) {
        return false;
      }
    }

    // Check step order integrity
    const orders = workflow.steps.map(s => s.order).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i) {
        return false;
      }
    }

    return true;
  }

  async getExecutionStatus(executionId: string): Promise<WorkflowExecution | null> {
    return this.executions.get(executionId) || null;
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === WorkflowStatus.ACTIVE) {
      execution.status = WorkflowStatus.FAILED;
      execution.error = 'Execution cancelled';
      execution.completedAt = new Date();
    }
  }

  private findProcessor(stepType: string): IStepProcessor | undefined {
    for (const processor of this.processors.values()) {
      if (processor.canProcess(stepType)) {
        return processor;
      }
    }
    return undefined;
  }
}
