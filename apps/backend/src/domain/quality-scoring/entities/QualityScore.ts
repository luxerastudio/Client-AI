import { z } from 'zod';

export enum QualityMetric {
  CLARITY = 'clarity',
  RELEVANCE = 'relevance',
  DEPTH = 'depth',
  USEFULNESS = 'usefulness'
}

export const QualityScoreSchema = z.object({
  overall: z.number().min(0).max(10),
  clarity: z.number().min(0).max(10),
  relevance: z.number().min(0).max(10),
  depth: z.number().min(0).max(10),
  usefulness: z.number().min(0).max(10),
  breakdown: z.object({
    clarity: z.object({
      score: z.number().min(0).max(10),
      factors: z.array(z.string()),
      suggestions: z.array(z.string())
    }),
    relevance: z.object({
      score: z.number().min(0).max(10),
      factors: z.array(z.string()),
      suggestions: z.array(z.string())
    }),
    depth: z.object({
      score: z.number().min(0).max(10),
      factors: z.array(z.string()),
      suggestions: z.array(z.string())
    }),
    usefulness: z.object({
      score: z.number().min(0).max(10),
      factors: z.array(z.string()),
      suggestions: z.array(z.string())
    })
  }),
  metadata: z.object({
    wordCount: z.number(),
    sentenceCount: z.number(),
    avgSentenceLength: z.number(),
    readabilityScore: z.number().optional(),
    processingTime: z.number(),
    regenerated: z.boolean().default(false),
    regenerationCount: z.number().default(0)
  }),
  suggestions: z.array(z.string()),
  passed: z.boolean(),
  needsRegeneration: z.boolean()
});

export const QualityEvaluationRequestSchema = z.object({
  content: z.string(),
  context: z.record(z.any()).optional(),
  criteria: z.object({
    targetAudience: z.string().optional(),
    purpose: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    expectedLength: z.string().optional(),
    tone: z.string().optional()
  }).optional(),
  thresholds: z.object({
    minimum: z.number().min(0).max(10).default(7),
    excellent: z.number().min(0).max(10).default(8.5)
  }).optional()
});

export type QualityScore = z.infer<typeof QualityScoreSchema>;
export type QualityEvaluationRequest = z.infer<typeof QualityEvaluationRequestSchema>;

export interface IQualityScorer {
  evaluate(request: QualityEvaluationRequest): Promise<QualityScore>;
  evaluateClarity(content: string, context?: Record<string, any>): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }>;
  evaluateRelevance(content: string, context: Record<string, any>): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }>;
  evaluateDepth(content: string, context?: Record<string, any>): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }>;
  evaluateUsefulness(content: string, context: Record<string, any>): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }>;
}

export interface IQualityRegenerator {
  shouldRegenerate(score: QualityScore): boolean;
  regenerate(content: string, feedback: QualityScore, context?: Record<string, any>): Promise<{
    regenerated: boolean;
    newContent?: string;
    newScore?: QualityScore;
    attempts: number;
  }>;
}

export interface IQualityMetrics {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  readabilityScore?: number;
  complexityScore?: number;
  engagementScore?: number;
}

export interface QualityFactor {
  name: string;
  weight: number;
  score: number;
  explanation: string;
}

export interface QualitySuggestion {
  type: 'improvement' | 'enhancement' | 'correction';
  metric: QualityMetric;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  impact: number;
}

export interface QualityThresholds {
  minimum: number;
  excellent: number;
  custom?: Record<QualityMetric, number>;
}

export interface QualityContext {
  targetAudience?: string;
  purpose?: string;
  keywords?: string[];
  expectedLength?: string;
  tone?: string;
  domain?: string;
  contentType?: string;
}

export interface QualityResult {
  success: boolean;
  score: QualityScore;
  output?: string;
  regenerated?: boolean;
  regenerationAttempts?: number;
  processingTime: number;
}
