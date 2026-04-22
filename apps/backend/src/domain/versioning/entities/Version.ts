import { z } from 'zod';

export enum VersionStatus {
  DRAFT = 'draft',
  GENERATED = 'generated',
  EVALUATED = 'evaluated',
  SELECTED = 'selected',
  REJECTED = 'rejected',
  ARCHIVED = 'archived'
}

export enum VersionGenerationStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  IMPROVEMENT = 'improvement',
  VARIATION = 'variation'
}

export const ContentVersionSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  versionNumber: z.number().min(1),
  content: z.string(),
  status: z.nativeEnum(VersionStatus),
  generationStrategy: z.nativeEnum(VersionGenerationStrategy),
  qualityScore: z.number().min(0).max(10).optional(),
  qualityBreakdown: z.object({
    clarity: z.number().min(0).max(10),
    relevance: z.number().min(0).max(10),
    depth: z.number().min(0).max(10),
    usefulness: z.number().min(0).max(10)
  }).optional(),
  metadata: z.object({
    generatedAt: z.date(),
    evaluatedAt: z.date().optional(),
    selectedAt: z.date().optional(),
    processingTime: z.number(),
    tokensUsed: z.number(),
    cost: z.number(),
    improvementCount: z.number().default(0),
    parentVersionId: z.string().optional(),
    generationPrompt: z.string().optional(),
    feedback: z.string().optional(),
    tags: z.array(z.string()).default([])
  }),
  comparison: z.object({
    rank: z.number().optional(),
    score: z.number().optional(),
    advantages: z.array(z.string()).default([]),
    disadvantages: z.array(z.string()).default([])
  }).optional()
});

export const VersionRequestSchema = z.object({
  id: z.string(),
  originalInput: z.record(z.any()),
  context: z.record(z.any()).optional(),
  config: z.object({
    maxVersions: z.number().min(1).max(10).default(3),
    strategy: z.nativeEnum(VersionGenerationStrategy),
    selectionCriteria: z.string().default('quality'),
    improvementThreshold: z.number().min(0).max(10).default(7),
    enableComparison: z.boolean().default(true),
    autoSelect: z.boolean().default(false),
    retainAllVersions: z.boolean().default(true)
  }),
  status: z.nativeEnum(VersionStatus),
  versions: z.array(ContentVersionSchema),
  selectedVersionId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
  metadata: z.object({
    totalProcessingTime: z.number(),
    totalCost: z.number(),
    totalTokensUsed: z.number(),
    averageQualityScore: z.number().optional(),
    bestQualityScore: z.number().optional(),
    improvementCount: z.number().default(0),
    generationAttempts: z.number().default(0)
  })
});

export const VersionComparisonSchema = z.object({
  requestId: z.string(),
  versionIds: z.array(z.string()),
  comparisonCriteria: z.array(z.string()),
  results: z.array(z.object({
    versionId: z.string(),
    rank: z.number(),
    score: z.number(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    recommendations: z.array(z.string())
  })),
  bestVersionId: z.string(),
  comparisonSummary: z.string(),
  comparedAt: z.date()
});

export type ContentVersion = z.infer<typeof ContentVersionSchema>;
export type VersionRequest = z.infer<typeof VersionRequestSchema>;
export type VersionComparison = z.infer<typeof VersionComparisonSchema>;

export interface IVersionGenerator {
  generateVersions(request: VersionRequest): Promise<ContentVersion[]>;
  generateImprovedVersion(
    originalVersion: ContentVersion,
    feedback: string,
    context?: Record<string, any>
  ): Promise<ContentVersion>;
  generateVariations(
    baseVersion: ContentVersion,
    variationCount: number,
    context?: Record<string, any>
  ): Promise<ContentVersion[]>;
}

export interface IVersionSelector {
  selectBestVersion(
    versions: ContentVersion[],
    criteria: string
  ): Promise<{
    bestVersion: ContentVersion;
    comparison: VersionComparison;
  }>;
  compareVersions(
    versions: ContentVersion[],
    criteria: string[]
  ): Promise<VersionComparison>;
  rankVersions(
    versions: ContentVersion[],
    criteria: string
  ): Promise<ContentVersion[]>;
}

export interface IVersionRepository {
  saveRequest(request: VersionRequest): Promise<void>;
  getRequest(requestId: string): Promise<VersionRequest | null>;
  updateRequest(requestId: string, updates: Partial<VersionRequest>): Promise<void>;
  deleteRequest(requestId: string): Promise<void>;
  
  saveVersion(version: ContentVersion): Promise<void>;
  getVersion(versionId: string): Promise<ContentVersion | null>;
  updateVersion(versionId: string, updates: Partial<ContentVersion>): Promise<void>;
  deleteVersion(versionId: string): Promise<void>;
  
  getVersionsByRequest(requestId: string): Promise<ContentVersion[]>;
  getVersionsByStatus(status: VersionStatus): Promise<ContentVersion[]>;
  
  searchVersions(criteria: {
    requestId?: string;
    status?: VersionStatus;
    minQualityScore?: number;
    tags?: string[];
  }): Promise<ContentVersion[]>;
}

export interface IVersionManager {
  createVersionRequest(
    input: Record<string, any>,
    config?: Partial<VersionRequest['config']>
  ): Promise<VersionRequest>;
  
  generateVersions(requestId: string): Promise<ContentVersion[]>;
  evaluateVersions(requestId: string): Promise<void>;
  selectBestVersion(requestId: string, criteria?: string): Promise<ContentVersion>;
  
  improveVersion(
    versionId: string,
    feedback: string,
    context?: Record<string, any>
  ): Promise<ContentVersion>;
  
  generateVariations(
    versionId: string,
    count: number,
    context?: Record<string, any>
  ): Promise<ContentVersion[]>;
  
  getVersionRequest(requestId: string): Promise<VersionRequest | null>;
  getAllVersions(requestId: string): Promise<ContentVersion[]>;
  getSelectedVersion(requestId: string): Promise<ContentVersion | null>;
  
  compareVersions(
    requestId: string,
    versionIds: string[],
    criteria: string[]
  ): Promise<VersionComparison>;
}

export interface VersionGenerationConfig {
  maxVersions: number;
  strategy: VersionGenerationStrategy;
  selectionCriteria: string;
  improvementThreshold: number;
  enableComparison: boolean;
  autoSelect: boolean;
  retainAllVersions: boolean;
}

export interface VersionMetrics {
  processingTime: number;
  tokensUsed: number;
  cost: number;
  qualityScore?: number;
  improvementCount: number;
  generationAttempts: number;
}

export interface VersionFeedback {
  versionId: string;
  type: 'quality' | 'content' | 'style' | 'structure';
  rating: number;
  comments: string;
  suggestions: string[];
  timestamp: Date;
}

export interface VersionTemplate {
  id: string;
  name: string;
  description: string;
  config: VersionGenerationConfig;
  promptTemplate: string;
  variationStrategies: string[];
  qualityThresholds: {
    minimum: number;
    excellent: number;
  };
}

export interface VersionGenerationRequest {
  requestId: string;
  input: Record<string, any>;
  context?: Record<string, any>;
  config: VersionGenerationConfig;
  template?: VersionTemplate;
  existingVersions?: ContentVersion[];
  feedback?: VersionFeedback[];
}

export interface VersionGenerationResult {
  versions: ContentVersion[];
  selectedVersion?: ContentVersion;
  comparison?: VersionComparison;
  metrics: VersionMetrics;
  completed: boolean;
  errors?: string[];
}
