import { FastifyRequest, FastifyReply } from 'fastify';
import { QualityScoringService } from '@/infrastructure/quality-scoring/QualityScoringService';
import { QualityRegeneratorService } from '@/infrastructure/quality-scoring/QualityScoringService';
import { QualityEvaluationRequest } from '@/domain/quality-scoring/entities/QualityScore';

export class QualityScoringController {
  private qualityService: QualityScoringService;
  private regenerator: QualityRegeneratorService;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || '';
    this.qualityService = new QualityScoringService(apiKey);
    this.regenerator = new QualityRegeneratorService(apiKey);
  }

  // Main quality evaluation endpoint
  async evaluateQuality(request: FastifyRequest, reply: FastifyReply) {
    try {
      const evaluationRequest = request.body as QualityEvaluationRequest;
      
      const result = await this.qualityService.evaluateWithRegeneration(evaluationRequest);
      
      return reply.send({
        success: true,
        data: {
          score: result.score,
          output: result.output,
          regenerated: result.regenerated,
          regenerationAttempts: result.regenerationAttempts,
          processingTime: result.processingTime
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Simple scoring without regeneration
  async scoreContent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const evaluationRequest = request.body as QualityEvaluationRequest;
      
      const score = await this.qualityService.evaluate(evaluationRequest);
      
      return reply.send({
        success: true,
        data: score
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Individual metric scoring
  async scoreClarity(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { content, context } = request.body as any;
      
      const result = await this.qualityService.evaluateClarity(content, context);
      
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

  async scoreRelevance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { content, context } = request.body as any;
      
      const result = await this.qualityService.evaluateRelevance(content, context);
      
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

  async scoreDepth(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { content, context } = request.body as any;
      
      const result = await this.qualityService.evaluateDepth(content, context);
      
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

  async scoreUsefulness(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { content, context } = request.body as any;
      
      const result = await this.qualityService.evaluateUsefulness(content, context);
      
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

  // Batch evaluation
  async batchEvaluate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { requests } = request.body as { requests: QualityEvaluationRequest[] };
      
      if (!requests || !Array.isArray(requests)) {
        return reply.status(400).send({
          success: false,
          error: 'Requests array is required'
        });
      }
      
      const results = await this.qualityService.evaluateBatch(requests);
      
      return reply.send({
        success: true,
        data: {
          results,
          count: results.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Regeneration endpoints
  async regenerateContent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { content, feedback, context, maxAttempts } = request.body as any;
      
      const result = await this.regenerator.regenerate(
        content,
        feedback,
        context,
        maxAttempts
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

  async improveClarity(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { content, feedback } = request.body as any;
      
      const improvedContent = await this.regenerator.improveClarity(content, feedback);
      
      return reply.send({
        success: true,
        data: {
          original: content,
          improved: improvedContent
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async improveRelevance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { content, feedback, context } = request.body as any;
      
      const improvedContent = await this.regenerator.improveRelevance(content, feedback, context);
      
      return reply.send({
        success: true,
        data: {
          original: content,
          improved: improvedContent
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async improveDepth(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { content, feedback } = request.body as any;
      
      const improvedContent = await this.regenerator.improveDepth(content, feedback);
      
      return reply.send({
        success: true,
        data: {
          original: content,
          improved: improvedContent
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async improveUsefulness(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { content, feedback, context } = request.body as any;
      
      const improvedContent = await this.regenerator.improveUsefulness(content, feedback, context);
      
      return reply.send({
        success: true,
        data: {
          original: content,
          improved: improvedContent
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Improvement suggestions
  async getImprovementSuggestions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { score } = request.body as { score: any };
      
      const suggestions = await this.qualityService.getImprovementSuggestions(score);
      
      return reply.send({
        success: true,
        data: suggestions
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Threshold check
  async checkThreshold(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { score, thresholds } = request.body as { score: any; thresholds?: any };
      
      const shouldRegenerate = this.qualityService.shouldRegenerate(score, thresholds);
      
      return reply.send({
        success: true,
        data: {
          shouldRegenerate,
          score: score.overall,
          threshold: thresholds?.minimum || 7
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Quick evaluation for common use cases
  async quickEvaluate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { content, contentType, targetAudience } = request.body as any;
      
      const evaluationRequest: QualityEvaluationRequest = {
        content,
        criteria: {
          targetAudience,
          purpose: this.getDefaultPurpose(contentType),
          tone: this.getDefaultTone(contentType)
        },
        thresholds: {
          minimum: 7,
          excellent: 8.5
        }
      };
      
      const result = await this.qualityService.evaluateWithRegeneration(evaluationRequest);
      
      return reply.send({
        success: true,
        data: {
          score: result.score,
          output: result.output,
          regenerated: result.regenerated,
          passed: result.score.passed,
          processingTime: result.processingTime
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Helper methods
  private getDefaultPurpose(contentType: string): string {
    const purposes: Record<string, string> = {
      'blog_post': 'Inform and educate readers',
      'article': 'Provide comprehensive information',
      'email': 'Communicate message effectively',
      'ad_copy': 'Persuade and convert',
      'social_media': 'Engage and inform audience',
      'product_description': 'Describe product benefits',
      'tutorial': 'Teach step-by-step process',
      'review': 'Evaluate and recommend'
    };
    
    return purposes[contentType] || 'Communicate information clearly';
  }

  private getDefaultTone(contentType: string): string {
    const tones: Record<string, string> = {
      'blog_post': 'conversational',
      'article': 'professional',
      'email': 'professional',
      'ad_copy': 'persuasive',
      'social_media': 'engaging',
      'product_description': 'informative',
      'tutorial': 'instructional',
      'review': 'objective'
    };
    
    return tones[contentType] || 'professional';
  }

  // Get service instances for other controllers
  getQualityService(): QualityScoringService {
    return this.qualityService;
  }

  getRegenerator(): QualityRegeneratorService {
    return this.regenerator;
  }
}
