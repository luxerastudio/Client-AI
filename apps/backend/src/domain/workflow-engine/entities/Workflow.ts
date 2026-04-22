import { z } from 'zod';

export enum WorkflowStepType {
  ANALYZE_INPUT = 'analyze_input',
  BREAKDOWN_STRUCTURE = 'breakdown_structure',
  GENERATE_OUTPUT = 'generate_output',
  REFINE_OUTPUT = 'refine_output'
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export const WorkflowStepConfigSchema = z.object({
  type: z.nativeEnum(WorkflowStepType),
  name: z.string(),
  description: z.string().optional(),
  config: z.record(z.any()).optional(),
  timeout: z.number().optional(),
  retryConfig: z.object({
    maxRetries: z.number().default(3),
    retryDelay: z.number().default(1000),
    backoffMultiplier: z.number().default(2)
  }).optional(),
  dependencies: z.array(z.string()).default([])
});

export const WorkflowStepSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(WorkflowStepType),
  name: z.string(),
  description: z.string().optional(),
  config: z.record(z.any()).optional(),
  order: z.number(),
  dependencies: z.array(z.string()).default([]),
  timeout: z.number().default(30000),
  retryConfig: z.object({
    maxRetries: z.number().default(3),
    retryDelay: z.number().default(1000),
    backoffMultiplier: z.number().default(2)
  }).optional(),
  status: z.nativeEnum(StepStatus).default(StepStatus.PENDING),
  result: z.any().optional(),
  error: z.string().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional()
});

export const WorkflowTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  steps: z.array(WorkflowStepSchema),
  inputSchema: z.record(z.any()).optional(),
  outputSchema: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
  version: z.string().default('1.0.0'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const WorkflowExecutionSchema = z.object({
  id: z.string().optional(),
  templateId: z.string(),
  templateName: z.string(),
  status: z.nativeEnum(WorkflowStatus).default(WorkflowStatus.DRAFT),
  input: z.record(z.any()),
  output: z.record(z.any()).optional(),
  steps: z.array(WorkflowStepSchema),
  currentStep: z.number().default(0),
  progress: z.number().default(0),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  duration: z.number().optional()
});

export type WorkflowStepConfig = z.infer<typeof WorkflowStepConfigSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;

export interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
  metrics?: {
    duration: number;
    tokensUsed?: number;
    cost?: number;
  };
}

export interface WorkflowContext {
  input: Record<string, any>;
  stepResults: Record<string, StepResult>;
  metadata: Record<string, any>;
  config: Record<string, any>;
}

export interface IStepProcessor {
  canProcess(stepType: WorkflowStepType): boolean;
  process(step: WorkflowStep, context: WorkflowContext): Promise<StepResult>;
  validate(step: WorkflowStep, context: WorkflowContext): Promise<boolean>;
}

export interface IWorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  steps: WorkflowStep[];
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  metadata?: Record<string, any>;
  isActive: boolean;
  version: string;
}

export interface IWorkflowExecution {
  id: string;
  templateId: string;
  templateName: string;
  status: WorkflowStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  steps: WorkflowStep[];
  currentStep: number;
  progress: number;
  error?: string;
  metadata?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
}
