import { DatabaseConnection } from '../database/DatabaseConnection';

export interface WorkflowExecution {
  id: string;
  templateId: string;
  templateName: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, any>;
  output?: Record<string, any>;
  steps: any[];
  currentStep: number;
  progress: number;
  error?: string;
  metadata?: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}

export interface CreateWorkflowExecutionData {
  templateId: string;
  templateName: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, any>;
  steps: any[];
  currentStep: number;
  progress: number;
  metadata?: Record<string, any>;
}

export interface UpdateWorkflowExecutionData {
  status?: 'running' | 'completed' | 'failed' | 'cancelled';
  output?: Record<string, any>;
  steps?: any[];
  currentStep?: number;
  progress?: number;
  error?: string;
  completedAt?: Date;
  duration?: number;
}

export class WorkflowExecutionRepository {
  constructor(private db: DatabaseConnection) {}

  async create(executionData: CreateWorkflowExecutionData): Promise<WorkflowExecution> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const query = `
      INSERT INTO workflow_executions (
        id, template_id, template_name, status, input, output, steps,
        current_step, progress, error, metadata, started_at, completed_at, duration
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      id,
      executionData.templateId,
      executionData.templateName,
      executionData.status,
      JSON.stringify(executionData.input),
      null, // output
      JSON.stringify(executionData.steps),
      executionData.currentStep,
      executionData.progress,
      null, // error
      JSON.stringify(executionData.metadata || {}),
      now,
      null, // completed_at
      null  // duration
    ]);
    
    return this.mapToWorkflowExecution(result);
  }

  async findById(id: string): Promise<WorkflowExecution | null> {
    const query = 'SELECT * FROM workflow_executions WHERE id = $1';
    const result = await this.db.queryOne(query, [id]);
    return result ? this.mapToWorkflowExecution(result) : null;
  }

  async findByTemplateId(templateId: string): Promise<WorkflowExecution[]> {
    const query = 'SELECT * FROM workflow_executions WHERE template_id = $1 ORDER BY started_at DESC';
    const results = await this.db.query(query, [templateId]);
    return results.map(this.mapToWorkflowExecution);
  }

  async update(id: string, executionData: UpdateWorkflowExecutionData): Promise<WorkflowExecution | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (executionData.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(executionData.status);
    }
    if (executionData.output !== undefined) {
      fields.push(`output = $${paramIndex++}`);
      values.push(JSON.stringify(executionData.output));
    }
    if (executionData.steps !== undefined) {
      fields.push(`steps = $${paramIndex++}`);
      values.push(JSON.stringify(executionData.steps));
    }
    if (executionData.currentStep !== undefined) {
      fields.push(`current_step = $${paramIndex++}`);
      values.push(executionData.currentStep);
    }
    if (executionData.progress !== undefined) {
      fields.push(`progress = $${paramIndex++}`);
      values.push(executionData.progress);
    }
    if (executionData.error !== undefined) {
      fields.push(`error = $${paramIndex++}`);
      values.push(executionData.error);
    }
    if (executionData.completedAt !== undefined) {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(executionData.completedAt);
    }
    if (executionData.duration !== undefined) {
      fields.push(`duration = $${paramIndex++}`);
      values.push(executionData.duration);
    }

    const query = `
      UPDATE workflow_executions 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    const result = await this.db.queryOne(query, values);
    return result ? this.mapToWorkflowExecution(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM workflow_executions WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.length > 0;
  }

  async list(limit: number = 50, offset: number = 0): Promise<WorkflowExecution[]> {
    const query = `
      SELECT * FROM workflow_executions 
      ORDER BY started_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const results = await this.db.query(query, [limit, offset]);
    return results.map(this.mapToWorkflowExecution);
  }

  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM workflow_executions';
    const result = await this.db.queryOne(query);
    return parseInt(result.count);
  }

  async findByStatus(status: string): Promise<WorkflowExecution[]> {
    const query = 'SELECT * FROM workflow_executions WHERE status = $1 ORDER BY started_at DESC';
    const results = await this.db.query(query, [status]);
    return results.map(this.mapToWorkflowExecution);
  }

  async updateProgress(id: string, currentStep: number, progress: number, steps: any[]): Promise<boolean> {
    const query = `
      UPDATE workflow_executions 
      SET current_step = $1, progress = $2, steps = $3
      WHERE id = $4
    `;
    
    const result = await this.db.query(query, [currentStep, progress, JSON.stringify(steps), id]);
    return result.length > 0;
  }

  async markCompleted(id: string, output: Record<string, any>, duration: number): Promise<boolean> {
    const query = `
      UPDATE workflow_executions 
      SET status = 'completed', output = $1, completed_at = $2, duration = $3
      WHERE id = $4
    `;
    
    const result = await this.db.query(query, [JSON.stringify(output), new Date(), duration, id]);
    return result.length > 0;
  }

  async markFailed(id: string, error: string, duration: number): Promise<boolean> {
    const query = `
      UPDATE workflow_executions 
      SET status = 'failed', error = $1, completed_at = $2, duration = $3
      WHERE id = $4
    `;
    
    const result = await this.db.query(query, [error, new Date(), duration, id]);
    return result.length > 0;
  }

  async markCancelled(id: string, duration: number): Promise<boolean> {
    const query = `
      UPDATE workflow_executions 
      SET status = 'cancelled', completed_at = $1, duration = $2
      WHERE id = $3
    `;
    
    const result = await this.db.query(query, [new Date(), duration, id]);
    return result.length > 0;
  }

  private mapToWorkflowExecution(data: any): WorkflowExecution {
    return {
      id: data.id,
      templateId: data.template_id,
      templateName: data.template_name,
      status: data.status,
      input: typeof data.input === 'string' ? JSON.parse(data.input) : data.input,
      output: data.output ? (typeof data.output === 'string' ? JSON.parse(data.output) : data.output) : undefined,
      steps: typeof data.steps === 'string' ? JSON.parse(data.steps) : data.steps,
      currentStep: data.current_step,
      progress: data.progress,
      error: data.error,
      metadata: data.metadata ? (typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata) : undefined,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      duration: data.duration
    };
  }
}
