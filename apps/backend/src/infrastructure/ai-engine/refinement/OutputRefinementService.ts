import OpenAI from 'openai';
import { IOutputRefinementService } from '@/domain/ai-engine/services/IInputAnalysisService';

export class OutputRefinementService implements IOutputRefinementService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async refineContent(content: string, rules: Array<{
    type: 'formatting' | 'content' | 'style' | 'validation';
    config: Record<string, any>;
  }>): Promise<{
    refinedContent: string;
    appliedRules: string[];
    qualityScore: number;
    suggestions: string[];
  }> {
    let refinedContent = content;
    const appliedRules: string[] = [];
    const suggestions: string[] = [];

    // Apply rules in order
    for (const rule of rules) {
      const result = await this.applyRule(refinedContent, rule);
      refinedContent = result.content;
      appliedRules.push(rule.type);
      suggestions.push(...result.suggestions);
    }

    // Calculate quality score
    const qualityScore = await this.calculateQuality(refinedContent, {
      rules: rules.map(r => r.type),
      originalContent: content
    });

    return {
      refinedContent,
      appliedRules,
      qualityScore,
      suggestions
    };
  }

  async validateOutput(content: string, schema: Record<string, any>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a content validation expert. Validate the content against the provided schema and return JSON with format: {"isValid": true, "errors": [], "warnings": []}'
        },
        {
          role: 'user',
          content: `Content: ${content}\n\nSchema: ${JSON.stringify(schema, null, 2)}`
        }
      ],
      max_tokens: 300,
      temperature: 0.1
    });

    try {
      const result = response.choices[0]?.message?.content || '{}';
      return JSON.parse(result);
    } catch {
      return {
        isValid: false,
        errors: ['Validation failed due to processing error'],
        warnings: []
      };
    }
  }

  async calculateQuality(content: string, criteria: Record<string, any>): Promise<number> {
    const qualityCriteria = this.buildQualityCriteria(criteria);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a content quality expert. Rate the content quality from 0 to 100 based on the criteria. Return only the numeric score.'
        },
        {
          role: 'user',
          content: `Content: ${content}\n\nCriteria: ${qualityCriteria}`
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    });

    const scoreText = response.choices[0]?.message?.content?.trim() || '50';
    const score = parseInt(scoreText);
    return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
  }

  async applyFormatting(content: string, format: string): Promise<string> {
    const formatInstructions = this.getFormatInstructions(format);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a formatting expert. Apply the specified formatting to the content while preserving the meaning.`
        },
        {
          role: 'user',
          content: `Format the following content according to: ${formatInstructions}\n\nContent: ${content}`
        }
      ],
      max_tokens: Math.min(content.length * 2, 2000),
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || content;
  }

  private async applyRule(content: string, rule: {
    type: 'formatting' | 'content' | 'style' | 'validation';
    config: Record<string, any>;
  }): Promise<{
    content: string;
    suggestions: string[];
  }> {
    switch (rule.type) {
      case 'formatting':
        return this.applyFormattingRule(content, rule.config);
      case 'content':
        return this.applyContentRule(content, rule.config);
      case 'style':
        return this.applyStyleRule(content, rule.config);
      case 'validation':
        return this.applyValidationRule(content, rule.config);
      default:
        return { content, suggestions: [] };
    }
  }

  private async applyFormattingRule(content: string, config: Record<string, any>): Promise<{
    content: string;
    suggestions: string[];
  }> {
    const format = config.format || 'plain';
    const formattedContent = await this.applyFormatting(content, format);
    
    return {
      content: formattedContent,
      suggestions: [`Applied ${format} formatting`]
    };
  }

  private async applyContentRule(content: string, config: Record<string, any>): Promise<{
    content: string;
    suggestions: string[];
  }> {
    const action = config.action || 'improve';
    const target = config.target || 'clarity';
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a content improvement expert. ${this.getContentInstruction(action, target)}`
        },
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: Math.min(content.length * 2, 2000),
      temperature: 0.3
    });

    return {
      content: response.choices[0]?.message?.content || content,
      suggestions: [`Improved content ${target}`]
    };
  }

  private async applyStyleRule(content: string, config: Record<string, any>): Promise<{
    content: string;
    suggestions: string[];
  }> {
    const style = config.style || 'professional';
    const tone = config.tone || 'neutral';
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a style expert. Rewrite the content to be ${style} with a ${tone} tone while preserving the meaning.`
        },
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: Math.min(content.length * 2, 2000),
      temperature: 0.3
    });

    return {
      content: response.choices[0]?.message?.content || content,
      suggestions: [`Applied ${style} style with ${tone} tone`]
    };
  }

  private async applyValidationRule(content: string, config: Record<string, any>): Promise<{
    content: string;
    suggestions: string[];
  }> {
    const checks = config.checks || ['grammar', 'spelling'];
    const validationPrompt = this.buildValidationPrompt(checks);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a proofreading expert. ${validationPrompt} Return only the corrected content.`
        },
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: Math.min(content.length * 1.5, 2000),
      temperature: 0.1
    });

    return {
      content: response.choices[0]?.message?.content || content,
      suggestions: [`Validated and corrected: ${checks.join(', ')}`]
    };
  }

  private getContentInstruction(action: string, target: string): string {
    const instructions: Record<string, Record<string, string>> = {
      improve: {
        clarity: 'Improve the clarity and readability of the content.',
        conciseness: 'Make the content more concise and to the point.',
        completeness: 'Enhance the content to be more complete and comprehensive.',
        accuracy: 'Improve the accuracy and factual correctness of the content.'
      },
      expand: {
        clarity: 'Expand the content to improve clarity and understanding.',
        detail: 'Add more details and examples to elaborate on the content.',
        depth: 'Provide deeper insights and analysis on the topic.',
        context: 'Add relevant context and background information.'
      },
      simplify: {
        clarity: 'Simplify the content for better clarity and understanding.',
        complexity: 'Reduce complexity and make it more accessible.',
        language: 'Use simpler language and terminology.',
        structure: 'Simplify the structure and organization.'
      }
    };

    return instructions[action]?.[target] || 'Improve the overall quality of the content.';
  }

  private buildValidationPrompt(checks: string[]): string {
    const checkInstructions: Record<string, string> = {
      grammar: 'Check and correct grammar errors.',
      spelling: 'Check and correct spelling mistakes.',
      punctuation: 'Check and correct punctuation errors.',
      consistency: 'Ensure consistency in terminology and formatting.',
      clarity: 'Ensure the content is clear and unambiguous.',
      completeness: 'Ensure the content is complete and coherent.'
    };

    const instructions = checks.map(check => checkInstructions[check]).filter(Boolean).join(' ');
    return `Check and correct the following: ${instructions}`;
  }

  private buildQualityCriteria(criteria: Record<string, any>): string {
    const baseCriteria = [
      'Clarity and readability',
      'Grammar and spelling',
      'Coherence and structure',
      'Relevance and accuracy'
    ];

    const customCriteria = criteria.rules || [];
    const allCriteria = [...baseCriteria, ...customCriteria];

    return allCriteria.join(', ');
  }

  private getFormatInstructions(format: string): string {
    const formatInstructions: Record<string, string> = {
      markdown: 'Format using Markdown syntax with proper headings, lists, and emphasis.',
      html: 'Format using HTML tags with proper structure and semantic elements.',
      json: 'Format as valid JSON with proper indentation and structure.',
      yaml: 'Format as valid YAML with proper indentation and structure.',
      plain: 'Format as plain text with clear paragraphs and line breaks.',
      bullet_points: 'Format using bullet points for easy readability.',
      numbered_list: 'Format using numbered lists for sequential information.',
      table: 'Format as a structured table with rows and columns.',
      email: 'Format as a professional email with greeting, body, and signature.',
      report: 'Format as a structured report with sections and subsections.'
    };

    return formatInstructions[format] || 'Format for clarity and readability.';
  }

  // Advanced refinement methods

  async enhanceReadability(content: string, targetAudience: string): Promise<{
    enhancedContent: string;
    readabilityScore: number;
    improvements: string[];
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a readability expert. Enhance the content for ${targetAudience} audience. Focus on clarity, simplicity, and engagement.`
        },
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: Math.min(content.length * 2, 2000),
      temperature: 0.3
    });

    const enhancedContent = response.choices[0]?.message?.content || content;
    const readabilityScore = await this.calculateReadabilityScore(enhancedContent);
    
    return {
      enhancedContent,
      readabilityScore,
      improvements: ['Enhanced for target audience', 'Improved clarity and engagement']
    };
  }

  private async calculateReadabilityScore(content: string): Promise<number> {
    // Simple readability calculation based on sentence length and word complexity
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/);
    const avgSentenceLength = words.length / sentences.length;
    
    // Basic readability score (simplified Flesch Reading Ease)
    const score = Math.max(0, Math.min(100, 206.835 - (1.015 * avgSentenceLength) - (84.6 * 0.5)));
    
    return Math.round(score);
  }

  async optimizeForSEO(content: string, keywords: string[]): Promise<{
    optimizedContent: string;
    keywordDensity: Record<string, number>;
    seoScore: number;
    recommendations: string[];
  }> {
    const keywordString = keywords.join(', ');
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an SEO expert. Optimize the content for the keywords: ${keywordString}. Maintain natural flow and readability while improving SEO.`
        },
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: Math.min(content.length * 2, 2000),
      temperature: 0.3
    });

    const optimizedContent = response.choices[0]?.message?.content || content;
    const keywordDensity = this.calculateKeywordDensity(optimizedContent, keywords);
    const seoScore = await this.calculateSEOScore(optimizedContent, keywords);
    
    return {
      optimizedContent,
      keywordDensity,
      seoScore,
      recommendations: ['Optimized for target keywords', 'Improved SEO structure']
    };
  }

  private calculateKeywordDensity(content: string, keywords: string[]): Record<string, number> {
    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    const density: Record<string, number> = {};

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const keywordCount = words.filter(word => word.includes(keywordLower)).length;
      density[keyword] = totalWords > 0 ? (keywordCount / totalWords) * 100 : 0;
    });

    return density;
  }

  private async calculateSEOScore(content: string, keywords: string[]): Promise<number> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Rate the SEO optimization of the content from 0 to 100. Consider keyword usage, structure, readability, and SEO best practices. Return only the numeric score.'
        },
        {
          role: 'user',
          content: `Content: ${content}\n\nKeywords: ${keywords.join(', ')}`
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    });

    const scoreText = response.choices[0]?.message?.content?.trim() || '50';
    const score = parseInt(scoreText);
    return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
  }
}
