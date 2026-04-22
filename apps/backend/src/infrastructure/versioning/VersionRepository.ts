import { 
  IVersionRepository,
  IVersionValidator
} from '@/domain/versioning/services/IVersioningService';
import { 
  ContentVersion, 
  VersionRequest, 
  VersionStatus, 
  VersionTemplate,
  VersionFeedback,
  VersionComparison
} from '@/domain/versioning/entities/Version';

// In-memory repository implementation (can be replaced with database implementation)
export class VersionRepository implements IVersionRepository {
  private requests: Map<string, VersionRequest> = new Map();
  private versions: Map<string, ContentVersion> = new Map();
  private templates: Map<string, VersionTemplate> = new Map();
  private feedback: Map<string, VersionFeedback[]> = new Map();
  private comparisons: Map<string, VersionComparison> = new Map();
  private validator?: IVersionValidator;

  constructor(validator?: IVersionValidator) {
    this.validator = validator;
  }

  // Request operations
  async saveRequest(request: VersionRequest): Promise<void> {
    if (this.validator) {
      const validation = await this.validator.validateRequest(request);
      if (!validation.valid) {
        throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
      }
    }
    
    this.requests.set(request.id, request);
  }

  async getRequest(requestId: string): Promise<VersionRequest | null> {
    return this.requests.get(requestId) || null;
  }

  async updateRequest(requestId: string, updates: Partial<VersionRequest>): Promise<void> {
    const existing = this.requests.get(requestId);
    if (!existing) {
      throw new Error(`Request not found: ${requestId}`);
    }

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    
    if (this.validator) {
      const validation = await this.validator.validateRequest(updated);
      if (!validation.valid) {
        throw new Error(`Invalid request update: ${validation.errors.join(', ')}`);
      }
    }
    
    this.requests.set(requestId, updated);
  }

  async deleteRequest(requestId: string): Promise<void> {
    const exists = this.requests.has(requestId);
    if (!exists) {
      throw new Error(`Request not found: ${requestId}`);
    }
    
    // Delete associated versions
    const versions = await this.getVersionsByRequest(requestId);
    for (const version of versions) {
      await this.deleteVersion(version.id);
    }
    
    this.requests.delete(requestId);
  }

  async getAllRequests(): Promise<VersionRequest[]> {
    return Array.from(this.requests.values());
  }

  // Version operations
  async saveVersion(version: ContentVersion): Promise<void> {
    if (this.validator) {
      const validation = await this.validator.validateVersion(version);
      if (!validation.valid) {
        throw new Error(`Invalid version: ${validation.errors.join(', ')}`);
      }
    }
    
    this.versions.set(version.id, version);
  }

  async getVersion(versionId: string): Promise<ContentVersion | null> {
    return this.versions.get(versionId) || null;
  }

  async updateVersion(versionId: string, updates: Partial<ContentVersion>): Promise<void> {
    const existing = this.versions.get(versionId);
    if (!existing) {
      throw new Error(`Version not found: ${versionId}`);
    }

    const updated = { ...existing, ...updates };
    
    if (this.validator) {
      const validation = await this.validator.validateVersion(updated);
      if (!validation.valid) {
        throw new Error(`Invalid version update: ${validation.errors.join(', ')}`);
      }
    }
    
    this.versions.set(versionId, updated);
  }

  async deleteVersion(versionId: string): Promise<void> {
    const exists = this.versions.has(versionId);
    if (!exists) {
      throw new Error(`Version not found: ${versionId}`);
    }
    
    // Delete associated feedback
    this.feedback.delete(versionId);
    
    this.versions.delete(versionId);
  }

  // Query operations
  async getVersionsByRequest(requestId: string): Promise<ContentVersion[]> {
    const versions = Array.from(this.versions.values());
    return versions.filter(version => version.requestId === requestId);
  }

  async getVersionsByStatus(status: VersionStatus): Promise<ContentVersion[]> {
    const versions = Array.from(this.versions.values());
    return versions.filter(version => version.status === status);
  }

  async getVersionsByQualityRange(min: number, max: number): Promise<ContentVersion[]> {
    const versions = Array.from(this.versions.values());
    return versions.filter(version => 
      version.qualityScore !== undefined && 
      version.qualityScore >= min && 
      version.qualityScore <= max
    );
  }

  async getVersionsByTags(tags: string[]): Promise<ContentVersion[]> {
    const versions = Array.from(this.versions.values());
    return versions.filter(version => 
      tags.some(tag => version.metadata.tags.includes(tag))
    );
  }

  // Search operations
  async searchVersions(criteria: {
    requestId?: string;
    status?: VersionStatus;
    minQualityScore?: number;
    maxQualityScore?: number;
    tags?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  }): Promise<ContentVersion[]> {
    let versions = Array.from(this.versions.values());

    // Filter by request ID
    if (criteria.requestId) {
      versions = versions.filter(version => version.requestId === criteria.requestId);
    }

    // Filter by status
    if (criteria.status) {
      versions = versions.filter(version => version.status === criteria.status);
    }

    // Filter by quality score range
    if (criteria.minQualityScore !== undefined) {
      versions = versions.filter(version => 
        version.qualityScore !== undefined && version.qualityScore >= criteria.minQualityScore!
      );
    }

    if (criteria.maxQualityScore !== undefined) {
      versions = versions.filter(version => 
        version.qualityScore !== undefined && version.qualityScore <= criteria.maxQualityScore!
      );
    }

    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      versions = versions.filter(version => 
        criteria.tags!.some(tag => version.metadata.tags.includes(tag))
      );
    }

    // Filter by date range
    if (criteria.dateRange) {
      versions = versions.filter(version => {
        const generatedAt = version.metadata.generatedAt;
        return generatedAt >= criteria.dateRange!.start && generatedAt <= criteria.dateRange!.end;
      });
    }

    return versions;
  }

  // Template operations
  async saveTemplate(template: VersionTemplate): Promise<void> {
    this.templates.set(template.id, template);
  }

  async getTemplate(templateId: string): Promise<VersionTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async getAllTemplates(): Promise<VersionTemplate[]> {
    return Array.from(this.templates.values());
  }

  async updateTemplate(templateId: string, updates: Partial<VersionTemplate>): Promise<void> {
    const existing = this.templates.get(templateId);
    if (!existing) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const updated = { ...existing, ...updates };
    this.templates.set(templateId, updated);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const exists = this.templates.has(templateId);
    if (!exists) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    this.templates.delete(templateId);
  }

  // Feedback operations
  async saveFeedback(versionId: string, feedback: VersionFeedback): Promise<void> {
    const existing = this.feedback.get(versionId) || [];
    existing.push(feedback);
    this.feedback.set(versionId, existing);
  }

  async getFeedback(versionId: string): Promise<VersionFeedback[]> {
    return this.feedback.get(versionId) || [];
  }

  // Comparison operations
  async saveComparison(comparison: VersionComparison): Promise<void> {
    this.comparisons.set(comparison.requestId, comparison);
  }

  async getComparison(requestId: string): Promise<VersionComparison | null> {
    return this.comparisons.get(requestId) || null;
  }

  // Analytics operations
  async getRequestMetrics(requestId: string): Promise<any> {
    const request = await this.getRequest(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    const versions = await this.getVersionsByRequest(requestId);
    const selectedVersion = versions.find(v => v.id === request.selectedVersionId);

    return {
      requestId,
      totalVersions: versions.length,
      selectedVersionId: request.selectedVersionId,
      averageQualityScore: this.calculateAverageQualityScore(versions),
      bestQualityScore: this.calculateBestQualityScore(versions),
      totalProcessingTime: request.metadata.totalProcessingTime,
      totalCost: request.metadata.totalCost,
      totalTokensUsed: request.metadata.totalTokensUsed,
      improvementCount: request.metadata.improvementCount,
      generationAttempts: request.metadata.generationAttempts,
      selectedQualityScore: selectedVersion?.qualityScore,
      status: request.status,
      completedAt: request.completedAt
    };
  }

  async getSystemMetrics(): Promise<any> {
    const requests = Array.from(this.requests.values());
    const versions = Array.from(this.versions.values());

    return {
      totalRequests: requests.length,
      totalVersions: versions.length,
      averageVersionsPerRequest: versions.length / Math.max(requests.length, 1),
      averageQualityScore: this.calculateAverageQualityScore(versions),
      mostUsedStrategy: this.getMostUsedStrategy(requests),
      totalCost: requests.reduce((sum, req) => sum + req.metadata.totalCost, 0),
      totalTokensUsed: requests.reduce((sum, req) => sum + req.metadata.totalTokensUsed, 0),
      requestsByStatus: this.getRequestsByStatus(requests),
      versionsByStatus: this.getVersionsByStatusCount(versions),
      averageProcessingTime: this.calculateAverageProcessingTime(versions)
    };
  }

  // Private helper methods
  private calculateAverageQualityScore(versions: ContentVersion[]): number {
    const scores = versions
      .filter(v => v.qualityScore !== undefined)
      .map(v => v.qualityScore!);
    
    if (scores.length === 0) return 0;
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateBestQualityScore(versions: ContentVersion[]): number {
    const scores = versions
      .filter(v => v.qualityScore !== undefined)
      .map(v => v.qualityScore!);
    
    if (scores.length === 0) return 0;
    
    return Math.max(...scores);
  }

  private getMostUsedStrategy(requests: VersionRequest[]): string {
    const strategyCounts = new Map<string, number>();
    
    requests.forEach(request => {
      const count = strategyCounts.get(request.config.strategy) || 0;
      strategyCounts.set(request.config.strategy, count + 1);
    });
    
    let maxCount = 0;
    let mostUsedStrategy = '';
    
    for (const [strategy, count] of strategyCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostUsedStrategy = strategy;
      }
    }
    
    return mostUsedStrategy;
  }

  private getRequestsByStatus(requests: VersionRequest[]): Record<string, number> {
    const statusCounts: Record<string, number> = {};
    
    requests.forEach(request => {
      const status = request.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return statusCounts;
  }

  private getVersionsByStatusCount(versions: ContentVersion[]): Record<string, number> {
    const statusCounts: Record<string, number> = {};
    
    versions.forEach(version => {
      const status = version.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return statusCounts;
  }

  private calculateAverageProcessingTime(versions: ContentVersion[]): number {
    const times = versions.map(v => v.metadata.processingTime);
    
    if (times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  // Cache management methods (if needed for future implementation)
  async clearCache(): Promise<void> {
    // In-memory implementation doesn't need cache clearing
  }

  async getCacheStats(): Promise<any> {
    return {
      size: this.requests.size + this.versions.size + this.templates.size,
      requests: this.requests.size,
      versions: this.versions.size,
      templates: this.templates.size,
      feedback: this.feedback.size,
      comparisons: this.comparisons.size
    };
  }
}
