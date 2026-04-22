import { z } from 'zod';

export enum WorkflowType {
  CONTENT_GENERATION = 'content_generation',
  YOUTUBE_SCRIPT = 'youtube_script',
  SEO_WRITING = 'seo_writing',
  AUTOMATION_PIPELINE = 'automation_pipeline'
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['ai_generation', 'data_processing', 'validation', 'output']),
  config: z.record(z.any()),
  order: z.number()
});

export const WorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  type: z.nativeEnum(WorkflowType),
  status: z.nativeEnum(WorkflowStatus).default(WorkflowStatus.DRAFT),
  steps: z.array(WorkflowStepSchema),
  config: z.record(z.any()).optional(),
  userId: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  startedAt: Date;
  completedAt?: Date;
  results: Record<string, any>;
  error?: string;
}
