import { AIWorkflow, WorkflowExecution, WorkflowStatus } from '@/domain/ai-engine/entities/AIWorkflow';
import { IAIWorkflowRepository } from '@/domain/ai-engine/repositories/IAIWorkflowRepository';
// import { PrismaClient } from '@prisma/client';

export class PrismaAIWorkflowRepository implements IAIWorkflowRepository {
  constructor(private readonly prisma: any) {}

  async create(workflow: Omit<AIWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIWorkflow> {
    const created = await this.prisma.aIWorkflow.create({
      data: {
        name: workflow.name,
        description: workflow.description,
        type: workflow.type,
        status: workflow.status,
        steps: workflow.steps,
        modelConfig: workflow.modelConfig,
        inputSchema: workflow.inputSchema || {},
        outputSchema: workflow.outputSchema || {},
        metadata: workflow.metadata || {},
        userId: workflow.userId
      }
    });

    return this.mapToDomain(created);
  }

  async findById(id: string): Promise<AIWorkflow | null> {
    const workflow = await this.prisma.aIWorkflow.findUnique({
      where: { id }
    });

    return workflow ? this.mapToDomain(workflow) : null;
  }

  async findByUserId(userId: string): Promise<AIWorkflow[]> {
    const workflows = await this.prisma.aIWorkflow.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return workflows.map(this.mapToDomain);
  }

  async findByType(type: string): Promise<AIWorkflow[]> {
    const workflows = await this.prisma.aIWorkflow.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' }
    });

    return workflows.map(this.mapToDomain);
  }

  async update(id: string, workflow: Partial<AIWorkflow>): Promise<AIWorkflow> {
    const updated = await this.prisma.aIWorkflow.update({
      where: { id },
      data: {
        ...(workflow.name && { name: workflow.name }),
        ...(workflow.description !== undefined && { description: workflow.description }),
        ...(workflow.type && { type: workflow.type }),
        ...(workflow.status && { status: workflow.status }),
        ...(workflow.steps && { steps: workflow.steps }),
        ...(workflow.modelConfig && { modelConfig: workflow.modelConfig }),
        ...(workflow.inputSchema && { inputSchema: workflow.inputSchema }),
        ...(workflow.outputSchema && { outputSchema: workflow.outputSchema }),
        ...(workflow.metadata && { metadata: workflow.metadata }),
        updatedAt: new Date()
      }
    });

    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.aIWorkflow.delete({
      where: { id }
    });
  }

  async createExecution(execution: Omit<WorkflowExecution, 'id'>): Promise<WorkflowExecution> {
    const created = await this.prisma.workflowExecution.create({
      data: {
        workflowId: execution.workflowId,
        status: execution.status,
        input: execution.input,
        output: execution.output || {},
        stepResults: execution.stepResults || {},
        error: execution.error,
        metrics: execution.metrics || {
          totalTokens: 0,
          processingTime: 0,
          cost: 0
        },
        startedAt: execution.startedAt,
        completedAt: execution.completedAt
      }
    });

    return this.mapExecutionToDomain(created);
  }

  async findExecutionById(id: string): Promise<WorkflowExecution | null> {
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id }
    });

    return execution ? this.mapExecutionToDomain(execution) : null;
  }

  async updateExecution(id: string, execution: Partial<WorkflowExecution>): Promise<WorkflowExecution> {
    const updated = await this.prisma.workflowExecution.update({
      where: { id },
      data: {
        ...(execution.status && { status: execution.status }),
        ...(execution.output && { output: execution.output }),
        ...(execution.stepResults && { stepResults: execution.stepResults }),
        ...(execution.error && { error: execution.error }),
        ...(execution.metrics && { metrics: execution.metrics }),
        ...(execution.completedAt && { completedAt: execution.completedAt })
      }
    });

    return this.mapExecutionToDomain(updated);
  }

  async findExecutionsByWorkflowId(workflowId: string): Promise<WorkflowExecution[]> {
    const executions = await this.prisma.workflowExecution.findMany({
      where: { workflowId },
      orderBy: { startedAt: 'desc' }
    });

    return executions.map(this.mapExecutionToDomain);
  }

  async findExecutionsByUserId(userId: string): Promise<WorkflowExecution[]> {
    const userWorkflows = await this.prisma.aIWorkflow.findMany({
      where: { userId },
      select: { id: true }
    });
    
    const workflowIds = userWorkflows.map((w: any) => w.id);
    
    const executions = await this.prisma.workflowExecution.findMany({
      where: {
        workflowId: {
          in: workflowIds
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    return executions.map(this.mapExecutionToDomain);
  }

  async getExecutionStats(workflowId: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageProcessingTime: number;
    totalCost: number;
  }> {
    const executions = await this.prisma.workflowExecution.findMany({
      where: { workflowId }
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter((e: any) => e.status === 'completed').length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    
    const completedExecutions = executions.filter((e: any) => e.metrics && e.status === 'completed');
    const averageProcessingTime = completedExecutions.length > 0 
      ? completedExecutions.reduce((sum: number, e: any) => sum + (e.metrics?.processingTime || 0), 0) / completedExecutions.length
      : 0;
    
    const totalCost = executions.reduce((sum: number, e: any) => sum + (e.metrics?.cost || 0), 0);

    return {
      totalExecutions,
      successRate,
      averageProcessingTime,
      totalCost
    };
  }

  private mapToDomain(prismaWorkflow: any): AIWorkflow {
    return {
      id: prismaWorkflow.id,
      name: prismaWorkflow.name,
      description: prismaWorkflow.description,
      type: prismaWorkflow.type,
      status: prismaWorkflow.status as WorkflowStatus,
      steps: prismaWorkflow.steps,
      modelConfig: prismaWorkflow.modelConfig,
      inputSchema: prismaWorkflow.inputSchema,
      outputSchema: prismaWorkflow.outputSchema,
      metadata: prismaWorkflow.metadata,
      userId: prismaWorkflow.userId,
      createdAt: prismaWorkflow.createdAt,
      updatedAt: prismaWorkflow.updatedAt
    };
  }

  private mapExecutionToDomain(prismaExecution: any): WorkflowExecution {
    return {
      id: prismaExecution.id,
      workflowId: prismaExecution.workflowId,
      status: prismaExecution.status as WorkflowStatus,
      input: prismaExecution.input,
      output: prismaExecution.output,
      stepResults: prismaExecution.stepResults,
      error: prismaExecution.error,
      metrics: prismaExecution.metrics,
      startedAt: prismaExecution.startedAt,
      completedAt: prismaExecution.completedAt
    };
  }
}
