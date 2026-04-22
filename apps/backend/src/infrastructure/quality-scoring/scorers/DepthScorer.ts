import OpenAI from 'openai';
import { QualityContext } from '@/domain/quality-scoring/entities/QualityScore';

export class DepthScorer {
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
      // Analyze content depth through multiple dimensions
      const conceptualDepth = await this.analyzeConceptualDepth(content, context);
      const analyticalDepth = await this.analyzeAnalyticalDepth(content, context);
      const informationalDepth = await this.analyzeInformationalDepth(content, context);
      const structuralDepth = this.analyzeStructuralDepth(content);
      
      // Calculate overall depth score
      const score = this.calculateDepthScore(
        conceptualDepth,
        analyticalDepth,
        informationalDepth,
        structuralDepth
      );
      
      // Generate factors and suggestions
      const factors = this.generateDepthFactors(
        conceptualDepth,
        analyticalDepth,
        informationalDepth,
        structuralDepth
      );
      
      const suggestions = this.generateDepthSuggestions(
        conceptualDepth,
        analyticalDepth,
        informationalDepth,
        structuralDepth,
        score
      );
      
      return {
        score,
        factors,
        suggestions
      };
    } catch (error) {
      // Fallback to basic analysis if AI analysis fails
      return this.fallbackEvaluation(content, context);
    }
  }

  private async analyzeConceptualDepth(content: string, context?: QualityContext): Promise<{
    score: number;
    complexityLevel: number;
    abstractReasoning: number;
    conceptualConnections: number;
  }> {
    try {
      const prompt = this.buildConceptualDepthPrompt(content, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in content analysis. Evaluate the conceptual depth of the content. Return JSON with scores (0-10) for complexityLevel, abstractReasoning, and conceptualConnections.'
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
          score: ((parsed.complexityLevel || 5) + (parsed.abstractReasoning || 5) + (parsed.conceptualConnections || 5)) / 3,
          complexityLevel: parsed.complexityLevel || 5,
          abstractReasoning: parsed.abstractReasoning || 5,
          conceptualConnections: parsed.conceptualConnections || 5
        };
      } catch {
        return {
          score: 5,
          complexityLevel: 5,
          abstractReasoning: 5,
          conceptualConnections: 5
        };
      }
    } catch (error) {
      return {
        score: 5,
        complexityLevel: 5,
        abstractReasoning: 5,
        conceptualConnections: 5
      };
    }
  }

  private async analyzeAnalyticalDepth(content: string, context?: QualityContext): Promise<{
    score: number;
    criticalThinking: number;
    evidenceUsage: number;
    reasoningQuality: number;
  }> {
    try {
      const prompt = this.buildAnalyticalDepthPrompt(content, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in critical thinking analysis. Evaluate the analytical depth of the content. Return JSON with scores (0-10) for criticalThinking, evidenceUsage, and reasoningQuality.'
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
          score: ((parsed.criticalThinking || 5) + (parsed.evidenceUsage || 5) + (parsed.reasoningQuality || 5)) / 3,
          criticalThinking: parsed.criticalThinking || 5,
          evidenceUsage: parsed.evidenceUsage || 5,
          reasoningQuality: parsed.reasoningQuality || 5
        };
      } catch {
        return {
          score: 5,
          criticalThinking: 5,
          evidenceUsage: 5,
          reasoningQuality: 5
        };
      }
    } catch (error) {
      return {
        score: 5,
        criticalThinking: 5,
        evidenceUsage: 5,
        reasoningQuality: 5
      };
    }
  }

  private async analyzeInformationalDepth(content: string, context?: QualityContext): Promise<{
    score: number;
    detailLevel: number;
    comprehensiveness: number;
    expertiseDemonstration: number;
  }> {
    try {
      const prompt = this.buildInformationalDepthPrompt(content, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in content evaluation. Analyze the informational depth of the content. Return JSON with scores (0-10) for detailLevel, comprehensiveness, and expertiseDemonstration.'
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
          score: ((parsed.detailLevel || 5) + (parsed.comprehensiveness || 5) + (parsed.expertiseDemonstration || 5)) / 3,
          detailLevel: parsed.detailLevel || 5,
          comprehensiveness: parsed.comprehensiveness || 5,
          expertiseDemonstration: parsed.expertiseDemonstration || 5
        };
      } catch {
        return {
          score: 5,
          detailLevel: 5,
          comprehensiveness: 5,
          expertiseDemonstration: 5
        };
      }
    } catch (error) {
      return {
        score: 5,
        detailLevel: 5,
        comprehensiveness: 5,
        expertiseDemonstration: 5
      };
    }
  }

  private analyzeStructuralDepth(content: string): {
    score: number;
    organizationComplexity: number;
    logicalHierarchy: number;
    contentLayering: number;
  } {
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    // Calculate organization complexity
    const paragraphCount = paragraphs.length;
    const avgParagraphLength = paragraphCount > 0 ? words.length / paragraphCount : 0;
    
    let organizationScore = 0;
    if (paragraphCount >= 3 && paragraphCount <= 7) organizationScore += 3;
    if (avgParagraphLength >= 50 && avgParagraphLength <= 200) organizationScore += 2;
    
    // Check for headings and structure indicators
    const hasHeadings = content.includes('#') || content.includes('##') || content.includes('###');
    if (hasHeadings) organizationScore += 2;
    
    // Check for logical flow indicators
    const transitionWords = ['therefore', 'however', 'furthermore', 'consequently', 'moreover'];
    const transitionCount = transitionWords.filter(word => 
      content.toLowerCase().includes(word)
    ).length;
    organizationScore += Math.min(3, transitionCount);
    
    // Calculate logical hierarchy
    const hierarchicalStructure = this.analyzeHierarchicalStructure(content);
    
    // Calculate content layering
    const layeringScore = this.analyzeContentLayering(content, paragraphs);
    
    const overallScore = (organizationScore + hierarchicalStructure + layeringScore) / 3;
    
    return {
      score: Math.min(10, overallScore),
      organizationComplexity: organizationScore,
      logicalHierarchy: hierarchicalStructure,
      contentLayering: layeringScore
    };
  }

  private analyzeHierarchicalStructure(content: string): number {
    let score = 5; // Base score
    
    // Check for main points and sub-points
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const mainPointIndicators = ['firstly', 'secondly', 'finally', 'in conclusion', 'to summarize'];
    const subPointIndicators = ['additionally', 'furthermore', 'moreover', 'in addition'];
    
    const mainPoints = mainPointIndicators.filter(indicator => 
      content.toLowerCase().includes(indicator)
    ).length;
    
    const subPoints = subPointIndicators.filter(indicator => 
      content.toLowerCase().includes(indicator)
    ).length;
    
    if (mainPoints >= 2) score += 2;
    if (subPoints >= 2) score += 2;
    if (mainPoints + subPoints >= 4) score += 1;
    
    return Math.min(10, score);
  }

  private analyzeContentLayering(content: string, paragraphs: string[]): number {
    let score = 5; // Base score
    
    // Analyze paragraph progression
    if (paragraphs.length >= 2) {
      // Check if paragraphs build upon each other
      const firstParagraph = paragraphs[0].toLowerCase();
      const lastParagraph = paragraphs[paragraphs.length - 1].toLowerCase();
      
      // Look for progression indicators
      const progressionWords = ['building on', 'expanding on', 'furthermore', 'additionally'];
      const hasProgression = progressionWords.some(word => content.toLowerCase().includes(word));
      
      if (hasProgression) score += 2;
      
      // Check for conclusion that builds upon earlier content
      const conclusionWords = ['in conclusion', 'therefore', 'thus', 'consequently'];
      const hasConclusion = conclusionWords.some(word => lastParagraph.includes(word));
      
      if (hasConclusion) score += 1;
    }
    
    // Check for depth development
    const avgSentenceLength = content.split(/\s+/).length / content.split(/[.!?]+/).length;
    if (avgSentenceLength > 15 && avgSentenceLength < 25) score += 2;
    
    return Math.min(10, score);
  }

  private buildConceptualDepthPrompt(content: string, context?: QualityContext): string {
    let prompt = `Analyze the conceptual depth of this content:\n\n"${content}"\n\n`;
    
    if (context?.contentType) {
      prompt += `Content Type: ${context.contentType}\n`;
    }
    
    if (context?.domain) {
      prompt += `Domain: ${context.domain}\n`;
    }
    
    prompt += `\nEvaluate and return JSON with:
- complexityLevel (0-10): How complex the concepts are
- abstractReasoning (0-10): Level of abstract thinking demonstrated
- conceptualConnections (0-10): How well concepts are connected`;
    
    return prompt;
  }

  private buildAnalyticalDepthPrompt(content: string, context?: QualityContext): string {
    let prompt = `Analyze the analytical depth of this content:\n\n"${content}"\n\n`;
    
    if (context?.purpose) {
      prompt += `Purpose: ${context.purpose}\n`;
    }
    
    prompt += `\nEvaluate and return JSON with:
- criticalThinking (0-10): Quality of critical analysis
- evidenceUsage (0-10): How well evidence is used to support claims
- reasoningQuality (0-10): Logical reasoning quality`;
    
    return prompt;
  }

  private buildInformationalDepthPrompt(content: string, context?: QualityContext): string {
    let prompt = `Analyze the informational depth of this content:\n\n"${content}"\n\n`;
    
    if (context?.targetAudience) {
      prompt += `Target Audience: ${context.targetAudience}\n`;
    }
    
    prompt += `\nEvaluate and return JSON with:
- detailLevel (0-10): Level of detail provided
- comprehensiveness (0-10): How comprehensive the coverage is
- expertiseDemonstration (0-10): Level of expertise demonstrated`;
    
    return prompt;
  }

  private calculateDepthScore(
    conceptualDepth: any,
    analyticalDepth: any,
    informationalDepth: any,
    structuralDepth: any
  ): number {
    const weights = {
      conceptual: 0.3,
      analytical: 0.25,
      informational: 0.25,
      structural: 0.2
    };
    
    const score = 
      conceptualDepth.score * weights.conceptual +
      analyticalDepth.score * weights.analytical +
      informationalDepth.score * weights.informational +
      structuralDepth.score * weights.structural;
    
    return Math.min(10, Math.max(0, score));
  }

  private generateDepthFactors(
    conceptualDepth: any,
    analyticalDepth: any,
    informationalDepth: any,
    structuralDepth: any
  ): string[] {
    const factors: string[] = [];
    
    // Conceptual factors
    if (conceptualDepth.score >= 8) {
      factors.push('Strong conceptual depth');
    } else if (conceptualDepth.score < 5) {
      factors.push('Weak conceptual depth');
    }
    
    if (conceptualDepth.complexityLevel >= 8) {
      factors.push('Complex concepts handled well');
    } else if (conceptualDepth.complexityLevel < 5) {
      factors.push('Concepts lack complexity');
    }
    
    // Analytical factors
    if (analyticalDepth.score >= 8) {
      factors.push('Excellent analytical reasoning');
    } else if (analyticalDepth.score < 5) {
      factors.push('Poor analytical reasoning');
    }
    
    if (analyticalDepth.criticalThinking >= 8) {
      factors.push('Strong critical thinking');
    } else if (analyticalDepth.criticalThinking < 5) {
      factors.push('Weak critical thinking');
    }
    
    // Informational factors
    if (informationalDepth.score >= 8) {
      factors.push('Comprehensive information');
    } else if (informationalDepth.score < 5) {
      factors.push('Insufficient information');
    }
    
    if (informationalDepth.detailLevel >= 8) {
      factors.push('Excellent level of detail');
    } else if (informationalDepth.detailLevel < 5) {
      factors.push('Lacks sufficient detail');
    }
    
    // Structural factors
    if (structuralDepth.score >= 8) {
      factors.push('Well-structured depth');
    } else if (structuralDepth.score < 5) {
      factors.push('Poor structural organization');
    }
    
    return factors;
  }

  private generateDepthSuggestions(
    conceptualDepth: any,
    analyticalDepth: any,
    informationalDepth: any,
    structuralDepth: any,
    score: number
  ): string[] {
    const suggestions: string[] = [];
    
    if (score < 7) {
      // Conceptual suggestions
      if (conceptualDepth.score < 6) {
        if (conceptualDepth.complexityLevel < 6) {
          suggestions.push('Introduce more complex concepts and ideas');
        }
        if (conceptualDepth.abstractReasoning < 6) {
          suggestions.push('Include more abstract reasoning and theoretical frameworks');
        }
        if (conceptualDepth.conceptualConnections < 6) {
          suggestions.push('Better connect and relate different concepts');
        }
      }
      
      // Analytical suggestions
      if (analyticalDepth.score < 6) {
        if (analyticalDepth.criticalThinking < 6) {
          suggestions.push('Strengthen critical thinking and analysis');
        }
        if (analyticalDepth.evidenceUsage < 6) {
          suggestions.push('Provide more evidence to support claims');
        }
        if (analyticalDepth.reasoningQuality < 6) {
          suggestions.push('Improve logical reasoning and argument structure');
        }
      }
      
      // Informational suggestions
      if (informationalDepth.score < 6) {
        if (informationalDepth.detailLevel < 6) {
          suggestions.push('Add more specific details and examples');
        }
        if (informationalDepth.comprehensiveness < 6) {
          suggestions.push('Cover the topic more comprehensively');
        }
        if (informationalDepth.expertiseDemonstration < 6) {
          suggestions.push('Demonstrate deeper expertise and knowledge');
        }
      }
      
      // Structural suggestions
      if (structuralDepth.score < 6) {
        if (structuralDepth.organizationComplexity < 6) {
          suggestions.push('Improve organizational structure and hierarchy');
        }
        if (structuralDepth.logicalHierarchy < 6) {
          suggestions.push('Create better logical flow and progression');
        }
        if (structuralDepth.contentLayering < 6) {
          suggestions.push('Build content layers more effectively');
        }
      }
    }
    
    return suggestions;
  }

  private fallbackEvaluation(content: string, context?: QualityContext): {
    score: number;
    factors: string[];
    suggestions: string[];
  } {
    const structuralDepth = this.analyzeStructuralDepth(content);
    const wordCount = content.split(/\s+/).length;
    
    let score = structuralDepth.score;
    
    // Basic depth assessment based on length and structure
    if (wordCount > 500) score += 1;
    if (wordCount > 1000) score += 1;
    if (wordCount > 2000) score += 1;
    
    score = Math.min(10, score);
    
    return {
      score,
      factors: score >= 7 ? ['Good content depth'] : ['Limited content depth'],
      suggestions: score < 7 ? ['Add more detailed analysis and comprehensive coverage'] : []
    };
  }
}
