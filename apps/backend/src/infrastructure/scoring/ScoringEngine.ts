// @ts-nocheck
import { config } from '../../config';

export interface ScoringFactor {
  name: string;
  weight: number;
  value: number;
  description?: string;
}

export interface ScoringRequest {
  entityType: string;
  entityId: string;
  factors: ScoringFactor[];
  algorithm?: string;
  context?: Record<string, any>;
}

export interface ScoringResult {
  score: number;
  algorithm: string;
  factors: ScoringFactor[];
  breakdown: Record<string, number>;
  confidence: number;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface ScoringAlgorithm {
  name: string;
  calculate(factors: ScoringFactor[], context?: Record<string, any>): ScoringResult;
  validate(factors: ScoringFactor[]): boolean;
}

export class WeightedAlgorithm implements ScoringAlgorithm {
  name = 'weighted';

  calculate(factors: ScoringFactor[], context?: Record<string, any>): ScoringResult {
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const weightedSum = factors.reduce((sum, factor) => sum + (factor.value * factor.weight), 0);
    const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

    const breakdown: Record<string, number> = {};
    factors.forEach(factor => {
      breakdown[factor.name] = factor.value * factor.weight;
    });

    // Calculate confidence based on factor completeness
    const confidence = this.calculateConfidence(factors);

    return {
      score: Math.round(score * 10000) / 10000, // Round to 4 decimal places
      algorithm: this.name,
      factors: [...factors],
      breakdown,
      confidence,
      metadata: {
        totalWeight,
        factorCount: factors.length,
        calculationMethod: 'weighted_average'
      },
      timestamp: new Date()
    };
  }

  validate(factors: ScoringFactor[]): boolean {
    if (factors.length === 0) return false;

    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    return totalWeight > 0 && factors.every(factor => 
      factor.value >= 0 && factor.value <= 1 && factor.weight >= 0
    );
  }

  private calculateConfidence(factors: ScoringFactor[]): number {
    // Simple confidence calculation based on factor count and weights
    const factorCount = factors.length;
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    
    // Higher confidence with more factors and balanced weights
    const factorScore = Math.min(factorCount / 10, 1); // Max confidence at 10 factors
    const weightScore = totalWeight > 0 ? Math.min(totalWeight / 2, 1) : 0; // Max confidence at weight 2
    
    return (factorScore + weightScore) / 2;
  }
}

export class ExponentialAlgorithm implements ScoringAlgorithm {
  name = 'exponential';

  calculate(factors: ScoringFactor[], context?: Record<string, any>): ScoringResult {
    const breakdown: Record<string, number> = {};
    
    // Apply exponential weighting
    const weightedFactors = factors.map(factor => {
      const exponentialWeight = Math.exp(factor.weight);
      const weightedValue = factor.value * exponentialWeight;
      breakdown[factor.name] = weightedValue;
      return { ...factor, weightedValue, exponentialWeight };
    });

    const totalWeight = weightedFactors.reduce((sum, factor) => sum + factor.exponentialWeight, 0);
    const weightedSum = weightedFactors.reduce((sum, factor) => sum + factor.weightedValue, 0);
    const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

    const confidence = this.calculateConfidence(factors);

    return {
      score: Math.round(score * 10000) / 10000,
      algorithm: this.name,
      factors: [...factors],
      breakdown,
      confidence,
      metadata: {
        totalWeight,
        factorCount: factors.length,
        calculationMethod: 'exponential_weighted'
      },
      timestamp: new Date()
    };
  }

  validate(factors: ScoringFactor[]): boolean {
    return new WeightedAlgorithm().validate(factors);
  }

  private calculateConfidence(factors: ScoringFactor[]): number {
    return new WeightedAlgorithm().calculateConfidence(factors);
  }
}

export class ScoringEngine {
  private algorithms: Map<string, ScoringAlgorithm> = new Map();
  private cache: Map<string, ScoringResult> = new Map();
  private config: any;
  private stats: {
    totalCalculations: number;
    cacheHits: number;
    algorithmUsage: Record<string, number>;
  };

  constructor(scoringConfig?: any) {
    this.config = scoringConfig || config.scoring;
    this.stats = {
      totalCalculations: 0,
      cacheHits: 0,
      algorithmUsage: {}
    };
    this.initializeAlgorithms();
  }

  async initialize(): Promise<void> {
    console.log('Initializing Scoring Engine...');
    
    // Set up cache cleanup
    if (this.config.cacheEnabled) {
      setInterval(() => {
        this.cleanupCache();
      }, this.config.cacheTTL / 2); // Clean up at half TTL
    }

    console.log('Scoring Engine initialized');
  }

  private initializeAlgorithms(): void {
    this.registerAlgorithm(new WeightedAlgorithm());
    this.registerAlgorithm(new ExponentialAlgorithm());
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

    // Validate factors
    if (!scoringAlgorithm.validate(request.factors)) {
      throw new Error('Invalid scoring factors');
    }

    // Apply default weights if not provided
    const factors = this.applyDefaultWeights(request.factors);

    try {
      // Calculate score
      const result = scoringAlgorithm.calculate(factors, request.context);
      
      // Update stats
      this.stats.totalCalculations++;
      this.stats.algorithmUsage[algorithm] = (this.stats.algorithmUsage[algorithm] || 0) + 1;

      // Cache result
      if (this.config.cacheEnabled) {
        const cacheKey = this.generateCacheKey(request);
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Scoring calculation failed:', error);
      throw new Error('Scoring calculation failed');
    }
  }

  async calculateBatch(requests: ScoringRequest[]): Promise<ScoringResult[]> {
    const batchSize = this.config.batchSize;
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
    // Mock implementation - in production, this would query the database
    const mockResults: ScoringResult[] = [];
    
    // Generate some historical data
    for (let i = 0; i < 10; i++) {
      const factors: ScoringFactor[] = [
        { name: 'relevance', weight: 0.4, value: Math.random() },
        { name: 'quality', weight: 0.3, value: Math.random() },
        { name: 'engagement', weight: 0.2, value: Math.random() },
        { name: 'conversion', weight: 0.1, value: Math.random() }
      ];

      const algorithm = this.algorithms.get(this.config.algorithm)!;
      const result = algorithm.calculate(factors);
      
      mockResults.push({
        ...result,
        timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)) // i days ago
      });
    }

    return mockResults.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
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
        entityType: requests.find(r => 
          r.entityType === result.metadata.entityType && 
          r.entityId === result.metadata.entityId
        )?.entityType || 'unknown',
        entityId: requests.find(r => 
          r.entityType === result.metadata.entityType && 
          r.entityId === result.metadata.entityId
        )?.entityId || 'unknown',
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

  private applyDefaultWeights(factors: ScoringFactor[]): ScoringFactor[] {
    const defaultWeights = this.config.weights;
    
    return factors.map(factor => ({
      ...factor,
      weight: factor.weight || (defaultWeights[factor.name] || 0.25)
    }));
  }

  private generateCacheKey(request: ScoringRequest): string {
    const keyData = {
      entityType: request.entityType,
      entityId: request.entityId,
      algorithm: request.algorithm || this.config.algorithm,
      factors: request.factors.map(f => ({ name: f.name, value: f.value, weight: f.weight })),
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

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Test scoring with sample data
      const testRequest: ScoringRequest = {
        entityType: 'test',
        entityId: 'test-entity',
        factors: [
          { name: 'relevance', weight: 0.4, value: 0.8 },
          { name: 'quality', weight: 0.3, value: 0.7 },
          { name: 'engagement', weight: 0.2, value: 0.6 },
          { name: 'conversion', weight: 0.1, value: 0.5 }
        ]
      };

      const result = await this.calculateScore(testRequest);
      
      return {
        healthy: true,
        details: {
          algorithms: Array.from(this.algorithms.keys()),
          cacheSize: this.cache.size,
          cacheEnabled: this.config.cacheEnabled,
          stats: this.stats,
          testResult: {
            score: result.score,
            algorithm: result.algorithm,
            confidence: result.confidence
          }
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          stats: this.stats
        }
      };
    }
  }

  getStats(): any {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheEnabled: this.config.cacheEnabled,
      algorithms: Array.from(this.algorithms.keys())
    };
  }

  clearCache(): void {
    this.cache.clear();
    console.log('Scoring cache cleared');
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up Scoring Engine...');
    this.cache.clear();
    this.algorithms.clear();
    console.log('Scoring Engine cleaned up');
  }
}
