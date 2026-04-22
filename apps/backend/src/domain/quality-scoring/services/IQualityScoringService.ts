import { QualityScore, QualityEvaluationRequest, QualityResult, QualityContext, QualityThresholds } from '../entities/QualityScore';

export interface IQualityScoringService {
  // Main evaluation method
  evaluate(request: QualityEvaluationRequest): Promise<QualityScore>;
  
  // Individual metric evaluation
  evaluateClarity(content: string, context?: QualityContext): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }>;
  
  evaluateRelevance(content: string, context: QualityContext): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }>;
  
  evaluateDepth(content: string, context?: QualityContext): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }>;
  
  evaluateUsefulness(content: string, context: QualityContext): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }>;
  
  // Regeneration logic
  shouldRegenerate(score: QualityScore, thresholds?: QualityThresholds): boolean;
  
  // Batch evaluation
  evaluateBatch(requests: QualityEvaluationRequest[]): Promise<QualityScore[]>;
  
  // Quality improvement suggestions
  getImprovementSuggestions(score: QualityScore): Promise<{
    priority: string[];
    detailed: Array<{
      metric: string;
      suggestion: string;
      impact: number;
    }>;
  }>;
}

export interface IQualityRegenerator {
  regenerate(
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
  }>;
  
  // Regeneration strategies
  improveClarity(content: string, feedback: QualityScore): Promise<string>;
  improveRelevance(content: string, feedback: QualityScore, context: QualityContext): Promise<string>;
  improveDepth(content: string, feedback: QualityScore): Promise<string>;
  improveUsefulness(content: string, feedback: QualityScore, context: QualityContext): Promise<string>;
}

export interface IQualityMetrics {
  calculateReadability(content: string): number;
  calculateComplexity(content: string): number;
  calculateEngagement(content: string): number;
  calculateStructure(content: string): number;
  getBasicMetrics(content: string): {
    wordCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    paragraphCount: number;
  };
}

export interface IQualityThresholds {
  getDefaultThresholds(): QualityThresholds;
  getThresholdsForContentType(contentType: string): QualityThresholds;
  getCustomThresholds(config: Partial<QualityThresholds>): QualityThresholds;
}

export interface IQualityAnalyzer {
  analyzeContent(content: string): Promise<{
    structure: any;
    patterns: any;
    issues: any;
    strengths: any;
  }>;
  
  detectIssues(content: string): Promise<Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }>>;
  
  identifyStrengths(content: string): Promise<Array<{
    type: string;
    description: string;
    impact: number;
  }>>;
}

export interface IQualityReporter {
  generateReport(score: QualityScore): Promise<{
    summary: string;
    detailedAnalysis: Record<string, any>;
    recommendations: string[];
    grade: string;
  }>;
  
  compareScores(scores: QualityScore[]): Promise<{
    comparison: Record<string, any>;
    trends: Record<string, number>;
    improvements: string[];
  }>;
  
  exportResults(scores: QualityScore[], format: 'json' | 'csv' | 'pdf'): Promise<{
    data: string | Buffer;
    filename: string;
  }>;
}

export interface IQualityCache {
  get(content: string): Promise<QualityScore | null>;
  set(content: string, score: QualityScore, ttl?: number): Promise<void>;
  invalidate(content: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<{
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  }>;
}

export interface IQualityConfig {
  scoringWeights: {
    clarity: number;
    relevance: number;
    depth: number;
    usefulness: number;
  };
  thresholds: QualityThresholds;
  regeneration: {
    enabled: boolean;
    maxAttempts: number;
    improvementThreshold: number;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  ai: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}
