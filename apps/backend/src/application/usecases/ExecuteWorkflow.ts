import { Workflow, WorkflowExecution } from '@/domain/entities/Workflow';
import { IWorkflowRepository } from '@/domain/repositories/IWorkflowRepository';
import { IWorkflowEngine } from '@/domain/services/IWorkflowEngine';

export interface ExecuteWorkflowRequest {
  workflowId: string;
  input?: Record<string, any>;
}

export interface ExecuteWorkflowResponse {
  execution: WorkflowExecution;
}

export class ExecuteWorkflow {
  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowEngine: IWorkflowEngine
  ) {}

  async execute(request: ExecuteWorkflowRequest): Promise<ExecuteWorkflowResponse> {
    const workflow = await this.workflowRepository.findById(request.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const execution = await this.workflowEngine.execute(workflow, request.input);
    
    return {
      execution
    };
  }
}
