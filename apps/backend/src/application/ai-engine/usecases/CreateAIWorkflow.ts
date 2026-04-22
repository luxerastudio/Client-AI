import { AIWorkflow, WorkflowType, ProcessingLayer } from '@/domain/ai-engine/entities/AIWorkflow';
import { IAIWorkflowRepository } from '@/domain/ai-engine/repositories/IAIWorkflowRepository';

export interface CreateAIWorkflowRequest {
  name: string;
  description?: string;
  type: WorkflowType;
  modelConfig: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  steps?: Array<{
    id: string;
    layer: ProcessingLayer;
    name: string;
    config?: Record<string, any>;
    order: number;
    dependencies?: string[];
  }>;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  metadata?: Record<string, any>;
  userId: string;
}

export interface CreateAIWorkflowResponse {
  workflow: AIWorkflow;
}

export class CreateAIWorkflow {
  constructor(private readonly workflowRepository: IAIWorkflowRepository) {}

  async execute(request: CreateAIWorkflowRequest): Promise<CreateAIWorkflowResponse> {
    // Create default steps if none provided
    const steps = request.steps || this.createDefaultSteps();

    // Ensure all required properties are present
    const workflowSteps = steps.map(step => ({
      id: step.id,
      layer: step.layer,
      name: step.name,
      config: step.config || {},
      order: step.order,
      dependencies: step.dependencies || []
    }));

    const workflow: Omit<AIWorkflow, 'id' | 'createdAt' | 'updatedAt'> = {
      name: request.name,
      description: request.description,
      type: request.type,
      status: 'pending' as any,
      steps: workflowSteps,
      modelConfig: request.modelConfig as any,
      inputSchema: request.inputSchema || {},
      outputSchema: request.outputSchema,
      metadata: request.metadata,
      userId: request.userId
    };

    const createdWorkflow = await this.workflowRepository.create(workflow);
    
    return {
      workflow: createdWorkflow
    };
  }

  private createDefaultSteps() {
    return [
      {
        id: 'input_analysis',
        layer: ProcessingLayer.INPUT_ANALYSIS,
        name: 'Input Analysis',
        description: 'Analyze the user input to understand intent and requirements',
        config: {},
        order: 0,
        dependencies: []
      },
      {
        id: 'prompt_structuring',
        layer: ProcessingLayer.PROMPT_STRUCTURING,
        name: 'Prompt Structuring',
        description: 'Structure the prompt based on analysis results',
        config: {
          style: 'professional',
          outputFormat: 'structured'
        },
        order: 1,
        dependencies: ['input_analysis']
      },
      {
        id: 'ai_generation',
        layer: ProcessingLayer.AI_GENERATION,
        name: 'AI Generation',
        description: 'Generate content using AI model',
        config: {},
        order: 2,
        dependencies: ['prompt_structuring']
      },
      {
        id: 'output_refinement',
        layer: ProcessingLayer.OUTPUT_REFINEMENT,
        name: 'Output Refinement',
        description: 'Refine and optimize the generated output',
        config: {
          refinementRules: [
            {
              type: 'formatting' as const,
              config: { format: 'markdown' }
            },
            {
              type: 'content' as const,
              config: { action: 'improve', target: 'clarity' }
            }
          ]
        },
        order: 3,
        dependencies: ['ai_generation']
      }
    ];
  }
}
