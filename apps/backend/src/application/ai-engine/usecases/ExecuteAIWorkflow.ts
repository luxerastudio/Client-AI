import { IAIWorkflowRepository } from '@/domain/ai-engine/repositories/IAIWorkflowRepository';
import { IAIWorkflowEngine } from '@/domain/ai-engine/services/IInputAnalysisService';

export interface ExecuteAIWorkflowRequest {
  workflowId: string;
  input: Record<string, any>;
  maxRetries?: number;
}

export interface ExecuteAIWorkflowResponse {
  executionId: string;
  output: Record<string, any>;
  stepResults: Record<string, any>;
  metrics: {
    totalTokens: number;
    processingTime: number;
    cost: number;
  };
  attempts?: number;
}

export class ExecuteAIWorkflow {
  constructor(
    private readonly workflowRepository: IAIWorkflowRepository,
    private readonly workflowEngine: IAIWorkflowEngine
  ) {}

  async execute(request: ExecuteAIWorkflowRequest): Promise<ExecuteAIWorkflowResponse> {
    const workflow = await this.workflowRepository.findById(request.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Validate workflow before execution
    const validation = await this.workflowEngine.validateWorkflow(workflow);
    if (!validation.isValid) {
      throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
    }

    // Execute with retry if specified
    if (request.maxRetries && request.maxRetries > 0) {
      const result = await (this.workflowEngine as any).executeWorkflowWithRetry(
        workflow,
        request.input,
        request.maxRetries
      );
      return result;
    }

    const result = await this.workflowEngine.executeWorkflow(workflow, request.input);
    
    return result;
  }
}
