import { Workflow, WorkflowExecution } from '../entities/Workflow';

export interface IWorkflowRepository {
  // Workflow CRUD
  create(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow>;
  findById(id: string): Promise<Workflow | null>;
  findByUserId(userId: string): Promise<Workflow[]>;
  update(id: string, workflow: Partial<Workflow>): Promise<Workflow | null>;
  delete(id: string): Promise<void>;
  
  // Workflow Execution
  createExecution(execution: Omit<WorkflowExecution, 'id'>): Promise<WorkflowExecution>;
  findExecutionById(id: string): Promise<WorkflowExecution | null>;
  updateExecution(id: string, execution: Partial<WorkflowExecution>): Promise<WorkflowExecution>;
  findExecutionsByWorkflowId(workflowId: string): Promise<WorkflowExecution[]>;
}
