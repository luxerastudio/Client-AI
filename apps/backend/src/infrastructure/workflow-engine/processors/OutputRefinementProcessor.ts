import OpenAI from 'openai';
import { IStepProcessor } from '@/domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowStep, WorkflowContext, StepResult, WorkflowStepType } from '@/domain/workflow-engine/entities/Workflow';

export class OutputRefinementProcessor implements IStepProcessor {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  canProcess(stepType: string): boolean {
    return stepType === WorkflowStepType.REFINE_OUTPUT;
  }

  async process(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      const config = step.config || {};
      const generatedOutput = context.stepResults['generate_output']?.data?.output;
      const analysisResult = context.stepResults['analyze_input']?.data?.analysis;
      
      // Refine the generated output
      const refinement = await this.refineOutput(generatedOutput, analysisResult, config);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          refinedOutput: refinement.content,
          improvements: refinement.improvements,
          qualityScore: refinement.qualityScore,
          suggestions: refinement.suggestions,
          metadata: refinement.metadata
        },
        metrics: {
          duration,
          tokensUsed: refinement.tokensUsed || 0,
          cost: refinement.cost || 0
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in output refinement',
        metrics: {
          duration
        }
      };
    }
  }

  async validate(step: WorkflowStep, context: WorkflowContext): Promise<boolean> {
    // Check if we have the generated output
    if (!context.stepResults['generate_output']?.data?.output) {
      return false;
    }

    // Validate configuration
    const config = step.config || {};
    if (config.refinementType && !this.isValidRefinementType(config.refinementType)) {
      return false;
    }

    return true;
  }

  private async refineOutput(content: string, analysis: any, config: Record<string, any>): Promise<any> {
    const refinementType = config.refinementType || 'general';
    
    switch (refinementType) {
      case 'grammar_style':
        return this.refineGrammarAndStyle(content, analysis, config);
      case 'clarity_readability':
        return this.refineClarityAndReadability(content, analysis, config);
      case 'engagement':
        return this.refineForEngagement(content, analysis, config);
      case 'seo':
        return this.refineForSEO(content, analysis, config);
      case 'tone':
        return this.refineTone(content, analysis, config);
      case 'length':
        return this.refineLength(content, analysis, config);
      case 'formatting':
        return this.refineFormatting(content, analysis, config);
      default:
        return this.refineGeneral(content, analysis, config);
    }
  }

  private async refineGrammarAndStyle(content: string, analysis: any, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert editor. Refine the content for perfect grammar, punctuation, and style while maintaining the original meaning and voice.'
        },
        {
          role: 'user',
          content: `Refine this content for grammar and style: ${content}`
        }
      ],
      max_tokens: Math.min(content.length * 1.2, 2000),
      temperature: 0.1
    });

    const refinedContent = response.choices[0]?.message?.content || content;
    
    return {
      content: refinedContent,
      improvements: this.detectGrammarImprovements(content, refinedContent),
      qualityScore: this.calculateGrammarScore(refinedContent),
      suggestions: this.generateGrammarSuggestions(refinedContent),
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        corrections: this.countCorrections(content, refinedContent),
        style: this.analyzeStyle(refinedContent)
      }
    };
  }

  private async refineClarityAndReadability(content: string, analysis: any, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in clear communication. Refine the content to improve clarity, readability, and comprehension while preserving the core message.'
        },
        {
          role: 'user',
          content: `Refine this content for clarity and readability: ${content}`
        }
      ],
      max_tokens: Math.min(content.length * 1.2, 2000),
      temperature: 0.2
    });

    const refinedContent = response.choices[0]?.message?.content || content;
    
    return {
      content: refinedContent,
      improvements: this.detectClarityImprovements(content, refinedContent),
      qualityScore: this.calculateReadabilityScore(refinedContent),
      suggestions: this.generateReadabilitySuggestions(refinedContent),
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        readabilityLevel: this.assessReadabilityLevel(refinedContent),
        averageSentenceLength: this.calculateAverageSentenceLength(refinedContent)
      }
    };
  }

  private async refineForEngagement(content: string, analysis: any, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in engaging content. Refine the content to increase reader engagement, add hooks, and create more compelling language while maintaining the message integrity.'
        },
        {
          role: 'user',
          content: `Refine this content for better engagement: ${content}`
        }
      ],
      max_tokens: Math.min(content.length * 1.3, 2000),
      temperature: 0.7
    });

    const refinedContent = response.choices[0]?.message?.content || content;
    
    return {
      content: refinedContent,
      improvements: this.detectEngagementImprovements(content, refinedContent),
      qualityScore: this.calculateEngagementScore(refinedContent),
      suggestions: this.generateEngagementSuggestions(refinedContent),
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        hooks: this.countHooks(refinedContent),
        interactiveElements: this.countInteractiveElements(refinedContent),
        emotionalWords: this.countEmotionalWords(refinedContent)
      }
    };
  }

  private async refineForSEO(content: string, analysis: any, config: Record<string, any>): Promise<any> {
    const keywords = config.keywords || analysis?.keywords || [];
    
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an SEO expert. Refine the content to optimize for search engines using these keywords: ${keywords.join(', ')}. Maintain readability and natural flow.`
        },
        {
          role: 'user',
          content: `Refine this content for SEO: ${content}`
        }
      ],
      max_tokens: Math.min(content.length * 1.2, 2000),
      temperature: 0.3
    });

    const refinedContent = response.choices[0]?.message?.content || content;
    
    return {
      content: refinedContent,
      improvements: this.detectSEOImprovements(content, refinedContent, keywords),
      qualityScore: this.calculateSEOScore(refinedContent, keywords),
      suggestions: this.generateSEOSuggestions(refinedContent, keywords),
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        keywordDensity: this.calculateKeywordDensity(refinedContent, keywords),
        headingStructure: this.analyzeHeadingStructure(refinedContent),
        metaDescription: this.generateMetaDescription(refinedContent)
      }
    };
  }

  private async refineTone(content: string, analysis: any, config: Record<string, any>): Promise<any> {
    const targetTone = config.targetTone || 'professional';
    
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert in tone adjustment. Refine the content to have a ${targetTone} tone while preserving the original message and intent.`
        },
        {
          role: 'user',
          content: `Refine this content for a ${targetTone} tone: ${content}`
        }
      ],
      max_tokens: Math.min(content.length * 1.2, 2000),
      temperature: 0.4
    });

    const refinedContent = response.choices[0]?.message?.content || content;
    
    return {
      content: refinedContent,
      improvements: this.detectToneImprovements(content, refinedContent, targetTone),
      qualityScore: this.calculateToneScore(refinedContent, targetTone),
      suggestions: this.generateToneSuggestions(refinedContent, targetTone),
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        toneConsistency: this.assessToneConsistency(refinedContent, targetTone),
        formalityLevel: this.assessFormalityLevel(refinedContent)
      }
    };
  }

  private async refineLength(content: string, analysis: any, config: Record<string, any>): Promise<any> {
    const targetLength = config.targetLength || 'medium';
    
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert in content length optimization. Refine the content to be ${targetLength} length while maintaining quality and key information.`
        },
        {
          role: 'user',
          content: `Refine this content for ${targetLength} length: ${content}`
        }
      ],
      max_tokens: this.getTargetLengthTokens(targetLength),
      temperature: 0.3
    });

    const refinedContent = response.choices[0]?.message?.content || content;
    
    return {
      content: refinedContent,
      improvements: this.detectLengthImprovements(content, refinedContent, targetLength),
      qualityScore: this.calculateLengthScore(refinedContent, targetLength),
      suggestions: this.generateLengthSuggestions(refinedContent, targetLength),
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        wordCount: refinedContent.split(/\s+/).length,
        lengthCategory: this.categorizeLength(refinedContent),
        compressionRatio: this.calculateCompressionRatio(content, refinedContent)
      }
    };
  }

  private async refineFormatting(content: string, analysis: any, config: Record<string, any>): Promise<any> {
    const targetFormat = config.targetFormat || 'structured';
    
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert in content formatting. Refine the content to have ${targetFormat} formatting with proper structure and organization.`
        },
        {
          role: 'user',
          content: `Refine this content for ${targetFormat} formatting: ${content}`
        }
      ],
      max_tokens: Math.min(content.length * 1.2, 2000),
      temperature: 0.2
    });

    const refinedContent = response.choices[0]?.message?.content || content;
    
    return {
      content: refinedContent,
      improvements: this.detectFormattingImprovements(content, refinedContent, targetFormat),
      qualityScore: this.calculateFormattingScore(refinedContent, targetFormat),
      suggestions: this.generateFormattingSuggestions(refinedContent, targetFormat),
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        structureType: this.identifyStructureType(refinedContent),
        headingCount: this.countHeadings(refinedContent),
        listCount: this.countLists(refinedContent)
      }
    };
  }

  private async refineGeneral(content: string, analysis: any, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content editor. Refine the content to improve overall quality, clarity, and effectiveness while maintaining the original message.'
        },
        {
          role: 'user',
          content: `Refine this content for overall improvement: ${content}`
        }
      ],
      max_tokens: Math.min(content.length * 1.2, 2000),
      temperature: 0.3
    });

    const refinedContent = response.choices[0]?.message?.content || content;
    
    return {
      content: refinedContent,
      improvements: this.detectGeneralImprovements(content, refinedContent),
      qualityScore: this.calculateGeneralQualityScore(refinedContent),
      suggestions: this.generateGeneralSuggestions(refinedContent),
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        overallScore: this.calculateOverallScore(refinedContent),
        improvements: this.countImprovements(content, refinedContent)
      }
    };
  }

  // Helper methods for improvement detection and scoring

  private detectGrammarImprovements(original: string, refined: string): string[] {
    const improvements: string[] = [];
    
    if (refined.length !== original.length) {
      improvements.push('Grammar corrections applied');
    }
    
    if (this.hasBetterPunctuation(refined)) {
      improvements.push('Punctuation improved');
    }
    
    if (this.hasBetterCapitalization(refined)) {
      improvements.push('Capitalization fixed');
    }
    
    return improvements;
  }

  private detectClarityImprovements(original: string, refined: string): string[] {
    const improvements: string[] = [];
    
    if (this.calculateAverageSentenceLength(refined) < this.calculateAverageSentenceLength(original)) {
      improvements.push('Sentence length optimized');
    }
    
    if (this.countComplexWords(refined) < this.countComplexWords(original)) {
      improvements.push('Complex words simplified');
    }
    
    return improvements;
  }

  private detectEngagementImprovements(original: string, refined: string): string[] {
    const improvements: string[] = [];
    
    if (this.countHooks(refined) > this.countHooks(original)) {
      improvements.push('Added engaging hooks');
    }
    
    if (this.countQuestions(refined) > this.countQuestions(original)) {
      improvements.push('Added rhetorical questions');
    }
    
    return improvements;
  }

  private detectSEOImprovements(original: string, refined: string, keywords: string[]): string[] {
    const improvements: string[] = [];
    
    const originalDensity = this.calculateKeywordDensity(original, keywords);
    const refinedDensity = this.calculateKeywordDensity(refined, keywords);
    
    if (refinedDensity > originalDensity && refinedDensity <= 3) {
      improvements.push('Keyword density optimized');
    }
    
    if (this.hasBetterHeadings(refined)) {
      improvements.push('Heading structure improved');
    }
    
    return improvements;
  }

  private detectToneImprovements(original: string, refined: string, targetTone: string): string[] {
    const improvements: string[] = [];
    
    if (this.assessToneMatch(refined, targetTone) > this.assessToneMatch(original, targetTone)) {
      improvements.push(`Tone adjusted to ${targetTone}`);
    }
    
    return improvements;
  }

  private detectLengthImprovements(original: string, refined: string, targetLength: string): string[] {
    const improvements: string[] = [];
    
    const originalCategory = this.categorizeLength(original);
    const refinedCategory = this.categorizeLength(refined);
    
    if (refinedCategory === targetLength && originalCategory !== targetLength) {
      improvements.push(`Length adjusted to ${targetLength}`);
    }
    
    return improvements;
  }

  private detectFormattingImprovements(original: string, refined: string, targetFormat: string): string[] {
    const improvements: string[] = [];
    
    if (this.countHeadings(refined) > this.countHeadings(original)) {
      improvements.push('Added structured headings');
    }
    
    if (this.countLists(refined) > this.countLists(original)) {
      improvements.push('Added structured lists');
    }
    
    return improvements;
  }

  private detectGeneralImprovements(original: string, refined: string): string[] {
    const improvements: string[] = [];
    
    if (refined !== original) {
      improvements.push('Content refined for quality');
    }
    
    return improvements;
  }

  // Scoring methods

  private calculateGrammarScore(content: string): number {
    let score = 80; // Base score
    
    if (this.hasProperCapitalization(content)) score += 10;
    if (this.hasProperPunctuation(content)) score += 10;
    
    return Math.min(100, score);
  }

  private calculateReadabilityScore(content: string): number {
    const avgSentenceLength = this.calculateAverageSentenceLength(content);
    let score = 70;
    
    if (avgSentenceLength <= 15) score += 15;
    else if (avgSentenceLength <= 20) score += 10;
    else if (avgSentenceLength <= 25) score += 5;
    
    return Math.min(100, score);
  }

  private calculateEngagementScore(content: string): number {
    let score = 60;
    
    score += Math.min(20, this.countHooks(content) * 5);
    score += Math.min(20, this.countQuestions(content) * 3);
    
    return Math.min(100, score);
  }

  private calculateSEOScore(content: string, keywords: string[]): number {
    let score = 50;
    
    const density = this.calculateKeywordDensity(content, keywords);
    if (density >= 1 && density <= 3) score += 30;
    else if (density > 0.5 && density <= 4) score += 20;
    
    if (this.hasHeadings(content)) score += 20;
    
    return Math.min(100, score);
  }

  private calculateToneScore(content: string, targetTone: string): number {
    return this.assessToneMatch(content, targetTone) * 100;
  }

  private calculateLengthScore(content: string, targetLength: string): number {
    const category = this.categorizeLength(content);
    return category === targetLength ? 100 : 70;
  }

  private calculateFormattingScore(content: string, targetFormat: string): number {
    let score = 60;
    
    if (this.hasHeadings(content)) score += 20;
    if (this.hasLists(content)) score += 20;
    
    return Math.min(100, score);
  }

  private calculateGeneralQualityScore(content: string): number {
    const scores = [
      this.calculateGrammarScore(content),
      this.calculateReadabilityScore(content),
      this.calculateEngagementScore(content)
    ];
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateOverallScore(content: string): number {
    return this.calculateGeneralQualityScore(content);
  }

  // Suggestion generation methods

  private generateGrammarSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    
    if (!this.hasProperCapitalization(content)) {
      suggestions.push('Review capitalization rules');
    }
    
    if (!this.hasProperPunctuation(content)) {
      suggestions.push('Check punctuation usage');
    }
    
    return suggestions;
  }

  private generateReadabilitySuggestions(content: string): string[] {
    const suggestions: string[] = [];
    
    if (this.calculateAverageSentenceLength(content) > 20) {
      suggestions.push('Consider breaking up longer sentences');
    }
    
    return suggestions;
  }

  private generateEngagementSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    
    if (this.countHooks(content) === 0) {
      suggestions.push('Add engaging opening hooks');
    }
    
    if (this.countQuestions(content) === 0) {
      suggestions.push('Include rhetorical questions to engage readers');
    }
    
    return suggestions;
  }

  private generateSEOSuggestions(content: string, keywords: string[]): string[] {
    const suggestions: string[] = [];
    
    if (!this.hasHeadings(content)) {
      suggestions.push('Add structured headings for better SEO');
    }
    
    return suggestions;
  }

  private generateToneSuggestions(content: string, targetTone: string): string[] {
    const suggestions: string[] = [];
    
    if (this.assessToneMatch(content, targetTone) < 0.8) {
      suggestions.push(`Review content to better match ${targetTone} tone`);
    }
    
    return suggestions;
  }

  private generateLengthSuggestions(content: string, targetLength: string): string[] {
    const suggestions: string[] = [];
    
    const category = this.categorizeLength(content);
    if (category !== targetLength) {
      suggestions.push(`Adjust content length to better match ${targetLength} requirements`);
    }
    
    return suggestions;
  }

  private generateFormattingSuggestions(content: string, targetFormat: string): string[] {
    const suggestions: string[] = [];
    
    if (!this.hasHeadings(content)) {
      suggestions.push('Add structured headings');
    }
    
    return suggestions;
  }

  private generateGeneralSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    
    if (content.length < 200) {
      suggestions.push('Consider adding more detail to fully develop the topic');
    }
    
    return suggestions;
  }

  // Utility methods

  private hasBetterPunctuation(content: string): boolean {
    return content.includes('.') || content.includes(',') || content.includes('!');
  }

  private hasBetterCapitalization(content: string): boolean {
    return content === content.charAt(0).toUpperCase() + content.slice(1);
  }

  private hasProperCapitalization(content: string): boolean {
    const sentences = content.split('. ');
    return sentences.every(sentence => 
      sentence.trim() === '' || sentence.trim().charAt(0) === sentence.trim().charAt(0).toUpperCase()
    );
  }

  private hasProperPunctuation(content: string): boolean {
    return content.includes('.') && content.charAt(content.length - 1) === '.';
  }

  private calculateAverageSentenceLength(content: string): number {
    const sentences = content.split('. ').filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;
    
    const totalWords = sentences.reduce((sum, sentence) => sum + sentence.split(/\s+/).length, 0);
    return totalWords / sentences.length;
  }

  private countComplexWords(content: string): number {
    const words = content.split(/\s+/);
    return words.filter(word => word.length > 8).length;
  }

  private countHooks(content: string): number {
    const hookWords = ['imagine', 'picture this', 'what if', 'discover', 'unlock', 'transform'];
    return hookWords.reduce((count, hook) => {
      return count + (content.toLowerCase().split(hook).length - 1);
    }, 0);
  }

  private countQuestions(content: string): number {
    return (content.match(/\?/g) || []).length;
  }

  private calculateKeywordDensity(content: string, keywords: string[]): number {
    if (keywords.length === 0) return 0;
    
    const words = content.toLowerCase().split(/\s+/);
    const keywordCount = keywords.reduce((count, keyword) => {
      return count + words.filter(word => word.includes(keyword.toLowerCase())).length;
    }, 0);
    
    return (keywordCount / words.length) * 100;
  }

  private hasBetterHeadings(content: string): boolean {
    return (content.match(/^#+/gm) || []).length > 0;
  }

  private hasHeadings(content: string): boolean {
    return (content.match(/^#+/gm) || []).length > 0;
  }

  private hasLists(content: string): boolean {
    return (content.match(/^\s*[-*+]/gm) || []).length > 0;
  }

  private assessToneMatch(content: string, targetTone: string): number {
    // Simplified tone assessment - in practice, this would use more sophisticated NLP
    const toneIndicators: Record<string, string[]> = {
      professional: ['therefore', 'furthermore', 'consequently', 'accordingly'],
      casual: ['hey', 'you know', 'basically', 'pretty much'],
      formal: ['heretofore', 'henceforth', 'whereas', 'notwithstanding'],
      friendly: ['awesome', 'great', 'fantastic', 'wonderful']
    };
    
    const indicators = toneIndicators[targetTone] || [];
    const matches = indicators.filter(indicator => content.toLowerCase().includes(indicator)).length;
    
    return Math.min(1, matches / indicators.length);
  }

  private categorizeLength(content: string): string {
    const wordCount = content.split(/\s+/).length;
    
    if (wordCount < 100) return 'short';
    if (wordCount < 500) return 'medium';
    if (wordCount < 1000) return 'long';
    return 'extended';
  }

  private getTargetLengthTokens(targetLength: string): number {
    const tokenMap: Record<string, number> = {
      short: 300,
      medium: 800,
      long: 1500,
      extended: 2500
    };
    
    return tokenMap[targetLength] || 800;
  }

  private countHeadings(content: string): number {
    return (content.match(/^#+/gm) || []).length;
  }

  private countLists(content: string): number {
    return (content.match(/^\s*[-*+]/gm) || []).length;
  }

  private countInteractiveElements(content: string): number {
    return this.countQuestions(content) + this.countHooks(content);
  }

  private countEmotionalWords(content: string): number {
    const emotionalWords = ['amazing', 'love', 'exciting', 'wonderful', 'fantastic', 'incredible'];
    return emotionalWords.reduce((count, word) => {
      return count + (content.toLowerCase().split(word).length - 1);
    }, 0);
  }

  private countCorrections(original: string, refined: string): number {
    // Simple approximation based on length differences
    return Math.abs(original.length - refined.length);
  }

  private analyzeStyle(content: string): string {
    if (this.calculateAverageSentenceLength(content) > 20) return 'complex';
    if (this.calculateAverageSentenceLength(content) < 12) return 'simple';
    return 'moderate';
  }

  private assessReadabilityLevel(content: string): string {
    const score = this.calculateReadabilityScore(content);
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  private countImprovements(original: string, refined: string): number {
    return original !== refined ? 1 : 0;
  }

  private assessToneConsistency(content: string, targetTone: string): string {
    const match = this.assessToneMatch(content, targetTone);
    if (match >= 0.8) return 'high';
    if (match >= 0.6) return 'medium';
    return 'low';
  }

  private assessFormalityLevel(content: string): string {
    const formalWords = ['therefore', 'furthermore', 'consequently'];
    const formalCount = formalWords.filter(word => content.toLowerCase().includes(word)).length;
    
    if (formalCount >= 2) return 'formal';
    if (formalCount >= 1) return 'semi-formal';
    return 'casual';
  }

  private analyzeHeadingStructure(content: string): string {
    const headings = content.match(/^#+/gm) || [];
    if (headings.length === 0) return 'no headings';
    if (headings.length === 1) return 'single heading';
    return 'structured headings';
  }

  private generateMetaDescription(content: string): string {
    const sentences = content.split('. ').slice(0, 2);
    return sentences.join('. ').substring(0, 160);
  }

  private identifyStructureType(content: string): string {
    if (this.countHeadings(content) > 0) return 'structured';
    return 'linear';
  }

  private calculateCompressionRatio(original: string, refined: string): number {
    return (refined.length / original.length) * 100;
  }

  private isValidRefinementType(type: string): boolean {
    const validTypes = ['grammar_style', 'clarity_readability', 'engagement', 'seo', 'tone', 'length', 'formatting', 'general'];
    return validTypes.includes(type);
  }

  private calculateCost(tokens: number): number {
    return tokens * 0.000002;
  }
}
