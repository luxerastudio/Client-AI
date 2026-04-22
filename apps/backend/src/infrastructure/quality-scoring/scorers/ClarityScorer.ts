import OpenAI from 'openai';
import { QualityContext } from '@/domain/quality-scoring/entities/QualityScore';

export class ClarityScorer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async evaluate(content: string, context?: QualityContext): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }> {
    const startTime = Date.now();
    
    try {
      // Get basic metrics
      const metrics = this.calculateBasicMetrics(content);
      
      // Use AI for semantic clarity analysis
      const aiAnalysis = await this.analyzeSemanticClarity(content, context);
      
      // Calculate overall clarity score
      const score = this.calculateClarityScore(metrics, aiAnalysis);
      
      // Generate factors and suggestions
      const factors = this.generateClarityFactors(metrics, aiAnalysis);
      const suggestions = this.generateClaritySuggestions(metrics, aiAnalysis, score);
      
      return {
        score,
        factors,
        suggestions
      };
    } catch (error) {
      // Fallback to basic metrics if AI analysis fails
      return this.fallbackEvaluation(content);
    }
  }

  private calculateBasicMetrics(content: string): {
    avgSentenceLength: number;
    avgWordLength: number;
    readabilityScore: number;
    complexityScore: number;
    structureScore: number;
    consistencyScore: number;
  } {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    // Average sentence length
    const avgSentenceLength = sentences.length > 0 
      ? words.length / sentences.length 
      : 0;
    
    // Average word length
    const avgWordLength = words.length > 0
      ? words.reduce((sum, word) => sum + word.length, 0) / words.length
      : 0;
    
    // Readability score (simplified Flesch-Kincaid)
    const readabilityScore = this.calculateReadability(content);
    
    // Complexity score based on sentence structure
    const complexityScore = this.calculateComplexity(sentences);
    
    // Structure score based on paragraph organization
    const structureScore = this.calculateStructure(content, paragraphs);
    
    // Consistency score based on tone and style
    const consistencyScore = this.calculateConsistency(content);
    
    return {
      avgSentenceLength,
      avgWordLength,
      readabilityScore,
      complexityScore,
      structureScore,
      consistencyScore
    };
  }

  private calculateReadability(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    // Simplified Flesch Reading Ease formula
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    const readabilityScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    
    // Convert to 0-10 scale
    return Math.max(0, Math.min(10, readabilityScore / 10));
  }

  private calculateComplexity(sentences: string[]): number {
    let complexSentences = 0;
    
    sentences.forEach(sentence => {
      const words = sentence.split(/\s+/);
      const clauses = sentence.split(/[,;]/).length;
      const hasSubordinateClause = words.some(word => 
        ['because', 'although', 'since', 'while', 'if', 'when', 'where'].includes(word.toLowerCase())
      );
      
      // Consider sentence complex if it has multiple clauses or subordinate clauses
      if (clauses > 1 || hasSubordinateClause || words.length > 20) {
        complexSentences++;
      }
    });
    
    const complexityRatio = sentences.length > 0 ? complexSentences / sentences.length : 0;
    
    // Score based on appropriate complexity (not too simple, not too complex)
    if (complexityRatio < 0.2) return 3; // Too simple
    if (complexityRatio > 0.7) return 4; // Too complex
    return Math.min(10, 5 + complexityRatio * 5); // Good balance
  }

  private calculateStructure(content: string, paragraphs: string[]): number {
    let score = 5; // Base score
    
    // Check for logical flow
    const hasIntroduction = content.length > 0;
    const hasConclusion = content.trim().endsWith('.') || content.trim().endsWith('!');
    
    // Check paragraph structure
    if (paragraphs.length >= 2 && paragraphs.length <= 5) {
      score += 2; // Good paragraph count
    } else if (paragraphs.length === 1) {
      score -= 2; // No paragraph breaks
    }
    
    // Check for transitions
    const transitionWords = ['however', 'therefore', 'furthermore', 'moreover', 'in addition', 'consequently'];
    const hasTransitions = transitionWords.some(word => 
      content.toLowerCase().includes(word)
    );
    
    if (hasTransitions) score += 1;
    if (hasIntroduction) score += 1;
    if (hasConclusion) score += 1;
    
    return Math.min(10, Math.max(0, score));
  }

  private calculateConsistency(content: string): number {
    // Simple consistency check based on sentence length variation
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    
    if (sentenceLengths.length === 0) return 0;
    
    const avgLength = sentenceLengths.reduce((sum, len) => sum + len, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower variance = higher consistency
    const consistencyScore = Math.max(0, 10 - standardDeviation);
    
    return Math.min(10, consistencyScore);
  }

  private async analyzeSemanticClarity(content: string, context?: QualityContext): Promise<{
    semanticCoherence: number;
    logicalFlow: number;
    audienceAppropriateness: number;
    purposeAlignment: number;
  }> {
    try {
      const prompt = this.buildClarityAnalysisPrompt(content, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in content analysis. Evaluate the clarity of the given content and provide scores (0-10) for semantic coherence, logical flow, audience appropriateness, and purpose alignment. Return as JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      });

      const content_analysis = response.choices[0]?.message?.content || '{}';
      
      try {
        const analysis = JSON.parse(content_analysis);
        return {
          semanticCoherence: analysis.semanticCoherence || 5,
          logicalFlow: analysis.logicalFlow || 5,
          audienceAppropriateness: analysis.audienceAppropriateness || 5,
          purposeAlignment: analysis.purposeAlignment || 5
        };
      } catch {
        return {
          semanticCoherence: 5,
          logicalFlow: 5,
          audienceAppropriateness: 5,
          purposeAlignment: 5
        };
      }
    } catch (error) {
      // Return default scores if AI analysis fails
      return {
        semanticCoherence: 5,
        logicalFlow: 5,
        audienceAppropriateness: 5,
        purposeAlignment: 5
      };
    }
  }

  private buildClarityAnalysisPrompt(content: string, context?: QualityContext): string {
    let prompt = `Analyze the clarity of this content:\n\n"${content}"\n\n`;
    
    if (context) {
      if (context.targetAudience) {
        prompt += `Target Audience: ${context.targetAudience}\n`;
      }
      if (context.purpose) {
        prompt += `Purpose: ${context.purpose}\n`;
      }
      if (context.tone) {
        prompt += `Desired Tone: ${context.tone}\n`;
      }
      if (context.contentType) {
        prompt += `Content Type: ${context.contentType}\n`;
      }
    }
    
    prompt += `\nEvaluate and return JSON with:
- semanticCoherence (0-10): How well ideas connect and flow
- logicalFlow (0-10): Logical progression of arguments
- audienceAppropriateness (0-10): Suitability for target audience
- purposeAlignment (0-10): How well it achieves its purpose`;
    
    return prompt;
  }

  private calculateClarityScore(metrics: any, aiAnalysis: any): number {
    const weights = {
      readability: 0.2,
      complexity: 0.15,
      structure: 0.15,
      consistency: 0.15,
      semanticCoherence: 0.15,
      logicalFlow: 0.1,
      audienceAppropriateness: 0.05,
      purposeAlignment: 0.05
    };
    
    const score = 
      metrics.readabilityScore * weights.readability +
      metrics.complexityScore * weights.complexity +
      metrics.structureScore * weights.structure +
      metrics.consistencyScore * weights.consistency +
      aiAnalysis.semanticCoherence * weights.semanticCoherence +
      aiAnalysis.logicalFlow * weights.logicalFlow +
      aiAnalysis.audienceAppropriateness * weights.audienceAppropriateness +
      aiAnalysis.purposeAlignment * weights.purposeAlignment;
    
    return Math.min(10, Math.max(0, score));
  }

  private generateClarityFactors(metrics: any, aiAnalysis: any): string[] {
    const factors: string[] = [];
    
    if (metrics.readabilityScore >= 8) {
      factors.push('High readability score');
    } else if (metrics.readabilityScore < 5) {
      factors.push('Low readability - complex sentences');
    }
    
    if (metrics.avgSentenceLength > 20) {
      factors.push('Sentences are too long');
    } else if (metrics.avgSentenceLength < 10) {
      factors.push('Sentences are very short');
    }
    
    if (metrics.structureScore >= 8) {
      factors.push('Well-structured content');
    } else if (metrics.structureScore < 5) {
      factors.push('Poor organization');
    }
    
    if (aiAnalysis.semanticCoherence >= 8) {
      factors.push('Excellent semantic coherence');
    } else if (aiAnalysis.semanticCoherence < 5) {
      factors.push('Weak semantic coherence');
    }
    
    if (aiAnalysis.logicalFlow >= 8) {
      factors.push('Strong logical flow');
    } else if (aiAnalysis.logicalFlow < 5) {
      factors.push('Poor logical progression');
    }
    
    return factors;
  }

  private generateClaritySuggestions(metrics: any, aiAnalysis: any, score: number): string[] {
    const suggestions: string[] = [];
    
    if (score < 7) {
      if (metrics.avgSentenceLength > 20) {
        suggestions.push('Break down long sentences for better readability');
      }
      
      if (metrics.readabilityScore < 6) {
        suggestions.push('Use simpler language and shorter sentences');
      }
      
      if (metrics.structureScore < 6) {
        suggestions.push('Improve content organization with clear paragraphs');
      }
      
      if (aiAnalysis.logicalFlow < 6) {
        suggestions.push('Add transition words to improve flow');
      }
      
      if (aiAnalysis.semanticCoherence < 6) {
        suggestions.push('Ensure ideas connect logically');
      }
    }
    
    if (metrics.complexityScore < 5) {
      suggestions.push('Add more complex sentence structures for variety');
    } else if (metrics.complexityScore > 8) {
      suggestions.push('Simplify some complex sentences');
    }
    
    return suggestions;
  }

  private fallbackEvaluation(content: string): {
    score: number;
    factors: string[];
    suggestions: string[];
  } {
    const metrics = this.calculateBasicMetrics(content);
    const score = (metrics.readabilityScore + metrics.structureScore + metrics.consistencyScore) / 3;
    
    return {
      score,
      factors: this.generateClarityFactors(metrics, {
        semanticCoherence: 5,
        logicalFlow: 5,
        audienceAppropriateness: 5,
        purposeAlignment: 5
      }),
      suggestions: score < 7 ? ['Consider improving content structure and readability'] : []
    };
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }
}
