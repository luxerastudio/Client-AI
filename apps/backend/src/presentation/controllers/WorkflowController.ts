import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateWorkflow } from '@/application/usecases/CreateWorkflow';
import { ExecuteWorkflow } from '@/application/usecases/ExecuteWorkflow';
import { GenerateContent } from '@/application/usecases/GenerateContent';
import { WorkflowType } from '@/domain/entities/Workflow';

export class WorkflowController {
  constructor(
    private readonly createWorkflowUseCase: CreateWorkflow,
    private readonly executeWorkflowUseCase: ExecuteWorkflow,
    private readonly generateContentUseCase: GenerateContent
  ) {}

  async createWorkflow(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { name, description, type, steps, config, userId } = request.body as any;
      
      const result = await this.createWorkflowUseCase.execute({
        name,
        description,
        type: type as WorkflowType,
        steps,
        config,
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
      const { input } = request.body as any;
      
      const result = await this.executeWorkflowUseCase.execute({
        workflowId,
        input
      });

      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateContent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { type, prompt, config, keywords } = request.body as any;
      
      const result = await this.generateContentUseCase.execute({
        type,
        prompt,
        config,
        keywords
      });

      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getWorkflowStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { executionId } = request.params as any;
      
      // This would be implemented to get execution status
      return reply.send({ executionId, status: 'completed' });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
