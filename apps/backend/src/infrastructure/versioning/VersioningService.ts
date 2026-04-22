import { v4 as uuidv4 } from 'uuid';
import { 
  IVersioningService,
  IVersionGenerator,
  IVersionSelector,
  IVersionRepository,
  IVersionComparator
} from '@/domain/versioning/services/IVersioningService';
import { 
  ContentVersion, 
  VersionRequest, 
  VersionComparison, 
  VersionStatus, 
  VersionGenerationStrategy,
  VersionGenerationConfig,
  VersionFeedback,
  VersionTemplate
} from '@/domain/versioning/entities/Version';

export class VersioningService implements IVersioningService {
  private generator: IVersionGenerator;
  private selector: IVersionSelector;
  private repository: IVersionRepository;
  private comparator: IVersionComparator;

  constructor(
    generator: IVersionGenerator,
    selector: IVersionSelector,
    repository: IVersionRepository,
    comparator: IVersionComparator
  ) {
    this.generator = generator;
    this.selector = selector;
    this.repository = repository;
    this.comparator = comparator;
  }

  // Version Request Management
  async createVersionRequest(
    input: Record<string, any>,
    config?: Partial<VersionGenerationConfig>
  ): Promise<VersionRequest> {
    const defaultConfig: VersionGenerationConfig = {
      maxVersions: 3,
      strategy: VersionGenerationStrategy.SEQUENTIAL,
      selectionCriteria: 'quality',
      improvementThreshold: 7,
      enableComparison: true,
      autoSelect: false,
      retainAllVersions: true
    };

    const finalConfig = { ...defaultConfig, ...config };

    const request: VersionRequest = {
      id: uuidv4(),
      originalInput: input,
      context: {},
      config: finalConfig,
      status: VersionStatus.DRAFT,
      versions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        totalProcessingTime: 0,
        totalCost: 0,
        totalTokensUsed: 0,
        improvementCount: 0,
        generationAttempts: 0
      }
    };

    await this.repository.saveRequest(request);
    return request;
  }

  async getVersionRequest(requestId: string): Promise<VersionRequest | null> {
    return await this.repository.getRequest(requestId);
  }

  async updateVersionRequest(requestId: string, updates: Partial<VersionRequest>): Promise<void> {
    await this.repository.updateRequest(requestId, updates);
  }

  async deleteVersionRequest(requestId: string): Promise<void> {
    await this.repository.deleteRequest(requestId);
  }

  // Version Generation
  async generateVersions(requestId: string): Promise<ContentVersion[]> {
    const request = await this.repository.getRequest(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    // Update request status
    await this.repository.updateRequest(requestId, {
      status: VersionStatus.GENERATED,
      metadata: {
        ...request.metadata,
        generationAttempts: request.metadata.generationAttempts + 1
      }
    });

    // Generate versions
    const versions = await this.generator.generateVersions(request);

    // Update request with generated versions
    await this.repository.updateRequest(requestId, {
      versions,
      metadata: {
        ...request.metadata,
        totalProcessingTime: versions.reduce((sum, v) => sum + v.metadata.processingTime, 0),
        totalCost: versions.reduce((sum, v) => sum + v.metadata.cost, 0),
        totalTokensUsed: versions.reduce((sum, v) => sum + v.metadata.tokensUsed, 0)
      }
    });

    return versions;
  }

  async generateImprovedVersion(
    versionId: string,
    feedback: string,
    context?: Record<string, any>
  ): Promise<ContentVersion> {
    const originalVersion = await this.repository.getVersion(versionId);
    if (!originalVersion) {
      throw new Error(`Version not found: ${versionId}`);
    }

    // Generate improved version
    const improvedVersion = await this.generator.generateImprovedVersion(
      originalVersion,
      feedback,
      context
    );

    // Save improved version
    await this.repository.saveVersion(improvedVersion);

    // Update request metadata
    const request = await this.repository.getRequest(originalVersion.requestId);
    if (request) {
      await this.repository.updateRequest(originalVersion.requestId, {
        metadata: {
          ...request.metadata,
          improvementCount: request.metadata.improvementCount + 1,
          totalProcessingTime: request.metadata.totalProcessingTime + improvedVersion.metadata.processingTime,
          totalCost: request.metadata.totalCost + improvedVersion.metadata.cost,
          totalTokensUsed: request.metadata.totalTokensUsed + improvedVersion.metadata.tokensUsed
        }
      });
    }

    return improvedVersion;
  }

  async generateVariations(
    versionId: string,
    count: number,
    context?: Record<string, any>
  ): Promise<ContentVersion[]> {
    const baseVersion = await this.repository.getVersion(versionId);
    if (!baseVersion) {
      throw new Error(`Version not found: ${versionId}`);
    }

    // Generate variations
    const variations = await this.generator.generateVariations(baseVersion, count, context);

    // Save all variations
    for (const variation of variations) {
      await this.repository.saveVersion(variation);
    }

    // Update request metadata
    const request = await this.repository.getRequest(baseVersion.requestId);
    if (request) {
      await this.repository.updateRequest(baseVersion.requestId, {
        metadata: {
          ...request.metadata,
          totalProcessingTime: request.metadata.totalProcessingTime + variations.reduce((sum, v) => sum + v.metadata.processingTime, 0),
          totalCost: request.metadata.totalCost + variations.reduce((sum, v) => sum + v.metadata.cost, 0),
          totalTokensUsed: request.metadata.totalTokensUsed + variations.reduce((sum, v) => sum + v.metadata.tokensUsed, 0)
        }
      });
    }

    return variations;
  }

  // Version Selection and Comparison
  async selectBestVersion(requestId: string, criteria?: string): Promise<ContentVersion> {
    const request = await this.repository.getRequest(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    const versions = await this.repository.getVersionsByRequest(requestId);
    if (versions.length === 0) {
      throw new Error('No versions available for selection');
    }

    const selectionCriteria = criteria || request.config.selectionCriteria;
    const { bestVersion, comparison } = await this.selector.selectBestVersion(versions, selectionCriteria);

    // Save comparison
    await this.repository.saveComparison(comparison);

    // Update request with selected version
    await this.repository.updateRequest(requestId, {
      selectedVersionId: bestVersion.id,
      status: VersionStatus.SELECTED
    });

    // Update version status
    await this.repository.updateVersion(bestVersion.id, {
      status: VersionStatus.SELECTED,
      comparison: {
        rank: 1,
        score: comparison.results.find(r => r.versionId === bestVersion.id)?.score || 0,
        advantages: comparison.results.find(r => r.versionId === bestVersion.id)?.strengths || [],
        disadvantages: comparison.results.find(r => r.versionId === bestVersion.id)?.weaknesses || []
      }
    });

    return bestVersion;
  }

  async compareVersions(
    requestId: string,
    versionIds: string[],
    criteria: string[]
  ): Promise<VersionComparison> {
    // Get versions to compare
    const versions = await Promise.all(
      versionIds.map(id => this.repository.getVersion(id))
    );
    
    const validVersions = versions.filter(v => v !== null) as ContentVersion[];
    
    if (validVersions.length < 2) {
      throw new Error('At least 2 valid versions required for comparison');
    }

    // Perform comparison
    const comparison = await this.selector.compareVersions(validVersions, criteria);

    // Save comparison
    await this.repository.saveComparison(comparison);

    return comparison;
  }

  async rankVersions(requestId: string, criteria: string): Promise<ContentVersion[]> {
    const request = await this.repository.getRequest(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    const versions = await this.repository.getVersionsByRequest(requestId);
    return await this.selector.rankVersions(versions, criteria);
  }

  // Version Retrieval
  async getVersion(versionId: string): Promise<ContentVersion | null> {
    return await this.repository.getVersion(versionId);
  }

  async getAllVersions(requestId: string): Promise<ContentVersion[]> {
    return await this.repository.getVersionsByRequest(requestId);
  }

  async getSelectedVersion(requestId: string): Promise<ContentVersion | null> {
    const request = await this.repository.getRequest(requestId);
    if (!request || !request.selectedVersionId) {
      return null;
    }

    return await this.repository.getVersion(request.selectedVersionId);
  }

  async getVersionsByStatus(status: VersionStatus): Promise<ContentVersion[]> {
    return await this.repository.getVersionsByStatus(status);
  }

  // Version Management
  async updateVersion(versionId: string, updates: Partial<ContentVersion>): Promise<void> {
    await this.repository.updateVersion(versionId, updates);
  }

  async deleteVersion(versionId: string): Promise<void> {
    await this.repository.deleteVersion(versionId);
  }

  async selectVersion(requestId: string, versionId: string): Promise<void> {
    const version = await this.repository.getVersion(versionId);
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    // Update request
    await this.repository.updateRequest(requestId, {
      selectedVersionId: versionId,
      status: VersionStatus.SELECTED
    });

    // Update version status
    await this.repository.updateVersion(versionId, {
      status: VersionStatus.SELECTED
    });
  }

  async rejectVersion(requestId: string, versionId: string): Promise<void> {
    const version = await this.repository.getVersion(versionId);
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    // Update version status
    await this.repository.updateVersion(versionId, {
      status: VersionStatus.REJECTED
    });
  }

  // Feedback and Improvement
  async addFeedback(versionId: string, feedback: VersionFeedback): Promise<void> {
    await this.repository.saveFeedback(versionId, feedback);
  }

  async getVersionFeedback(versionId: string): Promise<VersionFeedback[]> {
    return await this.repository.getFeedback(versionId);
  }

  // Search and Filter
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
    return await this.repository.searchVersions(criteria);
  }

  // Templates
  async createTemplate(template: Omit<VersionTemplate, 'id'>): Promise<VersionTemplate> {
    const newTemplate: VersionTemplate = {
      id: uuidv4(),
      ...template
    };

    await this.repository.saveTemplate(newTemplate);
    return newTemplate;
  }

  async getTemplate(templateId: string): Promise<VersionTemplate | null> {
    return await this.repository.getTemplate(templateId);
  }

  async getAllTemplates(): Promise<VersionTemplate[]> {
    return await this.repository.getAllTemplates();
  }

  async updateTemplate(templateId: string, updates: Partial<VersionTemplate>): Promise<void> {
    await this.repository.updateTemplate(templateId, updates);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.repository.deleteTemplate(templateId);
  }

  // Analytics and Metrics
  async getVersionMetrics(requestId: string): Promise<{
    totalVersions: number;
    averageQualityScore: number;
    bestQualityScore: number;
    totalProcessingTime: number;
    totalCost: number;
    improvementCount: number;
  }> {
    const metrics = await this.repository.getRequestMetrics(requestId);
    
    return {
      totalVersions: metrics.totalVersions,
      averageQualityScore: metrics.averageQualityScore,
      bestQualityScore: metrics.bestQualityScore,
      totalProcessingTime: metrics.totalProcessingTime,
      totalCost: metrics.totalCost,
      improvementCount: metrics.improvementCount
    };
  }

  async getSystemMetrics(): Promise<{
    totalRequests: number;
    totalVersions: number;
    averageVersionsPerRequest: number;
    averageQualityScore: number;
    mostUsedStrategy: VersionGenerationStrategy;
    totalCost: number;
  }> {
    const metrics = await this.repository.getSystemMetrics();
    
    return {
      totalRequests: metrics.totalRequests,
      totalVersions: metrics.totalVersions,
      averageVersionsPerRequest: metrics.averageVersionsPerRequest,
      averageQualityScore: metrics.averageQualityScore,
      mostUsedStrategy: metrics.mostUsedStrategy as VersionGenerationStrategy,
      totalCost: metrics.totalCost
    };
  }

  // Improvement Loop Implementation
  async runImprovementLoop(
    requestId: string,
    maxIterations: number = 3,
    targetQuality: number = 8.0
  ): Promise<{
    improved: boolean;
    iterations: number;
    finalVersion: ContentVersion;
    metrics: any;
  }> {
    const request = await this.repository.getRequest(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    let currentVersion = await this.getBestVersion(requestId);
    if (!currentVersion) {
      throw new Error('No versions available for improvement');
    }

    let iterations = 0;
    let improved = false;

    for (let i = 0; i < maxIterations; i++) {
      iterations++;

      // Check if we've reached target quality
      if (currentVersion.qualityScore && currentVersion.qualityScore >= targetQuality) {
        improved = true;
        break;
      }

      // Generate feedback for improvement
      const feedback = this.generateImprovementFeedback(currentVersion);

      // Generate improved version
      const improvedVersion = await this.generateImprovedVersion(
        currentVersion.id,
        feedback,
        request.context
      );

      // Check if improvement was successful
      if (improvedVersion.qualityScore && 
          improvedVersion.qualityScore > (currentVersion.qualityScore || 0)) {
        currentVersion = improvedVersion;
        improved = true;
      } else {
        // No improvement, stop the loop
        break;
      }
    }

    // Select the final version if it's better
    if (improved) {
      await this.selectVersion(requestId, currentVersion.id);
    }

    const metrics = await this.getVersionMetrics(requestId);

    return {
      improved,
      iterations,
      finalVersion: currentVersion,
      metrics
    };
  }

  private async getBestVersion(requestId: string): Promise<ContentVersion | null> {
    try {
      return await this.selectBestVersion(requestId);
    } catch (error) {
      // Fallback to highest quality version
      const versions = await this.repository.getVersionsByRequest(requestId);
      return versions.reduce((best, current) => {
        const bestScore = best?.qualityScore || 0;
        const currentScore = current.qualityScore || 0;
        return currentScore > bestScore ? current : best;
      }, versions[0] || null);
    }
  }

  private generateImprovementFeedback(version: ContentVersion): string {
    const feedback: string[] = [];

    if (version.qualityScore && version.qualityScore < 7) {
      feedback.push('Overall quality needs significant improvement');
    }

    if (version.qualityBreakdown) {
      if (version.qualityBreakdown.clarity < 7) {
        feedback.push('Improve clarity and readability');
      }
      if (version.qualityBreakdown.relevance < 7) {
        feedback.push('Enhance relevance and focus');
      }
      if (version.qualityBreakdown.depth < 7) {
        feedback.push('Add more depth and substance');
      }
      if (version.qualityBreakdown.usefulness < 7) {
        feedback.push('Increase practical value and usefulness');
      }
    }

    if (feedback.length === 0) {
      feedback.push('General improvement needed');
    }

    return feedback.join('. ');
  }
}
