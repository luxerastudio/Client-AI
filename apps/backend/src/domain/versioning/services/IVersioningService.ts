import { 
  ContentVersion, 
  VersionRequest, 
  VersionComparison, 
  VersionStatus, 
  VersionGenerationStrategy,
  VersionGenerationConfig,
  VersionFeedback,
  VersionTemplate
} from '../entities/Version';

export interface IVersioningService {
  // Version Request Management
  createVersionRequest(
    input: Record<string, any>,
    config?: Partial<VersionGenerationConfig>
  ): Promise<VersionRequest>;
  
  getVersionRequest(requestId: string): Promise<VersionRequest | null>;
  updateVersionRequest(requestId: string, updates: Partial<VersionRequest>): Promise<void>;
  deleteVersionRequest(requestId: string): Promise<void>;
  
  // Version Generation
  generateVersions(requestId: string): Promise<ContentVersion[]>;
  generateImprovedVersion(
    versionId: string,
    feedback: string,
    context?: Record<string, any>
  ): Promise<ContentVersion>;
  generateVariations(
    versionId: string,
    count: number,
    context?: Record<string, any>
  ): Promise<ContentVersion[]>;
  
  // Version Selection and Comparison
  selectBestVersion(requestId: string, criteria?: string): Promise<ContentVersion>;
  compareVersions(
    requestId: string,
    versionIds: string[],
    criteria: string[]
  ): Promise<VersionComparison>;
  rankVersions(requestId: string, criteria: string): Promise<ContentVersion[]>;
  
  // Version Retrieval
  getVersion(versionId: string): Promise<ContentVersion | null>;
  getAllVersions(requestId: string): Promise<ContentVersion[]>;
  getSelectedVersion(requestId: string): Promise<ContentVersion | null>;
  getVersionsByStatus(status: VersionStatus): Promise<ContentVersion[]>;
  
  // Version Management
  updateVersion(versionId: string, updates: Partial<ContentVersion>): Promise<void>;
  deleteVersion(versionId: string): Promise<void>;
  selectVersion(requestId: string, versionId: string): Promise<void>;
  rejectVersion(requestId: string, versionId: string): Promise<void>;
  
  // Feedback and Improvement
  addFeedback(versionId: string, feedback: VersionFeedback): Promise<void>;
  getVersionFeedback(versionId: string): Promise<VersionFeedback[]>;
  
  // Search and Filter
  searchVersions(criteria: {
    requestId?: string;
    status?: VersionStatus;
    minQualityScore?: number;
    maxQualityScore?: number;
    tags?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  }): Promise<ContentVersion[]>;
  
  // Templates
  createTemplate(template: Omit<VersionTemplate, 'id'>): Promise<VersionTemplate>;
  getTemplate(templateId: string): Promise<VersionTemplate | null>;
  getAllTemplates(): Promise<VersionTemplate[]>;
  updateTemplate(templateId: string, updates: Partial<VersionTemplate>): Promise<void>;
  deleteTemplate(templateId: string): Promise<void>;
  
  // Analytics and Metrics
  getVersionMetrics(requestId: string): Promise<{
    totalVersions: number;
    averageQualityScore: number;
    bestQualityScore: number;
    totalProcessingTime: number;
    totalCost: number;
    improvementCount: number;
  }>;
  
  getSystemMetrics(): Promise<{
    totalRequests: number;
    totalVersions: number;
    averageVersionsPerRequest: number;
    averageQualityScore: number;
    mostUsedStrategy: VersionGenerationStrategy;
    totalCost: number;
  }>;
}

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
  
  // Strategy-specific generation
  generateSequentialVersions(request: VersionRequest): Promise<ContentVersion[]>;
  generateParallelVersions(request: VersionRequest): Promise<ContentVersion[]>;
  generateImprovementVersions(request: VersionRequest): Promise<ContentVersion[]>;
  generateVariationVersions(request: VersionRequest): Promise<ContentVersion[]>;
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
  
  // Selection criteria methods
  selectByQuality(versions: ContentVersion[]): Promise<ContentVersion>;
  selectByCost(versions: ContentVersion[]): Promise<ContentVersion>;
  selectBySpeed(versions: ContentVersion[]): Promise<ContentVersion>;
  selectByCustomCriteria(
    versions: ContentVersion[],
    criteria: Record<string, number>
  ): Promise<ContentVersion>;
  
  // Comparison methods
  compareByQuality(versions: ContentVersion[]): Promise<VersionComparison>;
  compareByContent(versions: ContentVersion[]): Promise<VersionComparison>;
  compareByMetrics(versions: ContentVersion[]): Promise<VersionComparison>;
  compareByCustomCriteria(
    versions: ContentVersion[],
    criteria: string[]
  ): Promise<VersionComparison>;
}

export interface IVersionRepository {
  // Request operations
  saveRequest(request: VersionRequest): Promise<void>;
  getRequest(requestId: string): Promise<VersionRequest | null>;
  updateRequest(requestId: string, updates: Partial<VersionRequest>): Promise<void>;
  deleteRequest(requestId: string): Promise<void>;
  getAllRequests(): Promise<VersionRequest[]>;
  
  // Version operations
  saveVersion(version: ContentVersion): Promise<void>;
  getVersion(versionId: string): Promise<ContentVersion | null>;
  updateVersion(versionId: string, updates: Partial<ContentVersion>): Promise<void>;
  deleteVersion(versionId: string): Promise<void>;
  
  // Query operations
  getVersionsByRequest(requestId: string): Promise<ContentVersion[]>;
  getVersionsByStatus(status: VersionStatus): Promise<ContentVersion[]>;
  getVersionsByQualityRange(min: number, max: number): Promise<ContentVersion[]>;
  getVersionsByTags(tags: string[]): Promise<ContentVersion[]>;
  
  // Search operations
  searchVersions(criteria: {
    requestId?: string;
    status?: VersionStatus;
    minQualityScore?: number;
    maxQualityScore?: number;
    tags?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  }): Promise<ContentVersion[]>;
  
  // Template operations
  saveTemplate(template: VersionTemplate): Promise<void>;
  getTemplate(templateId: string): Promise<VersionTemplate | null>;
  getAllTemplates(): Promise<VersionTemplate[]>;
  updateTemplate(templateId: string, updates: Partial<VersionTemplate>): Promise<void>;
  deleteTemplate(templateId: string): Promise<void>;
  
  // Feedback operations
  saveFeedback(versionId: string, feedback: VersionFeedback): Promise<void>;
  getFeedback(versionId: string): Promise<VersionFeedback[]>;
  
  // Comparison operations
  saveComparison(comparison: VersionComparison): Promise<void>;
  getComparison(requestId: string): Promise<VersionComparison | null>;
  
  // Analytics operations
  getRequestMetrics(requestId: string): Promise<any>;
  getSystemMetrics(): Promise<any>;
}

export interface IVersionComparator {
  compareVersions(
    version1: ContentVersion,
    version2: ContentVersion,
    criteria: string[]
  ): Promise<{
    winner: string;
    score: number;
    analysis: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  
  analyzeContent(content: string): Promise<{
    readability: number;
    complexity: number;
    engagement: number;
    structure: number;
    creativity: number;
  }>;
  
  findDifferences(
    content1: string,
    content2: string
  ): Promise<{
    additions: string[];
    removals: string[];
    modifications: string[];
    similarity: number;
  }>;
  
  generateComparisonSummary(
    versions: ContentVersion[],
    comparison: VersionComparison
  ): Promise<string>;
}

export interface IVersionImprover {
  improveVersion(
    version: ContentVersion,
    feedback: string,
    improvementType: 'quality' | 'content' | 'style' | 'structure'
  ): Promise<ContentVersion>;
  
  generateImprovementPrompt(
    version: ContentVersion,
    feedback: string,
    improvementType: string
  ): Promise<string>;
  
  validateImprovement(
    original: ContentVersion,
    improved: ContentVersion
  ): Promise<{
    improved: boolean;
    improvementScore: number;
    analysis: string;
  }>;
  
  suggestImprovements(version: ContentVersion): Promise<string[]>;
}

export interface IVersionCache {
  // Version caching
  cacheVersion(version: ContentVersion, ttl?: number): Promise<void>;
  getCachedVersion(versionId: string): Promise<ContentVersion | null>;
  invalidateVersion(versionId: string): Promise<void>;
  
  // Request caching
  cacheRequest(request: VersionRequest, ttl?: number): Promise<void>;
  getCachedRequest(requestId: string): Promise<VersionRequest | null>;
  invalidateRequest(requestId: string): Promise<void>;
  
  // Comparison caching
  cacheComparison(comparison: VersionComparison, ttl?: number): Promise<void>;
  getCachedComparison(requestId: string): Promise<VersionComparison | null>;
  
  // Cache management
  clearCache(): Promise<void>;
  getCacheStats(): Promise<{
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  }>;
}

export interface IVersionNotifier {
  // Event notifications
  onVersionGenerated(callback: (version: ContentVersion) => void): void;
  onVersionEvaluated(callback: (version: ContentVersion) => void): void;
  onVersionSelected(callback: (requestId: string, versionId: string) => void): void;
  onRequestCompleted(callback: (request: VersionRequest) => void): void;
  
  // Notification methods
  notifyVersionGenerated(version: ContentVersion): void;
  notifyVersionEvaluated(version: ContentVersion): void;
  notifyVersionSelected(requestId: string, versionId: string): void;
  notifyRequestCompleted(request: VersionRequest): void;
}

export interface IVersionValidator {
  validateVersion(version: ContentVersion): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  validateRequest(request: VersionRequest): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  validateConfig(config: VersionGenerationConfig): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  validateContent(content: string, criteria: Record<string, any>): Promise<{
    valid: boolean;
    score: number;
    issues: string[];
  }>;
}
