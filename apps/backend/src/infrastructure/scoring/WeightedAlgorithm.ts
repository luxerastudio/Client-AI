import { ScoringFactor, ScoringResult, ScoringAlgorithm } from './ScoringEngine';

export class WeightedAlgorithm implements ScoringAlgorithm {
  name = 'weighted';

  calculate(factors: ScoringFactor[], context?: Record<string, any>): ScoringResult {
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const weightedSum = factors.reduce((sum, factor) => sum + factor.value, 0);
    const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      score: Math.round(score * 10000) / 10000,
      algorithm: this.name,
      factors: [...factors],
      breakdown: factors.reduce((acc, factor) => ({
        [factor.name]: factor.value
      }), {}),
      confidence: this.calculateConfidence(factors),
      metadata: {
        totalWeight,
        factorCount: factors.length,
        calculationMethod: 'weighted'
      },
      timestamp: new Date()
    };
  }

  validate(factors: ScoringFactor[]): boolean {
    return factors.every(factor => 
      factor.weight > 0 && 
      factor.value >= 0 && 
      factor.value <= 100
    );
  }

  calculateConfidence(factors: ScoringFactor[]): number {
    // Simple confidence calculation based on factor count and consistency
    const factorCount = factors.length;
    if (factorCount === 0) return 0;
    
    // Calculate variance in weighted values
    const values = factors.map(f => f.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    // Higher factor count and lower variance = higher confidence
    const normalizedVariance = variance / (mean * mean);
    const confidence = Math.max(0, Math.min(100, (1 - normalizedVariance) * 100));
    
    return confidence;
  }
}
