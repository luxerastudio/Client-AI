import { AIWorkflow, WorkflowExecution } from '../entities/AIWorkflow';

export interface IAIWorkflowRepository {
  // Workflow CRUD
  create(workflow: Omit<AIWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIWorkflow>;
  findById(id: string): Promise<AIWorkflow | null>;
  findByUserId(userId: string): Promise<AIWorkflow[]>;
  findByType(type: string): Promise<AIWorkflow[]>;
  update(id: string, workflow: Partial<AIWorkflow>): Promise<AIWorkflow>;
  delete(id: string): Promise<void>;
  
  // Execution Management
  createExecution(execution: Omit<WorkflowExecution, 'id'>): Promise<WorkflowExecution>;
  findExecutionById(id: string): Promise<WorkflowExecution | null>;
  updateExecution(id: string, execution: Partial<WorkflowExecution>): Promise<WorkflowExecution>;
  findExecutionsByWorkflowId(workflowId: string): Promise<WorkflowExecution[]>;
  findExecutionsByUserId(userId: string): Promise<WorkflowExecution[]>;
  
  // Analytics
  getExecutionStats(workflowId: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageProcessingTime: number;
    totalCost: number;
  }>;
}
