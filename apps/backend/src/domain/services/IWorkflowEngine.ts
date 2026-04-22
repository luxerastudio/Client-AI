import { Workflow, WorkflowExecution, WorkflowStep } from '../entities/Workflow';

export interface IWorkflowEngine {
  execute(workflow: Workflow, input?: Record<string, any>): Promise<WorkflowExecution>;
  validate(workflow: Workflow): Promise<boolean>;
  getExecutionStatus(executionId: string): Promise<WorkflowExecution | null>;
  cancelExecution(executionId: string): Promise<void>;
}

export interface IAIGenerator {
  generateContent(prompt: string, config?: Record<string, any>): Promise<string>;
  generateYouTubeScript(topic: string, config?: Record<string, any>): Promise<string>;
  generateSEOContent(content: string, keywords: string[], config?: Record<string, any>): Promise<string>;
}

export interface IStepProcessor {
  process(step: WorkflowStep, context: Record<string, any>): Promise<any>;
  canProcess(stepType: string): boolean;
}
