import { Workflow, WorkflowExecution, WorkflowStatus } from '@/domain/entities/Workflow';
import { IWorkflowRepository } from '@/domain/repositories/IWorkflowRepository';
// import { PrismaClient } from '@prisma/client';

export class PrismaWorkflowRepository implements IWorkflowRepository {
  constructor(private readonly prisma: any) {}

  async create(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const created = await this.prisma.workflow.create({
      data: {
        name: workflow.name,
        type: workflow.type,
        status: workflow.status,
        steps: workflow.steps,
        // definition: workflow.definition || {},
        config: workflow.config || {},
        userId: workflow.userId
      }
    });

    return this.mapToDomain(created);
  }

  async findById(id: string): Promise<Workflow | null> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id }
    });

    return workflow ? this.mapToDomain(workflow) : null;
  }

  async findByUserId(userId: string): Promise<Workflow[]> {
    const workflows = await this.prisma.workflow.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return workflows.map(this.mapToDomain);
  }

  async update(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
    const updated = await this.prisma.workflow.update({
      where: { id },
      data: {
        ...(workflow.name && { name: workflow.name }),
        ...(workflow.description !== undefined && { description: workflow.description }),
        ...(workflow.type && { type: workflow.type }),
        ...(workflow.status && { status: workflow.status }),
        ...(workflow.steps && { steps: workflow.steps }),
        ...(workflow.config && { config: workflow.config }),
        updatedAt: new Date()
      }
    });

    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workflow.delete({
      where: { id }
    });
  }

  async createExecution(execution: Omit<WorkflowExecution, 'id'>): Promise<WorkflowExecution> {
    const created = await this.prisma.workflowExecution.create({
      data: {
        workflowId: execution.workflowId,
        status: execution.status,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        results: execution.results,
        error: execution.error
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
        ...(execution.completedAt && { completedAt: execution.completedAt }),
        ...(execution.results && { results: execution.results }),
        ...(execution.error && { error: execution.error })
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

  private mapToDomain(prismaWorkflow: any): Workflow {
    return {
      id: prismaWorkflow.id,
      name: prismaWorkflow.name,
      description: prismaWorkflow.description,
      type: prismaWorkflow.type,
      status: prismaWorkflow.status as WorkflowStatus,
      steps: prismaWorkflow.steps,
      config: prismaWorkflow.config,
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
      startedAt: prismaExecution.startedAt,
      completedAt: prismaExecution.completedAt,
      results: prismaExecution.results,
      error: prismaExecution.error
    };
  }
}
