export interface QualityMetrics {
  readability: number;
  coherence: number;
  relevance: number;
  completeness: number;
  accuracy: number;
  engagement: number;
  structure: number;
  originality: number;
}

export interface QualityAnalysis {
  metrics: QualityMetrics;
  explanations: Record<string, string>;
  confidence: number;
  issues: string[];
  strengths: string[];
}

export class ContentQualityMetrics {
  /**
   * Analyze content quality based on multiple deterministic metrics
   */
  static analyzeContent(content: string, context?: {
    prompt?: string;
    expectedLength?: number;
    topic?: string;
    audience?: string;
  }): QualityAnalysis {
    const metrics: QualityMetrics = {
      readability: this.calculateReadability(content),
      coherence: this.calculateCoherence(content),
      relevance: this.calculateRelevance(content, context?.prompt, context?.topic),
      completeness: this.calculateCompleteness(content, context?.prompt, context?.expectedLength),
      accuracy: this.calculateAccuracy(content, context),
      engagement: this.calculateEngagement(content),
      structure: this.calculateStructure(content),
      originality: this.calculateOriginality(content)
    };

    const explanations = this.generateExplanations(metrics, content, context);
    const confidence = ContentQualityMetrics.calculateConfidence(metrics, content);
    const issues = ContentQualityMetrics.identifyIssues(metrics, content);
    const strengths = ContentQualityMetrics.identifyStrengths(metrics, content);

    return {
      metrics,
      explanations,
      confidence,
      issues,
      strengths
    };
  }

  /**
   * Calculate readability score based on text complexity
   */
  private static calculateReadability(content: string): number {
    if (!content || content.trim().length === 0) return 0;

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((total, word) => total + ContentQualityMetrics.countSyllables(word), 0);

    // Flesch Reading Ease Score
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    let fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    fleschScore = Math.max(0, Math.min(100, fleschScore));

    // Convert to 0-1 scale
    return fleschScore / 100;
  }

  /**
   * Calculate coherence based on logical flow and connectivity
   */
  private static calculateCoherence(content: string): number {
    if (!content || content.trim().length === 0) return 0;

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) return 0.5; // Single sentence gets neutral score

    let coherenceScore = 0.5; // Base score
    const transitions = ['however', 'therefore', 'furthermore', 'moreover', 'consequently', 'meanwhile', 'additionally'];
    
    // Check for transition words
    const transitionCount = transitions.reduce((count, transition) => {
      const regex = new RegExp(`\\b${transition}\\b`, 'gi');
      return count + (content.match(regex) || []).length;
    }, 0);

    coherenceScore += Math.min(transitionCount * 0.1, 0.3);

    // Check pronoun consistency (simplified)
    const pronouns = ['it', 'they', 'he', 'she', 'this', 'that', 'these', 'those'];
    const pronounReferences = pronouns.reduce((count, pronoun) => {
      const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
      return count + (content.match(regex) || []).length;
    }, 0);

    coherenceScore += Math.min(pronounReferences * 0.02, 0.2);

    return Math.min(coherenceScore, 1);
  }

  /**
   * Calculate relevance based on keyword matching and topic alignment
   */
  private static calculateRelevance(content: string, prompt?: string, topic?: string): number {
    if (!content || content.trim().length === 0) return 0;

    let relevanceScore = 0.5; // Base score

    if (prompt) {
      // Extract keywords from prompt
      const promptWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const contentLower = content.toLowerCase();
      
      const matchingWords = promptWords.filter(word => contentLower.includes(word));
      relevanceScore += (matchingWords.length / promptWords.length) * 0.4;
    }

    if (topic) {
      const topicWords = topic.toLowerCase().split(/\s+/);
      const contentLower = content.toLowerCase();
      
      const matchingTopicWords = topicWords.filter(word => contentLower.includes(word));
      relevanceScore += (matchingTopicWords.length / topicWords.length) * 0.2;
    }

    return Math.min(relevanceScore, 1);
  }

  /**
   * Calculate completeness based on content length and expected coverage
   */
  private static calculateCompleteness(content: string, prompt?: string, expectedLength?: number): number {
    if (!content || content.trim().length === 0) return 0;

    let completenessScore = 0.5; // Base score

    // Length-based completeness
    const contentLength = content.trim().length;
    if (expectedLength) {
      const lengthRatio = Math.min(contentLength / expectedLength, 1);
      completenessScore += lengthRatio * 0.3;
    } else {
      // Default length expectations
      if (contentLength > 500) completenessScore += 0.3;
      else if (contentLength > 200) completenessScore += 0.2;
      else if (contentLength > 50) completenessScore += 0.1;
    }

    // Prompt-based completeness
    if (prompt) {
      const promptRequirements = ContentQualityMetrics.extractRequirements(prompt);
      const fulfilledRequirements = promptRequirements.filter(req => 
        content.toLowerCase().includes(req.toLowerCase())
      );
      
      if (promptRequirements.length > 0) {
        completenessScore += (fulfilledRequirements.length / promptRequirements.length) * 0.2;
      }
    }

    return Math.min(completenessScore, 1);
  }

  /**
   * Calculate accuracy based on factual consistency (simplified)
   */
  private static calculateAccuracy(content: string, context?: any): number {
    if (!content || content.trim().length === 0) return 0;

    let accuracyScore = 0.7; // Base score - assume reasonable accuracy unless issues found

    // Check for contradictions (simplified)
    const contradictionPatterns = [
      /\b(but|however|although|nevertheless)\b.*\b(but|however|although|nevertheless)\b/gi,
      /\b(always|never|all|none)\b.*\b(sometimes|often|usually|rarely)\b/gi
    ];

    const contradictions = contradictionPatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    if (contradictions > 0) {
      accuracyScore -= contradictions * 0.1;
    }

    // Check for uncertainty markers
    const uncertaintyMarkers = /\b(maybe|perhaps|possibly|might|could|uncertain|unsure)\b/gi;
    const uncertaintyCount = (content.match(uncertaintyMarkers) || []).length;
    const wordCount = content.split(/\s+/).length;
    const uncertaintyRatio = uncertaintyCount / wordCount;

    if (uncertaintyRatio > 0.1) {
      accuracyScore -= 0.2;
    }

    return Math.max(0, accuracyScore);
  }

  /**
   * Calculate engagement based on active voice and compelling language
   */
  private static calculateEngagement(content: string): number {
    if (!content || content.trim().length === 0) return 0;

    let engagementScore = 0.5; // Base score

    // Active voice indicators
    const activeVoicePatterns = [
      /\b(you|your|we|our)\b/gi,
      /\b(can|will|should|must)\b/gi,
      /\b(imagine|discover|explore|create|achieve)\b/gi
    ];

    const activeVoiceCount = activeVoicePatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const wordCount = content.split(/\s+/).length;
    const activeVoiceRatio = activeVoiceCount / wordCount;

    engagementScore += Math.min(activeVoiceRatio * 2, 0.3);

    // Question engagement
    const questions = (content.match(/\?/g) || []).length;
    engagementScore += Math.min(questions * 0.1, 0.2);

    return Math.min(engagementScore, 1);
  }

  /**
   * Calculate structure based on organization and formatting
   */
  private static calculateStructure(content: string): number {
    if (!content || content.trim().length === 0) return 0;

    let structureScore = 0.3; // Base score

    // Paragraph structure
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length > 1) {
      structureScore += 0.2;
    }

    // Sentence variety
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((sum, len) => sum + len, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;
    
    if (variance > 4) { // Good sentence variety
      structureScore += 0.2;
    }

    // Lists and organization
    const listPatterns = [/^\d+\./gm, /^[-*]/gm, /^[a-z]\./gm];
    const hasLists = listPatterns.some(pattern => pattern.test(content));
    if (hasLists) {
      structureScore += 0.2;
    }

    // Headings/titles
    const headings = (content.match(/^#+\s/gm) || []).length;
    if (headings > 0) {
      structureScore += Math.min(headings * 0.1, 0.1);
    }

    return Math.min(structureScore, 1);
  }

  /**
   * Calculate originality based on uniqueness and creativity
   */
  private static calculateOriginality(content: string): number {
    if (!content || content.trim().length === 0) return 0;

    let originalityScore = 0.5; // Base score

    // Check for common phrases and clichés
    const cliches = [
      /\b(at the end of the day|when all is said and done|in this day and age)\b/gi,
      /\b(think outside the box|push the envelope|raise the bar)\b/gi,
      /\b(it goes without saying|needless to say|it is what it is)\b/gi
    ];

    const clicheCount = cliches.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const wordCount = content.split(/\s+/).length;
    const clicheRatio = clicheCount / wordCount;

    if (clicheRatio > 0.05) {
      originalityScore -= 0.3;
    }

    // Vocabulary diversity
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const diversityRatio = uniqueWords.size / words.length;

    if (diversityRatio > 0.7) {
      originalityScore += 0.2;
    } else if (diversityRatio < 0.4) {
      originalityScore -= 0.2;
    }

    return Math.max(0, Math.min(originalityScore, 1));
  }

  /**
   * Generate explanations for each metric
   */
  private static generateExplanations(metrics: QualityMetrics, content: string, context?: any): Record<string, string> {
    const explanations: Record<string, string> = {};

    explanations.readability = `Readability score of ${(metrics.readability * 100).toFixed(1)}% indicates ${
      metrics.readability > 0.7 ? 'easy to understand text' :
      metrics.readability > 0.4 ? 'moderately readable text' : 'complex text that may be difficult to read'
    }.`;

    explanations.coherence = `Coherence score of ${(metrics.coherence * 100).toFixed(1)}% reflects ${
      metrics.coherence > 0.7 ? 'well-structured logical flow' :
      metrics.coherence > 0.4 ? 'moderately coherent content' : 'content that may lack clear connections'
    }.`;

    explanations.relevance = `Relevance score of ${(metrics.relevance * 100).toFixed(1)}% shows ${
      metrics.relevance > 0.7 ? 'strong alignment with requirements' :
      metrics.relevance > 0.4 ? 'moderate relevance to topic' : 'limited relevance to requirements'
    }.`;

    explanations.completeness = `Completeness score of ${(metrics.completeness * 100).toFixed(1)}% indicates ${
      metrics.completeness > 0.7 ? 'thorough coverage of topic' :
      metrics.completeness > 0.4 ? 'adequate coverage' : 'incomplete coverage'
    }.`;

    explanations.accuracy = `Accuracy score of ${(metrics.accuracy * 100).toFixed(1)}% suggests ${
      metrics.accuracy > 0.7 ? 'factually consistent content' :
      metrics.accuracy > 0.4 ? 'some accuracy concerns' : 'significant accuracy issues'
    }.`;

    explanations.engagement = `Engagement score of ${(metrics.engagement * 100).toFixed(1)}% reflects ${
      metrics.engagement > 0.7 ? 'highly engaging content' :
      metrics.engagement > 0.4 ? 'moderately engaging content' : 'content that may not capture attention'
    }.`;

    explanations.structure = `Structure score of ${(metrics.structure * 100).toFixed(1)}% shows ${
      metrics.structure > 0.7 ? 'well-organized content' :
      metrics.structure > 0.4 ? 'adequately structured content' : 'poorly organized content'
    }.`;

    explanations.originality = `Originality score of ${(metrics.originality * 100).toFixed(1)}% indicates ${
      metrics.originality > 0.7 ? 'creative and unique content' :
      metrics.originality > 0.4 ? 'moderately original content' : 'content that lacks originality'
    }.`;

    return explanations;
  }

  /**
   * Calculate overall confidence in the quality assessment
   */
  private static calculateConfidence(metrics: QualityMetrics, content: string): number {
    const metricValues = Object.values(metrics);
    const avgMetric = metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length;
    
    // Higher confidence for consistent metrics
    const variance = metricValues.reduce((sum, val) => sum + Math.pow(val - avgMetric, 2), 0) / metricValues.length;
    const consistencyScore = Math.max(0, 1 - variance);

    // Content length affects confidence
    const wordCount = content.split(/\s+/).length;
    const lengthConfidence = Math.min(wordCount / 100, 1);

    return (consistencyScore * 0.6) + (lengthConfidence * 0.4);
  }

  /**
   * Identify quality issues
   */
  private static identifyIssues(metrics: QualityMetrics, content: string): string[] {
    const issues: string[] = [];

    if (metrics.readability < 0.4) issues.push('Text may be difficult to read');
    if (metrics.coherence < 0.4) issues.push('Content lacks logical flow');
    if (metrics.relevance < 0.4) issues.push('Content may not address requirements');
    if (metrics.completeness < 0.4) issues.push('Content appears incomplete');
    if (metrics.accuracy < 0.4) issues.push('Potential accuracy issues detected');
    if (metrics.engagement < 0.4) issues.push('Content may not engage readers');
    if (metrics.structure < 0.4) issues.push('Poor organization and structure');
    if (metrics.originality < 0.4) issues.push('Content lacks originality');

    return issues;
  }

  /**
   * Identify content strengths
   */
  private static identifyStrengths(metrics: QualityMetrics, content: string): string[] {
    const strengths: string[] = [];

    if (metrics.readability > 0.7) strengths.push('Excellent readability');
    if (metrics.coherence > 0.7) strengths.push('Strong logical coherence');
    if (metrics.relevance > 0.7) strengths.push('Highly relevant content');
    if (metrics.completeness > 0.7) strengths.push('Comprehensive coverage');
    if (metrics.accuracy > 0.7) strengths.push('Factually accurate content');
    if (metrics.engagement > 0.7) strengths.push('Highly engaging content');
    if (metrics.structure > 0.7) strengths.push('Well-organized structure');
    if (metrics.originality > 0.7) strengths.push('Creative and original');

    return strengths;
  }

  /**
   * Helper methods
   */
  private static countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|le|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  private static extractRequirements(prompt: string): string[] {
    // Simple requirement extraction - look for action words and keywords
    const requirements: string[] = [];
    
    // Look for phrases like "include", "mention", "discuss", "explain"
    const patterns = [
      /(?:include|mention|discuss|explain|describe|provide|give)\s+([^,.!?]+)/gi,
      /(?:what|how|why|when|where)\s+([^,.!?]+)/gi
    ];

    patterns.forEach(pattern => {
      const matches = prompt.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const requirement = match.split(/\s+/).slice(1).join(' ').trim();
          if (requirement.length > 2) {
            requirements.push(requirement);
          }
        });
      }
    });

    return requirements;
  }
}
