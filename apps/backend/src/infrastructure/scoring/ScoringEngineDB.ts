import { ContentQualityMetrics, QualityAnalysis } from './ContentQualityMetrics';
import { ScoringResultRepository, ScoringResult as DBScoringResult, CreateScoringResultData } from '../repositories/ScoringResultRepository';

export interface ScoringFactor {
  name: string;
  weight: number;
  value: number;
  description?: string;
  explanation?: string;
}

export interface ScoringRequest {
  entityType: string;
  entityId: string;
  content: string;
  algorithm?: string;
  context?: {
    prompt?: string;
    expectedLength?: number;
    topic?: string;
    audience?: string;
  };
}

export interface ScoringResult {
  id: string;
  entityType: string;
  entityId: string;
  score: number;
  algorithm: string;
  factors: ScoringFactor[];
  breakdown: Record<string, number>;
  confidence: number;
  explanation: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface ScoringAlgorithm {
  name: string;
  calculate(analysis: QualityAnalysis, context?: any): {
    score: number;
    factors: ScoringFactor[];
    breakdown: Record<string, number>;
    confidence: number;
    explanation: string;
  };
}

export class QualityBasedAlgorithm implements ScoringAlgorithm {
  name = 'quality_based';

  calculate(analysis: QualityAnalysis, context?: any): {
    score: number;
    factors: ScoringFactor[];
    breakdown: Record<string, number>;
    confidence: number;
    explanation: string;
  } {
    const factors: ScoringFactor[] = [
      {
        name: 'readability',
        weight: 0.15,
        value: analysis.metrics.readability,
        description: 'Text readability and complexity',
        explanation: analysis.explanations.readability
      },
      {
        name: 'coherence',
        weight: 0.15,
        value: analysis.metrics.coherence,
        description: 'Logical flow and connectivity',
        explanation: analysis.explanations.coherence
      },
      {
        name: 'relevance',
        weight: 0.20,
        value: analysis.metrics.relevance,
        description: 'Alignment with requirements and topic',
        explanation: analysis.explanations.relevance
      },
      {
        name: 'completeness',
        weight: 0.15,
        value: analysis.metrics.completeness,
        description: 'Coverage of required content',
        explanation: analysis.explanations.completeness
      },
      {
        name: 'accuracy',
        weight: 0.15,
        value: analysis.metrics.accuracy,
        description: 'Factual consistency and reliability',
        explanation: analysis.explanations.accuracy
      },
      {
        name: 'engagement',
        weight: 0.10,
        value: analysis.metrics.engagement,
        description: 'Reader engagement and active voice',
        explanation: analysis.explanations.engagement
      },
      {
        name: 'structure',
        weight: 0.05,
        value: analysis.metrics.structure,
        description: 'Organization and formatting',
        explanation: analysis.explanations.structure
      },
      {
        name: 'originality',
        weight: 0.05,
        value: analysis.metrics.originality,
        description: 'Creativity and uniqueness',
        explanation: analysis.explanations.originality
      }
    ];

    // Calculate weighted score
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const weightedSum = factors.reduce((sum, factor) => sum + (factor.value * factor.weight), 0);
    const score = weightedSum / totalWeight;

    // Create breakdown
    const breakdown: Record<string, number> = {};
    factors.forEach(factor => {
      breakdown[factor.name] = factor.value * factor.weight;
    });

    // Generate explanation
    const explanation = this.generateExplanation(score, analysis, factors);

    return {
      score: Math.round(score * 10000) / 10000,
      factors,
      breakdown,
      confidence: analysis.confidence,
      explanation
    };
  }

  private generateExplanation(score: number, analysis: QualityAnalysis, factors: ScoringFactor[]): string {
    let explanation = `Overall quality score: ${(score * 100).toFixed(1)}%. `;

    if (score > 0.8) {
      explanation += 'Excellent quality content with strong performance across all metrics. ';
    } else if (score > 0.6) {
      explanation += 'Good quality content with room for improvement in some areas. ';
    } else if (score > 0.4) {
      explanation += 'Moderate quality content that needs significant improvements. ';
    } else {
      explanation += 'Poor quality content requiring major revisions. ';
    }

    // Add top strengths
    if (analysis.strengths.length > 0) {
      explanation += `Key strengths: ${analysis.strengths.slice(0, 3).join(', ')}. `;
    }

    // Add main issues
    if (analysis.issues.length > 0) {
      explanation += `Areas for improvement: ${analysis.issues.slice(0, 3).join(', ')}. `;
    }

    // Add top performing factors
    const topFactors = factors
      .sort((a, b) => (b.value * b.weight) - (a.value * a.weight))
      .slice(0, 2);
    
    explanation += `Strongest factors: ${topFactors.map(f => f.name).join(' and ')}. `;

    // Add weakest factors
    const weakFactors = factors
      .sort((a, b) => (a.value * a.weight) - (b.value * b.weight))
      .slice(0, 2);
    
    if (weakFactors[0].value < 0.5) {
      explanation += `Needs improvement: ${weakFactors.map(f => f.name).join(' and ')}.`;
    }

    return explanation;
  }
}

export class WeightedQualityAlgorithm implements ScoringAlgorithm {
  name = 'weighted_quality';

  calculate(analysis: QualityAnalysis, context?: any): {
    score: number;
    factors: ScoringFactor[];
    breakdown: Record<string, number>;
    confidence: number;
    explanation: string;
  } {
    // Adjust weights based on context
    const baseWeights = {
      readability: 0.10,
      coherence: 0.15,
      relevance: 0.25,
      completeness: 0.20,
      accuracy: 0.20,
      engagement: 0.05,
      structure: 0.03,
      originality: 0.02
    };

    // Adjust weights based on context
    let weights = { ...baseWeights };
    
    if (context?.audience === 'technical') {
      weights.accuracy += 0.05;
      weights.readability -= 0.05;
    }
    
    if (context?.audience === 'marketing') {
      weights.engagement += 0.05;
      weights.originality += 0.03;
      weights.accuracy -= 0.03;
      weights.structure -= 0.02;
    }
    
    if (context?.prompt) {
      weights.relevance += 0.05;
      weights.completeness += 0.05;
      weights.readability -= 0.03;
      weights.originality -= 0.02;
    }

    const factors: ScoringFactor[] = [
      {
        name: 'readability',
        weight: weights.readability,
        value: analysis.metrics.readability,
        description: 'Text readability and complexity',
        explanation: analysis.explanations.readability
      },
      {
        name: 'coherence',
        weight: weights.coherence,
        value: analysis.metrics.coherence,
        description: 'Logical flow and connectivity',
        explanation: analysis.explanations.coherence
      },
      {
        name: 'relevance',
        weight: weights.relevance,
        value: analysis.metrics.relevance,
        description: 'Alignment with requirements and topic',
        explanation: analysis.explanations.relevance
      },
      {
        name: 'completeness',
        weight: weights.completeness,
        value: analysis.metrics.completeness,
        description: 'Coverage of required content',
        explanation: analysis.explanations.completeness
      },
      {
        name: 'accuracy',
        weight: weights.accuracy,
        value: analysis.metrics.accuracy,
        description: 'Factual consistency and reliability',
        explanation: analysis.explanations.accuracy
      },
      {
        name: 'engagement',
        weight: weights.engagement,
        value: analysis.metrics.engagement,
        description: 'Reader engagement and active voice',
        explanation: analysis.explanations.engagement
      },
      {
        name: 'structure',
        weight: weights.structure,
        value: analysis.metrics.structure,
        description: 'Organization and formatting',
        explanation: analysis.explanations.structure
      },
      {
        name: 'originality',
        weight: weights.originality,
        value: analysis.metrics.originality,
        description: 'Creativity and uniqueness',
        explanation: analysis.explanations.originality
      }
    ];

    // Calculate weighted score
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const weightedSum = factors.reduce((sum, factor) => sum + (factor.value * factor.weight), 0);
    const score = weightedSum / totalWeight;

    // Create breakdown
    const breakdown: Record<string, number> = {};
    factors.forEach(factor => {
      breakdown[factor.name] = factor.value * factor.weight;
    });

    // Generate explanation
    const explanation = this.generateExplanation(score, analysis, factors, weights);

    return {
      score: Math.round(score * 10000) / 10000,
      factors,
      breakdown,
      confidence: analysis.confidence,
      explanation
    };
  }

  private generateExplanation(score: number, analysis: QualityAnalysis, factors: ScoringFactor[], weights: Record<string, number>): string {
    let explanation = `Weighted quality score: ${(score * 100).toFixed(1)}%. `;

    // Add context-aware explanation
    const highWeightFactors = Object.entries(weights)
      .filter(([_, weight]) => weight > 0.15)
      .map(([name, _]) => name);

    if (highWeightFactors.length > 0) {
      explanation += `Primary focus on: ${highWeightFactors.join(', ')}. `;
    }

    if (score > 0.8) {
      explanation += 'Exceptional quality with excellent performance in key areas. ';
    } else if (score > 0.6) {
      explanation += 'Good quality with solid performance in weighted metrics. ';
    } else if (score > 0.4) {
      explanation += 'Acceptable quality but needs improvement in critical areas. ';
    } else {
      explanation += 'Below acceptable quality, significant revisions needed. ';
    }

    // Add performance in high-weight areas
    const highWeightPerformance = highWeightFactors.map(name => {
      const factor = factors.find(f => f.name === name);
      return `${name}: ${((factor?.value || 0) * 100).toFixed(1)}%`;
    }).join(', ');

    explanation += `Key metrics performance: ${highWeightPerformance}.`;

    return explanation;
  }
}

export class ScoringEngineDB {
  private algorithms: Map<string, ScoringAlgorithm> = new Map();
  private repository: ScoringResultRepository;
  private cache: Map<string, ScoringResult> = new Map();
  private config: any;
  private stats: {
    totalCalculations: number;
    cacheHits: number;
    algorithmUsage: Record<string, number>;
  };

  constructor(repository: ScoringResultRepository, scoringConfig?: any) {
    this.repository = repository;
    this.config = scoringConfig || {
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      maxSize: 1000,
      algorithm: 'quality_based'
    };
    this.stats = {
      totalCalculations: 0,
      cacheHits: 0,
      algorithmUsage: {}
    };
    this.initializeAlgorithms();
  }

  async initialize(): Promise<void> {
    console.log('Initializing Real Scoring Engine...');
    
    // Set up cache cleanup
    if (this.config.cacheEnabled) {
      setInterval(() => {
        this.cleanupCache();
      }, this.config.cacheTTL / 2); // Clean up at half TTL
    }

    console.log('Real Scoring Engine initialized');
  }

  private initializeAlgorithms(): void {
    this.registerAlgorithm(new QualityBasedAlgorithm());
    this.registerAlgorithm(new WeightedQualityAlgorithm());
  }

  registerAlgorithm(algorithm: ScoringAlgorithm): void {
    this.algorithms.set(algorithm.name, algorithm);
    console.log(`Scoring algorithm registered: ${algorithm.name}`);
  }

  async calculateScore(request: ScoringRequest): Promise<ScoringResult> {
    const algorithm = request.algorithm || this.config.algorithm;
    const scoringAlgorithm = this.algorithms.get(algorithm);

    if (!scoringAlgorithm) {
      throw new Error(`Algorithm not found: ${algorithm}`);
    }

    // Check cache
    if (this.config.cacheEnabled) {
      const cacheKey = this.generateCacheKey(request);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
    }

    try {
      // Analyze content quality
      const analysis = ContentQualityMetrics.analyzeContent(request.content, request.context);
      
      // Calculate score using algorithm
      const result = scoringAlgorithm.calculate(analysis, request.context);
      
      // Create scoring result
      const scoringResult: CreateScoringResultData = {
        entityType: request.entityType,
        entityId: request.entityId,
        score: result.score,
        algorithm: algorithm,
        factors: result.factors,
        breakdown: result.breakdown,
        confidence: result.confidence,
        explanation: result.explanation,
        metadata: {
          analysis: {
            metrics: analysis.metrics,
            issues: analysis.issues,
            strengths: analysis.strengths,
            context: request.context
          },
          calculationMethod: algorithm,
          contentLength: request.content.length,
          wordCount: request.content.split(/\s+/).length
        }
      };

      // Store in database
      const storedResult = await this.repository.create(scoringResult);
      
      // Update stats
      this.stats.totalCalculations++;
      this.stats.algorithmUsage[algorithm] = (this.stats.algorithmUsage[algorithm] || 0) + 1;

      // Cache result
      if (this.config.cacheEnabled) {
        const cacheKey = this.generateCacheKey(request);
        this.cache.set(cacheKey, storedResult);
      }

      return storedResult;
    } catch (error) {
      console.error('Scoring calculation failed:', error);
      throw new Error('Scoring calculation failed');
    }
  }

  async calculateBatch(requests: ScoringRequest[]): Promise<ScoringResult[]> {
    const batchSize = this.config.batchSize || 10;
    const results: ScoringResult[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(request => this.calculateScore(request))
      );
      results.push(...batchResults);
    }

    return results;
  }

  async getHistoricalScores(entityType: string, entityId: string): Promise<ScoringResult[]> {
    return await this.repository.findByEntity(entityType, entityId);
  }

  async compareScores(requests: ScoringRequest[]): Promise<{
    results: ScoringResult[];
    ranking: Array<{ entityType: string; entityId: string; rank: number; score: number }>;
    statistics: {
      mean: number;
      median: number;
      stdDev: number;
      min: number;
      max: number;
    };
  }> {
    const results = await this.calculateBatch(requests);
    
    // Calculate ranking
    const ranking = results
      .map(result => ({
        entityType: result.entityType,
        entityId: result.entityId,
        rank: 0,
        score: result.score
      }))
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // Calculate statistics
    const scores = results.map(r => r.score);
    const statistics = this.calculateStatistics(scores);

    return { results, ranking, statistics };
  }

  async getStatistics(): Promise<{
    total: number;
    averageScore: number;
    algorithmUsage: Record<string, number>;
    entityTypeUsage: Record<string, number>;
  }> {
    return await this.repository.getStatistics();
  }

  async getTopScores(limit: number = 10): Promise<ScoringResult[]> {
    return await this.repository.getTopScores(limit);
  }

  async getScoreTrends(entityType: string, entityId: string, days: number = 30): Promise<{
    date: string;
    averageScore: number;
    count: number;
  }[]> {
    return await this.repository.getScoreTrends(entityType, entityId, days);
  }

  private generateCacheKey(request: ScoringRequest): string {
    const keyData = {
      entityType: request.entityType,
      entityId: request.entityId,
      algorithm: request.algorithm || this.config.algorithm,
      content: request.content,
      context: request.context
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private cleanupCache(): void {
    if (this.cache.size > this.config.maxSize) {
      // Remove oldest entries (simple LRU simulation)
      const entries = Array.from(this.cache.entries());
      const toRemove = entries.slice(0, Math.floor(this.config.maxSize * 0.2));
      
      toRemove.forEach(([key]) => {
        this.cache.delete(key);
      });
    }
  }

  private calculateStatistics(scores: number[]): {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  } {
    const sorted = [...scores].sort((a, b) => a - b);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean: Math.round(mean * 10000) / 10000,
      median: Math.round(median * 10000) / 10000,
      stdDev: Math.round(stdDev * 10000) / 10000,
      min: Math.min(...scores),
      max: Math.max(...scores)
    };
  }
}
