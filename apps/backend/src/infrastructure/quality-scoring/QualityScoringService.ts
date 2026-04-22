import { IQualityScoringService, IQualityRegenerator } from '@/domain/quality-scoring/services/IQualityScoringService';
import { QualityScore, QualityEvaluationRequest, QualityResult, QualityContext, QualityThresholds } from '@/domain/quality-scoring/entities/QualityScore';
import { ClarityScorer } from './scorers/ClarityScorer';
import { RelevanceScorer } from './scorers/RelevanceScorer';
import { DepthScorer } from './scorers/DepthScorer';
import { UsefulnessScorer } from './scorers/UsefulnessScorer';
import { QualityRegenerator } from './QualityRegenerator';

export class QualityScoringService implements IQualityScoringService {
  private clarityScorer: ClarityScorer;
  private relevanceScorer: RelevanceScorer;
  private depthScorer: DepthScorer;
  private usefulnessScorer: UsefulnessScorer;
  private regenerator: QualityRegenerator;

  constructor(apiKey: string) {
    this.clarityScorer = new ClarityScorer(apiKey);
    this.relevanceScorer = new RelevanceScorer(apiKey);
    this.depthScorer = new DepthScorer(apiKey);
    this.usefulnessScorer = new UsefulnessScorer(apiKey);
    this.regenerator = new QualityRegenerator(apiKey);
  }

  async evaluate(request: QualityEvaluationRequest): Promise<QualityScore> {
    const startTime = Date.now();
    
    try {
      // Convert request context to QualityContext
      const context: QualityContext = {
        targetAudience: request.criteria?.targetAudience,
        purpose: request.criteria?.purpose,
        keywords: request.criteria?.keywords,
        expectedLength: request.criteria?.expectedLength,
        tone: request.criteria?.tone
      };

      // Evaluate each metric
      const [clarityResult, relevanceResult, depthResult, usefulnessResult] = await Promise.all([
        this.clarityScorer.evaluate(request.content, context),
        this.relevanceScorer.evaluate(request.content, context),
        this.depthScorer.evaluate(request.content, context),
        this.usefulnessScorer.evaluate(request.content, context)
      ]);

      // Calculate basic metrics
      const metrics = this.calculateBasicMetrics(request.content);

      // Calculate overall score
      const overall = (clarityResult.score + relevanceResult.score + depthResult.score + usefulnessResult.score) / 4;

      // Determine if regeneration is needed
      const thresholds = request.thresholds || this.getDefaultThresholds();
      const needsRegeneration = overall < thresholds.minimum;
      const passed = overall >= thresholds.minimum;

      return {
        overall,
        clarity: clarityResult.score,
        relevance: relevanceResult.score,
        depth: depthResult.score,
        usefulness: usefulnessResult.score,
        breakdown: {
          clarity: {
            score: clarityResult.score,
            factors: clarityResult.factors,
            suggestions: clarityResult.suggestions
          },
          relevance: {
            score: relevanceResult.score,
            factors: relevanceResult.factors,
            suggestions: relevanceResult.suggestions
          },
          depth: {
            score: depthResult.score,
            factors: depthResult.factors,
            suggestions: depthResult.suggestions
          },
          usefulness: {
            score: usefulnessResult.score,
            factors: usefulnessResult.factors,
            suggestions: usefulnessResult.suggestions
          }
        },
        metadata: {
          ...metrics,
          processingTime: Date.now() - startTime,
          regenerated: false,
          regenerationCount: 0
        },
        suggestions: [
          ...clarityResult.suggestions,
          ...relevanceResult.suggestions,
          ...depthResult.suggestions,
          ...usefulnessResult.suggestions
        ],
        passed,
        needsRegeneration
      };
    } catch (error) {
      throw new Error(`Quality evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async evaluateClarity(content: string, context?: QualityContext): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }> {
    return await this.clarityScorer.evaluate(content, context);
  }

  async evaluateRelevance(content: string, context: QualityContext): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }> {
    return await this.relevanceScorer.evaluate(content, context);
  }

  async evaluateDepth(content: string, context?: QualityContext): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }> {
    return await this.depthScorer.evaluate(content, context);
  }

  async evaluateUsefulness(content: string, context: QualityContext): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }> {
    return await this.usefulnessScorer.evaluate(content, context);
  }

  shouldRegenerate(score: QualityScore, thresholds?: QualityThresholds): boolean {
    const minScore = thresholds?.minimum || 7;
    return score.overall < minScore;
  }

  async evaluateBatch(requests: QualityEvaluationRequest[]): Promise<QualityScore[]> {
    const results = await Promise.all(
      requests.map(request => this.evaluate(request))
    );
    return results;
  }

  async getImprovementSuggestions(score: QualityScore): Promise<{
    priority: string[];
    detailed: Array<{
      metric: string;
      suggestion: string;
      impact: number;
    }>;
  }> {
    const priority: string[] = [];
    const detailed: Array<{
      metric: string;
      suggestion: string;
      impact: number;
    }> = [];

    // Identify priority areas (scores below 7)
    if (score.clarity < 7) {
      priority.push('clarity');
      score.breakdown.clarity.suggestions.forEach(suggestion => {
        detailed.push({
          metric: 'clarity',
          suggestion,
          impact: 7 - score.clarity
        });
      });
    }

    if (score.relevance < 7) {
      priority.push('relevance');
      score.breakdown.relevance.suggestions.forEach(suggestion => {
        detailed.push({
          metric: 'relevance',
          suggestion,
          impact: 7 - score.relevance
        });
      });
    }

    if (score.depth < 7) {
      priority.push('depth');
      score.breakdown.depth.suggestions.forEach(suggestion => {
        detailed.push({
          metric: 'depth',
          suggestion,
          impact: 7 - score.depth
        });
      });
    }

    if (score.usefulness < 7) {
      priority.push('usefulness');
      score.breakdown.usefulness.suggestions.forEach(suggestion => {
        detailed.push({
          metric: 'usefulness',
          suggestion,
          impact: 7 - score.usefulness
        });
      });
    }

    // Sort detailed suggestions by impact (highest first)
    detailed.sort((a, b) => b.impact - a.impact);

    return {
      priority,
      detailed
    };
  }

  // Public method for complete quality evaluation with auto-regeneration
  async evaluateWithRegeneration(request: QualityEvaluationRequest): Promise<QualityResult> {
    const startTime = Date.now();
    
    // Initial evaluation
    let score = await this.evaluate(request);
    let output = request.content;
    let regenerated = false;
    let regenerationAttempts = 0;

    // Auto-regenerate if score is below threshold
    if (this.shouldRegenerate(score, request.thresholds)) {
      const context: QualityContext = {
        targetAudience: request.criteria?.targetAudience,
        purpose: request.criteria?.purpose,
        keywords: request.criteria?.keywords,
        expectedLength: request.criteria?.expectedLength,
        tone: request.criteria?.tone
      };

      const regenerationResult = await this.regenerator.regenerate(
        output,
        score,
        context,
        3 // max attempts
      );

      if (regenerationResult.regenerated && regenerationResult.newContent && regenerationResult.newScore) {
        output = regenerationResult.newContent;
        score = regenerationResult.newScore;
        regenerated = true;
        regenerationAttempts = regenerationResult.attempts;
      }
    }

    return {
      success: true,
      score,
      output: regenerated ? output : undefined,
      regenerated,
      regenerationAttempts,
      processingTime: Date.now() - startTime
    };
  }

  // Helper methods
  private calculateBasicMetrics(content: string): {
    wordCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    readabilityScore?: number;
  } {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0
    };
  }

  private getDefaultThresholds(): QualityThresholds {
    return {
      minimum: 7,
      excellent: 8.5
    };
  }

  // Get regenerator instance for external use
  getRegenerator(): IQualityRegenerator {
    return this.regenerator;
  }
}

// Export the regenerator as IQualityRegenerator
export class QualityRegeneratorService implements IQualityRegenerator {
  private regenerator: QualityRegenerator;

  constructor(apiKey: string) {
    this.regenerator = new QualityRegenerator(apiKey);
  }

  async regenerate(
    content: string,
    feedback: QualityScore,
    context?: QualityContext,
    maxAttempts?: number
  ): Promise<{
    regenerated: boolean;
    newContent?: string;
    newScore?: QualityScore;
    attempts: number;
    processingTime: number;
  }> {
    return await this.regenerator.regenerate(content, feedback, context, maxAttempts);
  }

  async improveClarity(content: string, feedback: QualityScore): Promise<string> {
    return await this.regenerator.improveClarity(content, feedback);
  }

  async improveRelevance(content: string, feedback: QualityScore, context: QualityContext): Promise<string> {
    return await this.regenerator.improveRelevance(content, feedback, context);
  }

  async improveDepth(content: string, feedback: QualityScore): Promise<string> {
    return await this.regenerator.improveDepth(content, feedback);
  }

  async improveUsefulness(content: string, feedback: QualityScore, context: QualityContext): Promise<string> {
    return await this.regenerator.improveUsefulness(content, feedback, context);
  }
}
