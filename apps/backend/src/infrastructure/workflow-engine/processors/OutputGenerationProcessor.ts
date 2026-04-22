import OpenAI from 'openai';
import { IStepProcessor } from '@/domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowStep, WorkflowContext, StepResult, WorkflowStepType } from '@/domain/workflow-engine/entities/Workflow';

export class OutputGenerationProcessor implements IStepProcessor {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  canProcess(stepType: string): boolean {
    return stepType === WorkflowStepType.GENERATE_OUTPUT;
  }

  async process(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      const config = step.config || {};
      const analysisResult = context.stepResults['analyze_input']?.data?.analysis;
      const structureResult = context.stepResults['breakdown_structure']?.data?.structure;
      
      // Generate output based on the structure and analysis
      const output = await this.generateOutput(context.input, analysisResult, structureResult, config);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          output: output.content,
          metadata: output.metadata,
          quality: this.assessQuality(output.content, config),
          suggestions: this.generateSuggestions(output.content, analysisResult, config)
        },
        metrics: {
          duration,
          tokensUsed: output.tokensUsed || 0,
          cost: output.cost || 0
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in output generation',
        metrics: {
          duration
        }
      };
    }
  }

  async validate(step: WorkflowStep, context: WorkflowContext): Promise<boolean> {
    // Check if we have the required previous step results
    if (!context.stepResults['analyze_input']?.data?.analysis) {
      return false;
    }

    if (!context.stepResults['breakdown_structure']?.data?.structure) {
      return false;
    }

    // Validate configuration
    const config = step.config || {};
    if (config.outputType && !this.isValidOutputType(config.outputType)) {
      return false;
    }

    return true;
  }

  private async generateOutput(input: Record<string, any>, analysis: any, structure: any, config: Record<string, any>): Promise<any> {
    const outputType = config.outputType || structure?.type || 'general';
    const inputText = this.extractTextFromInput(input);
    
    switch (outputType) {
      case 'article':
        return this.generateArticle(inputText, analysis, structure, config);
      case 'script':
        return this.generateScript(inputText, analysis, structure, config);
      case 'ad_copy':
        return this.generateAdCopy(inputText, analysis, structure, config);
      case 'email':
        return this.generateEmail(inputText, analysis, structure, config);
      case 'social_media':
        return this.generateSocialMedia(inputText, analysis, structure, config);
      case 'landing_page':
        return this.generateLandingPage(inputText, analysis, structure, config);
      default:
        return this.generateGeneral(inputText, analysis, structure, config);
    }
  }

  private async generateArticle(text: string, analysis: any, structure: any, config: Record<string, any>): Promise<any> {
    const prompt = this.buildArticlePrompt(text, analysis, structure, config);
    
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert article writer. Write a compelling, well-structured article based on the provided analysis and structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.7
    });

    const content = response.choices[0]?.message?.content || '';
    
    return {
      content,
      type: 'article',
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        wordCount: content.split(/\s+/).length,
        estimatedReadTime: Math.ceil(content.split(/\s+/).length / 200)
      }
    };
  }

  private async generateScript(text: string, analysis: any, structure: any, config: Record<string, any>): Promise<any> {
    const prompt = this.buildScriptPrompt(text, analysis, structure, config);
    
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert script writer. Write an engaging script based on the provided analysis and structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config.maxTokens || 1500,
      temperature: config.temperature || 0.8
    });

    const content = response.choices[0]?.message?.content || '';
    
    return {
      content,
      type: 'script',
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        estimatedDuration: this.estimateScriptDuration(content),
        wordCount: content.split(/\s+/).length
      }
    };
  }

  private async generateAdCopy(text: string, analysis: any, structure: any, config: Record<string, any>): Promise<any> {
    const prompt = this.buildAdCopyPrompt(text, analysis, structure, config);
    
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert copywriter. Write persuasive ad copy based on the provided analysis and structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config.maxTokens || 800,
      temperature: config.temperature || 0.8
    });

    const content = response.choices[0]?.message?.content || '';
    
    return {
      content,
      type: 'ad_copy',
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        characterCount: content.length,
        hasCallToAction: content.toLowerCase().includes('call to action') || content.toLowerCase().includes('cta')
      }
    };
  }

  private async generateEmail(text: string, analysis: any, structure: any, config: Record<string, any>): Promise<any> {
    const prompt = this.buildEmailPrompt(text, analysis, structure, config);
    
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert email marketer. Write a professional email based on the provided analysis and structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.6
    });

    const content = response.choices[0]?.message?.content || '';
    
    return {
      content,
      type: 'email',
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        wordCount: content.split(/\s+/).length,
        hasPersonalization: this.hasPersonalization(content)
      }
    };
  }

  private async generateSocialMedia(text: string, analysis: any, structure: any, config: Record<string, any>): Promise<any> {
    const prompt = this.buildSocialMediaPrompt(text, analysis, structure, config);
    
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert social media manager. Write engaging social media content based on the provided analysis and structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config.maxTokens || 600,
      temperature: config.temperature || 0.8
    });

    const content = response.choices[0]?.message?.content || '';
    
    return {
      content,
      type: 'social_media',
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        characterCount: content.length,
        hashtagCount: (content.match(/#\w+/g) || []).length,
        engagementElements: this.countEngagementElements(content)
      }
    };
  }

  private async generateLandingPage(text: string, analysis: any, structure: any, config: Record<string, any>): Promise<any> {
    const prompt = this.buildLandingPagePrompt(text, analysis, structure, config);
    
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert landing page copywriter. Write compelling landing page content based on the provided analysis and structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config.maxTokens || 1800,
      temperature: config.temperature || 0.7
    });

    const content = response.choices[0]?.message?.content || '';
    
    return {
      content,
      type: 'landing_page',
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        wordCount: content.split(/\s+/).length,
        sectionCount: this.countSections(content),
        hasCallToAction: content.toLowerCase().includes('call to action')
      }
    };
  }

  private async generateGeneral(text: string, analysis: any, structure: any, config: Record<string, any>): Promise<any> {
    const prompt = this.buildGeneralPrompt(text, analysis, structure, config);
    
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content creator. Write high-quality content based on the provided analysis and structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config.maxTokens || 1200,
      temperature: config.temperature || 0.7
    });

    const content = response.choices[0]?.message?.content || '';
    
    return {
      content,
      type: 'general',
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0),
      metadata: {
        wordCount: content.split(/\s+/).length,
        paragraphCount: content.split(/\n\n+/).length
      }
    };
  }

  private buildArticlePrompt(text: string, analysis: any, structure: any, config: Record<string, any>): string {
    return `
Write an article based on the following information:

Original Input: ${text}

Analysis Results: ${JSON.stringify(analysis)}

Structure: ${JSON.stringify(structure)}

Requirements:
- Tone: ${config.tone || 'informative and engaging'}
- Target Audience: ${config.targetAudience || 'general audience'}
- Length: ${config.length || 'medium-length article'}
- Style: ${config.style || 'professional but accessible'}

Please ensure the article follows the structure and incorporates the insights from the analysis.
`;
  }

  private buildScriptPrompt(text: string, analysis: any, structure: any, config: Record<string, any>): string {
    return `
Write a script based on the following information:

Original Input: ${text}

Analysis Results: ${JSON.stringify(analysis)}

Structure: ${JSON.stringify(structure)}

Requirements:
- Style: ${config.scriptStyle || 'conversational and engaging'}
- Duration: ${config.duration || '5-10 minutes'}
- Platform: ${config.platform || 'general video content'}
- Hook: Start with a strong opening hook

Please ensure the script follows the structure and maintains audience engagement throughout.
`;
  }

  private buildAdCopyPrompt(text: string, analysis: any, structure: any, config: Record<string, any>): string {
    return `
Write ad copy based on the following information:

Original Input: ${text}

Analysis Results: ${JSON.stringify(analysis)}

Structure: ${JSON.stringify(structure)}

Requirements:
- Goal: ${config.goal || 'drive conversions'}
- Platform: ${config.platform || 'general advertising'}
- Tone: ${config.tone || 'persuasive and trustworthy'}
- Call to Action: Include a clear CTA

Please ensure the ad copy follows the structure and effectively communicates the value proposition.
`;
  }

  private buildEmailPrompt(text: string, analysis: any, structure: any, config: Record<string, any>): string {
    return `
Write an email based on the following information:

Original Input: ${text}

Analysis Results: ${JSON.stringify(analysis)}

Structure: ${JSON.stringify(structure)}

Requirements:
- Purpose: ${config.purpose || 'informational'}
- Tone: ${config.tone || 'professional and friendly'}
- Personalization: ${config.personalization || 'moderate personalization'}
- Call to Action: ${config.cta || 'clear next step'}

Please ensure the email follows the structure and maintains engagement throughout.
`;
  }

  private buildSocialMediaPrompt(text: string, analysis: any, structure: any, config: Record<string, any>): string {
    return `
Write social media content based on the following information:

Original Input: ${text}

Analysis Results: ${JSON.stringify(analysis)}

Structure: ${JSON.stringify(structure)}

Requirements:
- Platform: ${config.platform || 'general social media'}
- Tone: ${config.tone || 'engaging and conversational'}
- Hashtags: Include relevant hashtags
- Engagement: Include engagement elements

Please ensure the content follows the structure and maximizes engagement potential.
`;
  }

  private buildLandingPagePrompt(text: string, analysis: any, structure: any, config: Record<string, any>): string {
    return `
Write landing page content based on the following information:

Original Input: ${text}

Analysis Results: ${JSON.stringify(analysis)}

Structure: ${JSON.stringify(structure)}

Requirements:
- Goal: ${config.goal || 'generate leads or sales'}
- Tone: ${config.tone || 'persuasive and trustworthy'}
- Value Proposition: Clearly communicate value
- Call to Action: Strong, clear CTA

Please ensure the content follows the structure and effectively converts visitors.
`;
  }

  private buildGeneralPrompt(text: string, analysis: any, structure: any, config: Record<string, any>): string {
    return `
Write content based on the following information:

Original Input: ${text}

Analysis Results: ${JSON.stringify(analysis)}

Structure: ${JSON.stringify(structure)}

Requirements:
- Purpose: ${config.purpose || 'informative content'}
- Tone: ${config.tone || 'professional and clear'}
- Length: ${config.length || 'medium length'}
- Style: ${config.style || 'clear and structured'}

Please ensure the content follows the structure and meets the specified requirements.
`;
  }

  private extractTextFromInput(input: Record<string, any>): string {
    if (typeof input === 'string') {
      return input;
    }

    const textFields = ['text', 'content', 'input', 'prompt', 'query', 'topic', 'description'];
    for (const field of textFields) {
      if (input[field] && typeof input[field] === 'string') {
        return input[field];
      }
    }

    return JSON.stringify(input);
  }

  private assessQuality(content: string, config: Record<string, any>): {
    score: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let score = 70; // Base score

    // Length assessment
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 100 && wordCount <= 2000) {
      score += 10;
      factors.push('Appropriate length');
    }

    // Structure assessment
    if (content.includes('\n') || content.includes('.')) {
      score += 5;
      factors.push('Good structure');
    }

    // Engagement assessment
    const engagementWords = ['you', 'your', 'imagine', 'discover', 'learn', 'benefit'];
    const hasEngagement = engagementWords.some(word => content.toLowerCase().includes(word));
    if (hasEngagement) {
      score += 10;
      factors.push('Engaging language');
    }

    // Clarity assessment
    const avgSentenceLength = content.split('.').reduce((acc, sentence) => acc + sentence.split(/\s+/).length, 0) / content.split('.').length;
    if (avgSentenceLength <= 20) {
      score += 5;
      factors.push('Clear sentences');
    }

    return {
      score: Math.min(100, score),
      factors
    };
  }

  private generateSuggestions(content: string, analysis: any, config: Record<string, any>): string[] {
    const suggestions: string[] = [];

    if (content.length < 200) {
      suggestions.push('Consider adding more detail to fully develop the topic');
    }

    if (!content.includes('?') && !content.includes('!')) {
      suggestions.push('Add questions or exclamations to increase engagement');
    }

    if (analysis.audience === 'technical' && content.split(/\s+/).length < 500) {
      suggestions.push('Technical audiences may appreciate more detailed explanations');
    }

    if (!content.toLowerCase().includes('you')) {
      suggestions.push('Consider addressing the reader directly for better engagement');
    }

    return suggestions;
  }

  private estimateScriptDuration(content: string): string {
    const wordsPerMinute = 150;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} minutes`;
  }

  private hasPersonalization(content: string): boolean {
    const personalizationWords = ['you', 'your', 'name', 'specifically', 'tailored', 'custom'];
    return personalizationWords.some(word => content.toLowerCase().includes(word));
  }

  private countEngagementElements(content: string): number {
    const elements = ['?', '!', 'you', 'your', 'imagine', 'picture this'];
    return elements.reduce((count, element) => {
      return count + (content.toLowerCase().split(element).length - 1);
    }, 0);
  }

  private countSections(content: string): number {
    const sections = content.split(/\n\n+/).filter(section => section.trim().length > 0);
    return sections.length;
  }

  private isValidOutputType(type: string): boolean {
    const validTypes = ['article', 'script', 'ad_copy', 'email', 'social_media', 'landing_page', 'general'];
    return validTypes.includes(type);
  }

  private calculateCost(tokens: number): number {
    return tokens * 0.000002;
  }
}
