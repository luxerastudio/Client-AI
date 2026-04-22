import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateAIWorkflow } from '@/application/ai-engine/usecases/CreateAIWorkflow';
import { ExecuteAIWorkflow } from '@/application/ai-engine/usecases/ExecuteAIWorkflow';
import { QuickGenerate } from '@/application/ai-engine/usecases/QuickGenerate';
import { IAIWorkflowEngine } from '@/domain/ai-engine/services/IInputAnalysisService';

export class AIEngineController {
  constructor(
    private readonly createAIWorkflowUseCase: CreateAIWorkflow,
    private readonly executeAIWorkflowUseCase: ExecuteAIWorkflow,
    private readonly quickGenerateUseCase: QuickGenerate,
    private readonly workflowEngine: IAIWorkflowEngine
  ) {}

  async createWorkflow(request: FastifyRequest, reply: FastifyReply) {
    try {
      const {
        name,
        description,
        type,
        modelConfig,
        steps,
        inputSchema,
        outputSchema,
        metadata,
        userId
      } = request.body as any;
      
      const result = await this.createAIWorkflowUseCase.execute({
        name,
        description,
        type,
        modelConfig,
        steps,
        inputSchema,
        outputSchema,
        metadata,
        userId
      });

      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async executeWorkflow(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { workflowId } = request.params as any;
      const { input, maxRetries } = request.body as any;
      
      const result = await this.executeAIWorkflowUseCase.execute({
        workflowId,
        input,
        maxRetries
      });

      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async quickGenerate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { input, config } = request.body as any;
      
      const result = await this.quickGenerateUseCase.execute({
        input,
        config
      });

      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getExecutionStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { executionId } = request.params as any;
      
      const status = await this.workflowEngine.getExecutionStatus(executionId);
      
      return reply.send(status);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async cancelExecution(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { executionId } = request.params as any;
      
      await this.workflowEngine.cancelExecution(executionId);
      
      return reply.send({ message: 'Execution cancelled successfully' });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async validateWorkflow(request: FastifyRequest, reply: FastifyReply) {
    try {
      const workflow = request.body as any;
      
      const validation = await this.workflowEngine.validateWorkflow(workflow);
      
      return reply.send(validation);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
