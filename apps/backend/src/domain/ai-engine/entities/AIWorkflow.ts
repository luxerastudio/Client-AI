import { z } from 'zod';

export enum WorkflowType {
  CONTENT_GENERATION = 'content_generation',
  ANALYSIS = 'analysis',
  TRANSFORMATION = 'transformation',
  OPTIMIZATION = 'optimization'
}

export enum ProcessingLayer {
  INPUT_ANALYSIS = 'input_analysis',
  PROMPT_STRUCTURING = 'prompt_structuring',
  AI_GENERATION = 'ai_generation',
  OUTPUT_REFINEMENT = 'output_refinement'
}

export enum WorkflowStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export const AIModelConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google']),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(4000).default(1000),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional()
});

export const ProcessingStepSchema = z.object({
  id: z.string(),
  layer: z.nativeEnum(ProcessingLayer),
  name: z.string(),
  description: z.string().optional(),
  config: z.record(z.any()),
  order: z.number(),
  dependencies: z.array(z.string()).default([]),
  retryConfig: z.object({
    maxRetries: z.number().default(3),
    retryDelay: z.number().default(1000)
  }).optional()
});

export const AIWorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  type: z.nativeEnum(WorkflowType),
  status: z.nativeEnum(WorkflowStatus).default(WorkflowStatus.PENDING),
  steps: z.array(ProcessingStepSchema),
  modelConfig: AIModelConfigSchema,
  inputSchema: z.record(z.any()),
  outputSchema: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  userId: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const WorkflowExecutionSchema = z.object({
  id: z.string().optional(),
  workflowId: z.string(),
  status: z.nativeEnum(WorkflowStatus).default(WorkflowStatus.PENDING),
  input: z.record(z.any()),
  output: z.record(z.any()).optional(),
  stepResults: z.record(z.any()).optional(),
  error: z.string().optional(),
  metrics: z.object({
    totalTokens: z.number().default(0),
    processingTime: z.number().default(0),
    cost: z.number().default(0)
  }).optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional()
});

export type AIModelConfig = z.infer<typeof AIModelConfigSchema>;
export type ProcessingStep = z.infer<typeof ProcessingStepSchema>;
export type AIWorkflow = z.infer<typeof AIWorkflowSchema>;
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;

export interface AnalysisResult {
  intent: string;
  entities: Array<{ text: string; type: string; confidence: number }>;
  sentiment: 'positive' | 'negative' | 'neutral';
  complexity: 'low' | 'medium' | 'high';
  suggestedApproach: string;
  metadata: Record<string, any>;
}

export interface PromptTemplate {
  systemPrompt: string;
  userPromptTemplate: string;
  variables: Array<{ name: string; type: string; required: boolean }>;
  outputFormat?: string;
  examples?: Array<{ input: Record<string, any>; output: string }>;
}

export interface GenerationRequest {
  prompt: string;
  config: AIModelConfig;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface GenerationResult {
  content: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  processingTime: number;
  cost: number;
  metadata: Record<string, any>;
}

export interface RefinementRule {
  id: string;
  name: string;
  type: 'formatting' | 'content' | 'style' | 'validation';
  config: Record<string, any>;
  priority: number;
}

export interface RefinementResult {
  originalContent: string;
  refinedContent: string;
  appliedRules: string[];
  qualityScore: number;
  suggestions: string[];
  metadata: Record<string, any>;
}
