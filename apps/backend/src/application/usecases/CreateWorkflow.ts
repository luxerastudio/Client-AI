import { Workflow, WorkflowType, WorkflowStatus } from '@/domain/entities/Workflow';
import { IWorkflowRepository } from '@/domain/repositories/IWorkflowRepository';

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  type: WorkflowType;
  steps: any[];
  config?: Record<string, any>;
  userId: string;
}

export interface CreateWorkflowResponse {
  workflow: Workflow;
}

export class CreateWorkflow {
  constructor(private readonly workflowRepository: IWorkflowRepository) {}

  async execute(request: CreateWorkflowRequest): Promise<CreateWorkflowResponse> {
    const workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'> = {
      name: request.name,
      description: request.description,
      type: request.type,
      status: WorkflowStatus.DRAFT,
      steps: request.steps,
      config: request.config,
      userId: request.userId
    };

    const createdWorkflow = await this.workflowRepository.create(workflow);
    
    return {
      workflow: createdWorkflow
    };
  }
}
