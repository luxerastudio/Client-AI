import { WorkflowTemplate, WorkflowExecution, WorkflowStep, WorkflowContext, StepResult } from '../entities/Workflow';

export interface IWorkflowEngine {
  // Template Management
  registerTemplate(template: WorkflowTemplate): Promise<void>;
  getTemplate(id: string): Promise<WorkflowTemplate | null>;
  getTemplatesByCategory(category: string): Promise<WorkflowTemplate[]>;
  getAllTemplates(): Promise<WorkflowTemplate[]>;
  updateTemplate(id: string, template: Partial<WorkflowTemplate>): Promise<WorkflowTemplate>;
  deleteTemplate(id: string): Promise<void>;
  
  // Execution Management
  executeWorkflow(templateId: string, input: Record<string, any>, config?: Record<string, any>): Promise<WorkflowExecution>;
  getExecution(executionId: string): Promise<WorkflowExecution | null>;
  getExecutionsByTemplate(templateId: string): Promise<WorkflowExecution[]>;
  cancelExecution(executionId: string): Promise<void>;
  retryExecution(executionId: string): Promise<WorkflowExecution>;
  
  // Step Processing
  registerStepProcessor(processor: IStepProcessor): void;
  processStep(step: WorkflowStep, context: WorkflowContext): Promise<StepResult>;
  validateWorkflow(template: WorkflowTemplate): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
}

export interface IStepProcessor {
  canProcess(stepType: string): boolean;
  process(step: WorkflowStep, context: WorkflowContext): Promise<StepResult>;
  validate(step: WorkflowStep, context: WorkflowContext): Promise<boolean>;
}

export interface IWorkflowRepository {
  // Template CRUD
  createTemplate(template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowTemplate>;
  getTemplate(id: string): Promise<WorkflowTemplate | null>;
  getTemplatesByCategory(category: string): Promise<WorkflowTemplate[]>;
  getAllTemplates(): Promise<WorkflowTemplate[]>;
  updateTemplate(id: string, template: Partial<WorkflowTemplate>): Promise<WorkflowTemplate>;
  deleteTemplate(id: string): Promise<void>;
  
  // Execution CRUD
  createExecution(execution: Omit<WorkflowExecution, 'id' | 'createdAt'>): Promise<WorkflowExecution>;
  getExecution(id: string): Promise<WorkflowExecution | null>;
  getExecutionsByTemplate(templateId: string): Promise<WorkflowExecution[]>;
  updateExecution(id: string, execution: Partial<WorkflowExecution>): Promise<WorkflowExecution>;
  deleteExecution(id: string): Promise<void>;
  
  // Analytics
  getExecutionStats(templateId?: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    errorRate: number;
  }>;
}

export interface IWorkflowRegistry {
  // Template Registry
  registerTemplate(template: WorkflowTemplate): Promise<void>;
  unregisterTemplate(id: string): Promise<void>;
  getTemplate(id: string): Promise<WorkflowTemplate | null>;
  findTemplates(criteria: {
    category?: string;
    tags?: string[];
    name?: string;
  }): Promise<WorkflowTemplate[]>;
  
  // Step Processor Registry
  registerStepProcessor(type: string, processor: IStepProcessor): void;
  getStepProcessor(type: string): IStepProcessor | null;
  getSupportedStepTypes(): string[];
}

export interface IWorkflowOrchestrator {
  // Orchestration
  executeWorkflow(template: WorkflowTemplate, input: Record<string, any>, config?: Record<string, any>): Promise<WorkflowExecution>;
  resumeExecution(executionId: string): Promise<WorkflowExecution>;
  pauseExecution(executionId: string): Promise<void>;
  stopExecution(executionId: string): Promise<void>;
  
  // Step Execution
  executeStep(step: WorkflowStep, context: WorkflowContext): Promise<StepResult>;
  retryStep(step: WorkflowStep, context: WorkflowContext): Promise<StepResult>;
  skipStep(step: WorkflowStep, context: WorkflowContext): Promise<void>;
  
  // Dependency Management
  validateDependencies(steps: WorkflowStep[]): Promise<{
    isValid: boolean;
    circularDependencies: string[];
    missingDependencies: string[];
  }>;
  getExecutableSteps(steps: WorkflowStep[], completedSteps: string[]): string[];
}

export interface IWorkflowValidator {
  // Template Validation
  validateTemplate(template: WorkflowTemplate): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  // Step Validation
  validateStep(step: WorkflowStep, context: WorkflowContext): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  // Input/Output Validation
  validateInput(input: Record<string, any>, schema: Record<string, any>): Promise<{
    isValid: boolean;
    errors: string[];
  }>;
  validateOutput(output: Record<string, any>, schema: Record<string, any>): Promise<{
    isValid: boolean;
    errors: string[];
  }>;
}

export interface IWorkflowMetrics {
  // Execution Metrics
  recordExecutionStart(executionId: string): void;
  recordExecutionEnd(executionId: string, success: boolean): void;
  recordStepStart(executionId: string, stepId: string): void;
  recordStepEnd(executionId: string, stepId: string, success: boolean): void;
  
  // Performance Metrics
  getExecutionMetrics(executionId: string): Promise<{
    duration: number;
    stepMetrics: Record<string, {
      duration: number;
      success: boolean;
      retryCount: number;
    }>;
  }>;
  
  // Template Metrics
  getTemplateMetrics(templateId: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    stepPerformance: Record<string, {
      averageDuration: number;
      successRate: number;
    }>;
  }>;
}
