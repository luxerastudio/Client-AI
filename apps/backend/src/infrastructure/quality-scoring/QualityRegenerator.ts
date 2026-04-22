import OpenAI from 'openai';
import { QualityScore, QualityContext, QualityThresholds } from '@/domain/quality-scoring/entities/QualityScore';
import { ClarityScorer } from './scorers/ClarityScorer';
import { RelevanceScorer } from './scorers/RelevanceScorer';
import { DepthScorer } from './scorers/DepthScorer';
import { UsefulnessScorer } from './scorers/UsefulnessScorer';

export class QualityRegenerator {
  private openai: OpenAI;
  private clarityScorer: ClarityScorer;
  private relevanceScorer: RelevanceScorer;
  private depthScorer: DepthScorer;
  private usefulnessScorer: UsefulnessScorer;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    this.clarityScorer = new ClarityScorer(apiKey);
    this.relevanceScorer = new RelevanceScorer(apiKey);
    this.depthScorer = new DepthScorer(apiKey);
    this.usefulnessScorer = new UsefulnessScorer(apiKey);
  }

  shouldRegenerate(score: QualityScore, thresholds?: QualityThresholds): boolean {
    const minScore = thresholds?.minimum || 7;
    return score.overall < minScore;
  }

  async regenerate(
    content: string,
    feedback: QualityScore,
    context?: QualityContext,
    maxAttempts: number = 3
  ): Promise<{
    regenerated: boolean;
    newContent?: string;
    newScore?: QualityScore;
    attempts: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    let attempts = 0;
    let currentContent = content;
    let currentScore = feedback;
    let regenerated = false;

    while (attempts < maxAttempts && this.shouldRegenerate(currentScore)) {
      attempts++;
      
      try {
        // Determine which metrics need improvement
        const improvementAreas = this.identifyImprovementAreas(currentScore);
        
        // Generate improved content
        const improvedContent = await this.generateImprovedContent(
          currentContent,
          improvementAreas,
          context
        );
        
        // Evaluate the new content
        const newScore = await this.evaluateContent(improvedContent, context);
        
        // Check if it's better
        if (newScore.overall > currentScore.overall) {
          currentContent = improvedContent;
          currentScore = newScore;
          regenerated = true;
        }
        
        // If we've reached acceptable quality, stop
        if (!this.shouldRegenerate(currentScore)) {
          break;
        }
        
      } catch (error) {
        console.error(`Regeneration attempt ${attempts} failed:`, error);
      }
    }

    return {
      regenerated,
      newContent: regenerated ? currentContent : undefined,
      newScore: regenerated ? currentScore : undefined,
      attempts,
      processingTime: Date.now() - startTime
    };
  }

  private identifyImprovementAreas(score: QualityScore): string[] {
    const areas: string[] = [];
    
    if (score.clarity < 7) {
      areas.push('clarity');
    }
    
    if (score.relevance < 7) {
      areas.push('relevance');
    }
    
    if (score.depth < 7) {
      areas.push('depth');
    }
    
    if (score.usefulness < 7) {
      areas.push('usefulness');
    }
    
    return areas;
  }

  private async generateImprovedContent(
    content: string,
    improvementAreas: string[],
    context?: QualityContext
  ): Promise<string> {
    let prompt = this.buildRegenerationPrompt(content, improvementAreas, context);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content editor. Improve the given content based on the specific areas that need enhancement. Maintain the original message and intent while improving quality.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: Math.max(content.length * 1.2, 1000),
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || content;
  }

  private buildRegenerationPrompt(
    content: string,
    improvementAreas: string[],
    context?: QualityContext
  ): string {
    let prompt = `Improve the following content to enhance its quality:\n\n"${content}"\n\n`;
    
    prompt += `Areas to improve: ${improvementAreas.join(', ')}\n\n`;
    
    if (improvementAreas.includes('clarity')) {
      prompt += `For clarity: Make the content clearer, more readable, and easier to understand. Use simpler sentences where needed and improve organization.\n`;
    }
    
    if (improvementAreas.includes('relevance')) {
      prompt += `For relevance: Ensure the content better aligns with the intended topic and audience. Include relevant keywords and stay focused.\n`;
    }
    
    if (improvementAreas.includes('depth')) {
      prompt += `For depth: Add more substance, detail, and analytical depth. Include examples, explanations, and deeper insights.\n`;
    }
    
    if (improvementAreas.includes('usefulness')) {
      prompt += `For usefulness: Make the content more practical and actionable. Include specific steps, benefits, and real-world applications.\n`;
    }
    
    if (context) {
      if (context.targetAudience) {
        prompt += `Target Audience: ${context.targetAudience}\n`;
      }
      if (context.purpose) {
        prompt += `Purpose: ${context.purpose}\n`;
      }
      if (context.tone) {
        prompt += `Tone: ${context.tone}\n`;
      }
      if (context.keywords && context.keywords.length > 0) {
        prompt += `Keywords: ${context.keywords.join(', ')}\n`;
      }
    }
    
    prompt += `\nPlease provide an improved version that addresses these areas while maintaining the core message and intent. The improved content should be natural and not artificially padded.`;
    
    return prompt;
  }

  private async evaluateContent(content: string, context?: QualityContext): Promise<QualityScore> {
    const startTime = Date.now();
    
    try {
      // Evaluate each metric
      const clarityResult = await this.clarityScorer.evaluate(content, context);
      const relevanceResult = await this.relevanceScorer.evaluate(content, context || {});
      const depthResult = await this.depthScorer.evaluate(content, context);
      const usefulnessResult = await this.usefulnessScorer.evaluate(content, context || {});
      
      // Calculate basic metrics
      const metrics = this.calculateBasicMetrics(content);
      
      // Calculate overall score
      const overall = (clarityResult.score + relevanceResult.score + depthResult.score + usefulnessResult.score) / 4;
      
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
          regenerated: true,
          regenerationCount: 1
        },
        suggestions: [
          ...clarityResult.suggestions,
          ...relevanceResult.suggestions,
          ...depthResult.suggestions,
          ...usefulnessResult.suggestions
        ],
        passed: overall >= 7,
        needsRegeneration: overall < 7
      };
    } catch (error) {
      // Fallback evaluation
      return this.fallbackEvaluation(content, Date.now() - startTime);
    }
  }

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

  private fallbackEvaluation(content: string, processingTime: number): QualityScore {
    const metrics = this.calculateBasicMetrics(content);
    const overall = 5; // Default score for fallback
    
    return {
      overall,
      clarity: overall,
      relevance: overall,
      depth: overall,
      usefulness: overall,
      breakdown: {
        clarity: {
          score: overall,
          factors: ['Basic evaluation'],
          suggestions: ['Consider improving content quality']
        },
        relevance: {
          score: overall,
          factors: ['Basic evaluation'],
          suggestions: ['Consider improving relevance']
        },
        depth: {
          score: overall,
          factors: ['Basic evaluation'],
          suggestions: ['Consider adding more depth']
        },
        usefulness: {
          score: overall,
          factors: ['Basic evaluation'],
          suggestions: ['Consider adding practical value']
        }
      },
      metadata: {
        ...metrics,
        processingTime,
        regenerated: true,
        regenerationCount: 1
      },
      suggestions: ['Content needs improvement in multiple areas'],
      passed: false,
      needsRegeneration: true
    };
  }

  // Specific improvement methods for individual metrics
  
  async improveClarity(content: string, feedback: QualityScore): Promise<string> {
    let prompt = `Improve the clarity of this content:\n\n"${content}"\n\n`;
    
    if (feedback.breakdown.clarity.suggestions.length > 0) {
      prompt += `Specific issues to address:\n${feedback.breakdown.clarity.suggestions.map(s => `- ${s}`).join('\n')}\n\n`;
    }
    
    prompt += 'Make the content clearer, more readable, and easier to understand. Use simpler sentences where needed and improve organization.';
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in making content clearer and more readable.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: Math.max(content.length * 1.1, 500),
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || content;
  }

  async improveRelevance(content: string, feedback: QualityScore, context: QualityContext): Promise<string> {
    let prompt = `Improve the relevance of this content:\n\n"${content}"\n\n`;
    
    if (context.targetAudience) {
      prompt += `Target Audience: ${context.targetAudience}\n`;
    }
    
    if (context.purpose) {
      prompt += `Purpose: ${context.purpose}\n`;
    }
    
    if (context.keywords && context.keywords.length > 0) {
      prompt += `Keywords: ${context.keywords.join(', ')}\n`;
    }
    
    if (feedback.breakdown.relevance.suggestions.length > 0) {
      prompt += `Specific issues to address:\n${feedback.breakdown.relevance.suggestions.map(s => `- ${s}`).join('\n')}\n\n`;
    }
    
    prompt += 'Make the content more relevant to the target audience and purpose. Include relevant keywords and stay focused on the main topic.';
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in making content more relevant and targeted.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: Math.max(content.length * 1.1, 500),
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || content;
  }

  async improveDepth(content: string, feedback: QualityScore): Promise<string> {
    let prompt = `Improve the depth of this content:\n\n"${content}"\n\n`;
    
    if (feedback.breakdown.depth.suggestions.length > 0) {
      prompt += `Specific issues to address:\n${feedback.breakdown.depth.suggestions.map(s => `- ${s}`).join('\n')}\n\n`;
    }
    
    prompt += 'Add more substance, detail, and analytical depth. Include examples, explanations, and deeper insights while maintaining the core message.';
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in adding depth and substance to content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: Math.max(content.length * 1.3, 800),
      temperature: 0.4
    });

    return response.choices[0]?.message?.content || content;
  }

  async improveUsefulness(content: string, feedback: QualityScore, context: QualityContext): Promise<string> {
    let prompt = `Improve the usefulness of this content:\n\n"${content}"\n\n`;
    
    if (context.purpose) {
      prompt += `Purpose: ${context.purpose}\n`;
    }
    
    if (feedback.breakdown.usefulness.suggestions.length > 0) {
      prompt += `Specific issues to address:\n${feedback.breakdown.usefulness.suggestions.map(s => `- ${s}`).join('\n')}\n\n`;
    }
    
    prompt += 'Make the content more practical and actionable. Include specific steps, benefits, and real-world applications that readers can use immediately.';
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in making content more practical and useful.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: Math.max(content.length * 1.2, 600),
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || content;
  }
}
