// @ts-nocheck
import { DatabaseConnection } from '../database/DatabaseConnection';
import { IWorkflowRepository } from '../../domain/repositories/IWorkflowRepository';
import { Workflow, WorkflowExecution } from '../../domain/entities/Workflow';

export class WorkflowRepository implements IWorkflowRepository {
  constructor(private db: DatabaseConnection) {}

  async create(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const query = `
      INSERT INTO workflows (id, name, description, steps, status, user_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      id,
      workflow.name,
      workflow.description,
      JSON.stringify(workflow.steps),
      workflow.status,
      workflow.userId,
      now,
      now
    ]);
    
    return this.mapToWorkflow(result);
  }

  async findById(id: string): Promise<Workflow | null> {
    const query = 'SELECT * FROM workflows WHERE id = $1';
    const result = await this.db.queryOne(query, [id]);
    return result ? this.mapToWorkflow(result) : null;
  }

  async findByUserId(userId: string): Promise<Workflow[]> {
    const query = 'SELECT * FROM workflows WHERE user_id = $1 ORDER BY created_at DESC';
    const results = await this.db.query(query, [userId]);
    return results.map(this.mapToWorkflow);
  }

  async update(id: string, workflow: Partial<Workflow>): Promise<Workflow | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (workflow.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(workflow.name);
    }
    if (workflow.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(workflow.description);
    }
    if (workflow.steps !== undefined) {
      fields.push(`steps = $${paramIndex++}`);
      values.push(JSON.stringify(workflow.steps));
    }
    if (workflow.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(workflow.status);
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE workflows 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.queryOne(query, values);
    return result ? this.mapToWorkflow(result) : null;
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM workflows WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async list(limit: number = 50, offset: number = 0): Promise<Workflow[]> {
    const query = `
      SELECT * FROM workflows 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const results = await this.db.query(query, [limit, offset]);
    return results.map(this.mapToWorkflow);
  }

  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM workflows';
    const result = await this.db.queryOne(query);
    return parseInt(result.count);
  }

  // Workflow Execution methods
  async createExecution(execution: Omit<WorkflowExecution, 'id'>): Promise<WorkflowExecution> {
    const query = `
      INSERT INTO workflow_executions (id, workflow_id, status, results, error, started_at, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      crypto.randomUUID(),
      execution.workflowId,
      execution.status,
      JSON.stringify(execution.results),
      execution.error || null,
      execution.startedAt,
      execution.completedAt
    ]);

    return this.mapToExecution(result);
  }

  async findExecutionById(id: string): Promise<WorkflowExecution | null> {
    const query = 'SELECT * FROM workflow_executions WHERE id = $1';
    const result = await this.db.queryOne(query, [id]);
    return result ? this.mapToExecution(result) : null;
  }

  async updateExecution(id: string, execution: Partial<WorkflowExecution>): Promise<WorkflowExecution> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (execution.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(execution.status);
    }
    if (execution.results !== undefined) {
      fields.push(`results = $${paramIndex++}`);
      values.push(JSON.stringify(execution.results));
    }
    if (execution.error !== undefined) {
      fields.push(`error = $${paramIndex++}`);
      values.push(execution.error || null);
    }
    if (execution.completedAt !== undefined) {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(execution.completedAt);
    }

    values.push(id);

    const query = `
      UPDATE workflow_executions 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.queryOne(query, values);
    if (!result) {
      throw new Error(`Workflow execution with id ${id} not found`);
    }
    return this.mapToExecution(result);
  }

  async findExecutionsByWorkflowId(workflowId: string): Promise<WorkflowExecution[]> {
    const query = 'SELECT * FROM workflow_executions WHERE workflow_id = $1 ORDER BY started_at DESC';
    const results = await this.db.query(query, [workflowId]);
    return results.map(this.mapToExecution);
  }

  private mapToWorkflow(data: any): Workflow {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type,
      status: data.status,
      userId: data.user_id,
      steps: typeof data.steps === 'string' ? JSON.parse(data.steps) : data.steps,
      config: typeof data.config === 'string' ? JSON.parse(data.config) : data.config,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapToExecution(data: any): WorkflowExecution {
    return {
      id: data.id,
      workflowId: data.workflow_id,
      status: data.status,
      results: typeof data.results === 'string' ? JSON.parse(data.results) : data.results,
      error: data.error,
      startedAt: new Date(data.started_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : null
    };
  }
}
