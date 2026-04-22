import { FastifyRequest, FastifyReply } from 'fastify';
import { VersioningService } from '@/infrastructure/versioning/VersioningService';
import { VersionGenerationStrategy } from '@/domain/versioning/entities/Version';

export class VersioningController {
  private versioningService: VersioningService;

  constructor(versioningService: VersioningService) {
    this.versioningService = versioningService;
  }

  // Version Request Management
  async createVersionRequest(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { input, config } = request.body as any;
      
      const versionRequest = await this.versioningService.createVersionRequest(input, config);
      
      return reply.send({
        success: true,
        data: versionRequest
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getVersionRequest(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      const versionRequest = await this.versioningService.getVersionRequest(id);
      if (!versionRequest) {
        return reply.status(404).send({
          success: false,
          error: 'Version request not found'
        });
      }

      return reply.send({
        success: true,
        data: versionRequest
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateVersionRequest(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const updates = request.body as any;
      
      await this.versioningService.updateVersionRequest(id, updates);
      
      return reply.send({
        success: true,
        message: 'Version request updated successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteVersionRequest(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      await this.versioningService.deleteVersionRequest(id);
      
      return reply.send({
        success: true,
        message: 'Version request deleted successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Version Generation
  async generateVersions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      const versions = await this.versioningService.generateVersions(id);
      
      return reply.send({
        success: true,
        data: {
          versions,
          count: versions.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateImprovedVersion(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const { feedback, context } = request.body as any;
      
      const improvedVersion = await this.versioningService.generateImprovedVersion(id, feedback, context);
      
      return reply.send({
        success: true,
        data: improvedVersion
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateVariations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const { count, context } = request.body as any;
      
      const variations = await this.versioningService.generateVariations(id, count, context);
      
      return reply.send({
        success: true,
        data: {
          variations,
          count: variations.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Version Selection and Comparison
  async selectBestVersion(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const { criteria } = request.body as any;
      
      const bestVersion = await this.versioningService.selectBestVersion(id, criteria);
      
      return reply.send({
        success: true,
        data: bestVersion
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async compareVersions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const { versionIds, criteria } = request.body as any;
      
      const comparison = await this.versioningService.compareVersions(id, versionIds, criteria);
      
      return reply.send({
        success: true,
        data: comparison
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async rankVersions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const { criteria } = request.body as any;
      
      const rankedVersions = await this.versioningService.rankVersions(id, criteria);
      
      return reply.send({
        success: true,
        data: {
          versions: rankedVersions,
          count: rankedVersions.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Version Retrieval
  async getVersion(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      const version = await this.versioningService.getVersion(id);
      if (!version) {
        return reply.status(404).send({
          success: false,
          error: 'Version not found'
        });
      }

      return reply.send({
        success: true,
        data: version
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAllVersions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { requestId } = request.params as any;
      
      const versions = await this.versioningService.getAllVersions(requestId);
      
      return reply.send({
        success: true,
        data: {
          versions,
          count: versions.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getSelectedVersion(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { requestId } = request.params as any;
      
      const selectedVersion = await this.versioningService.getSelectedVersion(requestId);
      if (!selectedVersion) {
        return reply.status(404).send({
          success: false,
          error: 'No selected version found'
        });
      }

      return reply.send({
        success: true,
        data: selectedVersion
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getVersionsByStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { status } = request.params as any;
      
      const versions = await this.versioningService.getVersionsByStatus(status);
      
      return reply.send({
        success: true,
        data: {
          versions,
          count: versions.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Version Management
  async updateVersion(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const updates = request.body as any;
      
      await this.versioningService.updateVersion(id, updates);
      
      return reply.send({
        success: true,
        message: 'Version updated successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteVersion(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      await this.versioningService.deleteVersion(id);
      
      return reply.send({
        success: true,
        message: 'Version deleted successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async selectVersion(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { requestId, versionId } = request.params as any;
      
      await this.versioningService.selectVersion(requestId, versionId);
      
      return reply.send({
        success: true,
        message: 'Version selected successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async rejectVersion(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { requestId, versionId } = request.params as any;
      
      await this.versioningService.rejectVersion(requestId, versionId);
      
      return reply.send({
        success: true,
        message: 'Version rejected successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Feedback and Improvement
  async addFeedback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const feedback = request.body as any;
      
      await this.versioningService.addFeedback(id, feedback);
      
      return reply.send({
        success: true,
        message: 'Feedback added successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getVersionFeedback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      const feedback = await this.versioningService.getVersionFeedback(id);
      
      return reply.send({
        success: true,
        data: {
          feedback,
          count: feedback.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Search and Filter
  async searchVersions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const criteria = request.query as any;
      
      const versions = await this.versioningService.searchVersions(criteria);
      
      return reply.send({
        success: true,
        data: {
          versions,
          count: versions.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Templates
  async createTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const template = request.body as any;
      
      const createdTemplate = await this.versioningService.createTemplate(template);
      
      return reply.status(201).send({
        success: true,
        data: createdTemplate
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      const template = await this.versioningService.getTemplate(id);
      if (!template) {
        return reply.status(404).send({
          success: false,
          error: 'Template not found'
        });
      }

      return reply.send({
        success: true,
        data: template
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAllTemplates(request: FastifyRequest, reply: FastifyReply) {
    try {
      const templates = await this.versioningService.getAllTemplates();
      
      return reply.send({
        success: true,
        data: {
          templates,
          count: templates.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const updates = request.body as any;
      
      await this.versioningService.updateTemplate(id, updates);
      
      return reply.send({
        success: true,
        message: 'Template updated successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      await this.versioningService.deleteTemplate(id);
      
      return reply.send({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Analytics and Metrics
  async getVersionMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { requestId } = request.params as any;
      
      const metrics = await this.versioningService.getVersionMetrics(requestId);
      
      return reply.send({
        success: true,
        data: metrics
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getSystemMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const metrics = await this.versioningService.getSystemMetrics();
      
      return reply.send({
        success: true,
        data: metrics
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Improvement Loop
  async runImprovementLoop(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const { maxIterations, targetQuality } = request.body as any;
      
      const result = await this.versioningService.runImprovementLoop(
        id,
        maxIterations,
        targetQuality
      );
      
      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Quick Version Generation for Content Types
  async quickVersionGeneration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { content, contentType, config } = request.body as any;
      
      // Create version request
      const versionRequest = await this.versioningService.createVersionRequest(
        { content },
        {
          ...config,
          ...this.getContentTypeConfig(contentType)
        }
      );

      // Generate versions
      const versions = await this.versioningService.generateVersions(versionRequest.id);

      // Select best version
      const bestVersion = await this.versioningService.selectBestVersion(versionRequest.id);

      return reply.send({
        success: true,
        data: {
          requestId: versionRequest.id,
          selectedVersion: bestVersion,
          allVersions: versions,
          versionCount: versions.length,
          bestQualityScore: bestVersion.qualityScore
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Helper method to get configuration for different content types
  private getContentTypeConfig(contentType: string): any {
    const configs: Record<string, any> = {
      'youtube_script': {
        maxVersions: 3,
        strategy: VersionGenerationStrategy.VARIATION,
        selectionCriteria: 'quality',
        improvementThreshold: 7.5,
        enableComparison: true,
        autoSelect: false,
        enableImprovementLoop: true,
        maxImprovementIterations: 2,
        targetQuality: 8.5
      },
      'seo_article': {
        maxVersions: 4,
        strategy: VersionGenerationStrategy.IMPROVEMENT,
        selectionCriteria: 'quality',
        improvementThreshold: 7.0,
        enableComparison: true,
        autoSelect: false,
        enableImprovementLoop: true,
        maxImprovementIterations: 3,
        targetQuality: 8.0
      },
      'ad_copy': {
        maxVersions: 5,
        strategy: VersionGenerationStrategy.PARALLEL,
        selectionCriteria: 'quality',
        improvementThreshold: 7.5,
        enableComparison: true,
        autoSelect: false,
        enableImprovementLoop: true,
        maxImprovementIterations: 2,
        targetQuality: 9.0
      },
      'email': {
        maxVersions: 3,
        strategy: VersionGenerationStrategy.SEQUENTIAL,
        selectionCriteria: 'quality',
        improvementThreshold: 7.0,
        enableComparison: true,
        autoSelect: true,
        enableImprovementLoop: false,
        targetQuality: 8.0
      }
    };

    return configs[contentType] || configs['seo_article'];
  }

  // Get service instance for other controllers
  getVersioningService(): VersioningService {
    return this.versioningService;
  }
}
