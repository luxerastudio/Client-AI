import OpenAI from 'openai';
import { QualityContext } from '@/domain/quality-scoring/entities/QualityScore';

export class RelevanceScorer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async evaluate(content: string, context: QualityContext): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }> {
    const startTime = Date.now();
    
    try {
      // Analyze keyword relevance
      const keywordRelevance = this.analyzeKeywordRelevance(content, context);
      
      // Analyze topic alignment
      const topicAlignment = await this.analyzeTopicAlignment(content, context);
      
      // Analyze audience relevance
      const audienceRelevance = await this.analyzeAudienceRelevance(content, context);
      
      // Analyze purpose relevance
      const purposeRelevance = await this.analyzePurposeRelevance(content, context);
      
      // Calculate overall relevance score
      const score = this.calculateRelevanceScore(
        keywordRelevance,
        topicAlignment,
        audienceRelevance,
        purposeRelevance
      );
      
      // Generate factors and suggestions
      const factors = this.generateRelevanceFactors(
        keywordRelevance,
        topicAlignment,
        audienceRelevance,
        purposeRelevance
      );
      
      const suggestions = this.generateRelevanceSuggestions(
        keywordRelevance,
        topicAlignment,
        audienceRelevance,
        purposeRelevance,
        score
      );
      
      return {
        score,
        factors,
        suggestions
      };
    } catch (error) {
      // Fallback to basic keyword analysis if AI analysis fails
      return this.fallbackEvaluation(content, context);
    }
  }

  private analyzeKeywordRelevance(content: string, context: QualityContext): {
    score: number;
    keywordDensity: number;
    keywordPlacement: number;
    keywordVariety: number;
  } {
    if (!context.keywords || context.keywords.length === 0) {
      return {
        score: 5, // Neutral score if no keywords provided
        keywordDensity: 0,
        keywordPlacement: 0,
        keywordVariety: 0
      };
    }

    const contentLower = content.toLowerCase();
    const words = contentLower.split(/\s+/);
    const totalWords = words.length;
    
    // Calculate keyword density
    let keywordCount = 0;
    const foundKeywords = new Set<string>();
    
    context.keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const occurrences = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
      keywordCount += occurrences;
      if (occurrences > 0) {
        foundKeywords.add(keyword);
      }
    });
    
    const keywordDensity = totalWords > 0 ? (keywordCount / totalWords) * 100 : 0;
    
    // Score keyword density (optimal range: 1-3%)
    let densityScore = 0;
    if (keywordDensity >= 1 && keywordDensity <= 3) {
      densityScore = 10;
    } else if (keywordDensity >= 0.5 && keywordDensity <= 5) {
      densityScore = 7;
    } else if (keywordDensity >= 0.1 && keywordDensity <= 7) {
      densityScore = 4;
    } else {
      densityScore = 1;
    }
    
    // Calculate keyword placement (higher score for keywords in important positions)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const firstSentence = sentences[0]?.toLowerCase() || '';
    const lastSentence = sentences[sentences.length - 1]?.toLowerCase() || '';
    
    let placementScore = 0;
    context.keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (firstSentence.includes(keywordLower)) placementScore += 3;
      if (lastSentence.includes(keywordLower)) placementScore += 2;
      if (contentLower.includes(keywordLower)) placementScore += 1;
    });
    
    placementScore = Math.min(10, placementScore / context.keywords.length);
    
    // Calculate keyword variety (how many different keywords are used)
    const varietyScore = (foundKeywords.size / context.keywords.length) * 10;
    
    // Overall keyword relevance score
    const overallScore = (densityScore * 0.4) + (placementScore * 0.4) + (varietyScore * 0.2);
    
    return {
      score: overallScore,
      keywordDensity,
      keywordPlacement: placementScore,
      keywordVariety: varietyScore
    };
  }

  private async analyzeTopicAlignment(content: string, context: QualityContext): Promise<{
    score: number;
    topicConsistency: number;
    focusScore: number;
    deviationScore: number;
  }> {
    try {
      const prompt = this.buildTopicAnalysisPrompt(content, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in content analysis. Evaluate how well the content aligns with the intended topic. Return JSON with scores (0-10) for topicConsistency, focusScore, and deviationScore.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.1
      });

      const analysis = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(analysis);
        return {
          score: (parsed.topicConsistency + parsed.focusScore + (10 - (parsed.deviationScore || 5))) / 3,
          topicConsistency: parsed.topicConsistency || 5,
          focusScore: parsed.focusScore || 5,
          deviationScore: parsed.deviationScore || 5
        };
      } catch {
        return {
          score: 5,
          topicConsistency: 5,
          focusScore: 5,
          deviationScore: 5
        };
      }
    } catch (error) {
      return {
        score: 5,
        topicConsistency: 5,
        focusScore: 5,
        deviationScore: 5
      };
    }
  }

  private async analyzeAudienceRelevance(content: string, context: QualityContext): Promise<{
    score: number;
    languageComplexity: number;
    contentAppropriateness: number;
    engagementLevel: number;
  }> {
    try {
      const prompt = this.buildAudienceAnalysisPrompt(content, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in audience analysis. Evaluate how well the content matches the target audience. Return JSON with scores (0-10) for languageComplexity, contentAppropriateness, and engagementLevel.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.1
      });

      const analysis = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(analysis);
        return {
          score: ((parsed.languageComplexity || 5) + (parsed.contentAppropriateness || 5) + (parsed.engagementLevel || 5)) / 3,
          languageComplexity: parsed.languageComplexity || 5,
          contentAppropriateness: parsed.contentAppropriateness || 5,
          engagementLevel: parsed.engagementLevel || 5
        };
      } catch {
        return {
          score: 5,
          languageComplexity: 5,
          contentAppropriateness: 5,
          engagementLevel: 5
        };
      }
    } catch (error) {
      return {
        score: 5,
        languageComplexity: 5,
        contentAppropriateness: 5,
        engagementLevel: 5
      };
    }
  }

  private async analyzePurposeRelevance(content: string, context: QualityContext): Promise<{
    score: number;
    goalAlignment: number;
    effectiveness: number;
    callToActionScore: number;
  }> {
    try {
      const prompt = this.buildPurposeAnalysisPrompt(content, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in content strategy. Evaluate how well the content achieves its intended purpose. Return JSON with scores (0-10) for goalAlignment, effectiveness, and callToActionScore.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.1
      });

      const analysis = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(analysis);
        return {
          score: ((parsed.goalAlignment || 5) + (parsed.effectiveness || 5) + (parsed.callToActionScore || 5)) / 3,
          goalAlignment: parsed.goalAlignment || 5,
          effectiveness: parsed.effectiveness || 5,
          callToActionScore: parsed.callToActionScore || 5
        };
      } catch {
        return {
          score: 5,
          goalAlignment: 5,
          effectiveness: 5,
          callToActionScore: 5
        };
      }
    } catch (error) {
      return {
        score: 5,
        goalAlignment: 5,
        effectiveness: 5,
        callToActionScore: 5
      };
    }
  }

  private buildTopicAnalysisPrompt(content: string, context: QualityContext): string {
    let prompt = `Analyze the topic alignment of this content:\n\n"${content}"\n\n`;
    
    if (context.purpose) {
      prompt += `Intended Topic: ${context.purpose}\n`;
    }
    
    prompt += `\nEvaluate and return JSON with:
- topicConsistency (0-10): How consistently the content stays on topic
- focusScore (0-10): How well it maintains focus on the main subject
- deviationScore (0-10): How much it deviates from the intended topic (lower is better)`;
    
    return prompt;
  }

  private buildAudienceAnalysisPrompt(content: string, context: QualityContext): string {
    let prompt = `Analyze the audience relevance of this content:\n\n"${content}"\n\n`;
    
    if (context.targetAudience) {
      prompt += `Target Audience: ${context.targetAudience}\n`;
    }
    
    if (context.tone) {
      prompt += `Desired Tone: ${context.tone}\n`;
    }
    
    prompt += `\nEvaluate and return JSON with:
- languageComplexity (0-10): Appropriateness of language complexity for the audience
- contentAppropriateness (0-10): How well the content matches audience interests
- engagementLevel (0-10): How engaging the content is for the target audience`;
    
    return prompt;
  }

  private buildPurposeAnalysisPrompt(content: string, context: QualityContext): string {
    let prompt = `Analyze the purpose relevance of this content:\n\n"${content}"\n\n`;
    
    if (context.purpose) {
      prompt += `Purpose: ${context.purpose}\n`;
    }
    
    if (context.contentType) {
      prompt += `Content Type: ${context.contentType}\n`;
    }
    
    prompt += `\nEvaluate and return JSON with:
- goalAlignment (0-10): How well the content aligns with its purpose
- effectiveness (0-10): How effective it is at achieving its goals
- callToActionScore (0-10): Quality and clarity of any call to action`;
    
    return prompt;
  }

  private calculateRelevanceScore(
    keywordRelevance: any,
    topicAlignment: any,
    audienceRelevance: any,
    purposeRelevance: any
  ): number {
    const weights = {
      keywords: 0.25,
      topic: 0.3,
      audience: 0.25,
      purpose: 0.2
    };
    
    const score = 
      keywordRelevance.score * weights.keywords +
      ((topicAlignment.topicConsistency + topicAlignment.focusScore + (10 - topicAlignment.deviationScore)) / 3) * weights.topic +
      ((audienceRelevance.languageComplexity + audienceRelevance.contentAppropriateness + audienceRelevance.engagementLevel) / 3) * weights.audience +
      ((purposeRelevance.goalAlignment + purposeRelevance.effectiveness + purposeRelevance.callToActionScore) / 3) * weights.purpose;
    
    return Math.min(10, Math.max(0, score));
  }

  private generateRelevanceFactors(
    keywordRelevance: any,
    topicAlignment: any,
    audienceRelevance: any,
    purposeRelevance: any
  ): string[] {
    const factors: string[] = [];
    
    // Keyword factors
    if (keywordRelevance.score >= 8) {
      factors.push('Excellent keyword integration');
    } else if (keywordRelevance.score < 5) {
      factors.push('Poor keyword usage');
    }
    
    if (keywordRelevance.keywordDensity >= 1 && keywordRelevance.keywordDensity <= 3) {
      factors.push('Optimal keyword density');
    } else {
      factors.push('Suboptimal keyword density');
    }
    
    // Topic factors
    if (topicAlignment.topicConsistency >= 8) {
      factors.push('Strong topic consistency');
    } else if (topicAlignment.topicConsistency < 5) {
      factors.push('Weak topic consistency');
    }
    
    if (topicAlignment.focusScore >= 8) {
      factors.push('Excellent focus on main topic');
    } else if (topicAlignment.focusScore < 5) {
      factors.push('Poor focus on main topic');
    }
    
    // Audience factors
    if (audienceRelevance.contentAppropriateness >= 8) {
      factors.push('Content well-suited for audience');
    } else if (audienceRelevance.contentAppropriateness < 5) {
      factors.push('Content not well-suited for audience');
    }
    
    // Purpose factors
    if (purposeRelevance.goalAlignment >= 8) {
      factors.push('Strong alignment with purpose');
    } else if (purposeRelevance.goalAlignment < 5) {
      factors.push('Weak alignment with purpose');
    }
    
    return factors;
  }

  private generateRelevanceSuggestions(
    keywordRelevance: any,
    topicAlignment: any,
    audienceRelevance: any,
    purposeRelevance: any,
    score: number
  ): string[] {
    const suggestions: string[] = [];
    
    if (score < 7) {
      // Keyword suggestions
      if (keywordRelevance.score < 6) {
        if (keywordRelevance.keywordDensity < 1) {
          suggestions.push('Increase keyword density for better relevance');
        } else if (keywordRelevance.keywordDensity > 5) {
          suggestions.push('Reduce keyword density to avoid over-optimization');
        }
        
        if (keywordRelevance.keywordPlacement < 5) {
          suggestions.push('Place keywords in more strategic positions (intro, conclusion)');
        }
      }
      
      // Topic suggestions
      if (topicAlignment.topicConsistency < 6) {
        suggestions.push('Maintain better focus on the main topic');
      }
      
      if (topicAlignment.focusScore < 6) {
        suggestions.push('Reduce tangential content and stay focused');
      }
      
      // Audience suggestions
      if (audienceRelevance.contentAppropriateness < 6) {
        suggestions.push('Adjust content to better match target audience');
      }
      
      if (audienceRelevance.engagementLevel < 6) {
        suggestions.push('Make content more engaging for the audience');
      }
      
      // Purpose suggestions
      if (purposeRelevance.goalAlignment < 6) {
        suggestions.push('Ensure content better achieves its intended purpose');
      }
      
      if (purposeRelevance.effectiveness < 6) {
        suggestions.push('Improve content effectiveness for its goals');
      }
    }
    
    return suggestions;
  }

  private fallbackEvaluation(content: string, context: QualityContext): {
    score: number;
    factors: string[];
    suggestions: string[];
  } {
    const keywordRelevance = this.analyzeKeywordRelevance(content, context);
    
    return {
      score: keywordRelevance.score,
      factors: keywordRelevance.score >= 7 ? ['Good keyword relevance'] : ['Poor keyword relevance'],
      suggestions: keywordRelevance.score < 7 ? ['Improve keyword integration and topic focus'] : []
    };
  }
}
