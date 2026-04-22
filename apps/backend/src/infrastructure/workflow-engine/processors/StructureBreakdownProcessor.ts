import OpenAI from 'openai';
import { IStepProcessor } from '@/domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowStep, WorkflowContext, StepResult, WorkflowStepType } from '@/domain/workflow-engine/entities/Workflow';

export class StructureBreakdownProcessor implements IStepProcessor {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  canProcess(stepType: string): boolean {
    return stepType === WorkflowStepType.BREAKDOWN_STRUCTURE;
  }

  async process(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      const config = step.config || {};
      const analysisResult = context.stepResults['analyze_input']?.data?.analysis;
      
      // Break down the input into structured components
      const structure = await this.breakdownStructure(context.input, analysisResult, config);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          structure,
          components: this.extractComponents(structure),
          outline: this.generateOutline(structure),
          metadata: this.generateMetadata(structure, config)
        },
        metrics: {
          duration,
          tokensUsed: structure.tokensUsed || 0,
          cost: structure.cost || 0
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in structure breakdown',
        metrics: {
          duration
        }
      };
    }
  }

  async validate(step: WorkflowStep, context: WorkflowContext): Promise<boolean> {
    // Check if we have input analysis results
    if (!context.stepResults['analyze_input']?.data?.analysis) {
      return false;
    }

    // Validate configuration
    const config = step.config || {};
    if (config.structureType && !this.isValidStructureType(config.structureType)) {
      return false;
    }

    return true;
  }

  private async breakdownStructure(input: Record<string, any>, analysis: any, config: Record<string, any>): Promise<any> {
    const structureType = config.structureType || 'general';
    const inputText = this.extractTextFromInput(input);
    
    switch (structureType) {
      case 'article':
        return this.breakdownArticle(inputText, analysis, config);
      case 'script':
        return this.breakdownScript(inputText, analysis, config);
      case 'ad_copy':
        return this.breakdownAdCopy(inputText, analysis, config);
      case 'email':
        return this.breakdownEmail(inputText, analysis, config);
      case 'social_media':
        return this.breakdownSocialMedia(inputText, analysis, config);
      case 'landing_page':
        return this.breakdownLandingPage(inputText, analysis, config);
      default:
        return this.breakdownGeneral(inputText, analysis, config);
    }
  }

  private async breakdownArticle(text: string, analysis: any, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content structurer. Break down the content into a structured article format with title, introduction, main sections, conclusion, and key points. Return as JSON.'
        },
        {
          role: 'user',
          content: `Break down this article content: ${text}\n\nAnalysis: ${JSON.stringify(analysis)}`
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const structure = JSON.parse(content);
      return {
        ...structure,
        type: 'article',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        type: 'article',
        title: '',
        introduction: '',
        sections: [],
        conclusion: '',
        keyPoints: [],
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
  }

  private async breakdownScript(text: string, analysis: any, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert script writer. Break down the content into a structured script format with hook, introduction, main content segments, calls to action, and closing. Return as JSON.'
        },
        {
          role: 'user',
          content: `Break down this script content: ${text}\n\nAnalysis: ${JSON.stringify(analysis)}`
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const structure = JSON.parse(content);
      return {
        ...structure,
        type: 'script',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        type: 'script',
        hook: '',
        introduction: '',
        segments: [],
        callToAction: '',
        closing: '',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
  }

  private async breakdownAdCopy(text: string, analysis: any, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert copywriter. Break down the content into structured ad copy with headline, subheadline, body copy, call to action, and value proposition. Return as JSON.'
        },
        {
          role: 'user',
          content: `Break down this ad copy: ${text}\n\nAnalysis: ${JSON.stringify(analysis)}`
        }
      ],
      max_tokens: 600,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const structure = JSON.parse(content);
      return {
        ...structure,
        type: 'ad_copy',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        type: 'ad_copy',
        headline: '',
        subheadline: '',
        bodyCopy: '',
        callToAction: '',
        valueProposition: '',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
  }

  private async breakdownEmail(text: string, analysis: any, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert email marketer. Break down the content into structured email format with subject line, greeting, body, call to action, and signature. Return as JSON.'
        },
        {
          role: 'user',
          content: `Break down this email content: ${text}\n\nAnalysis: ${JSON.stringify(analysis)}`
        }
      ],
      max_tokens: 600,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const structure = JSON.parse(content);
      return {
        ...structure,
        type: 'email',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        type: 'email',
        subjectLine: '',
        greeting: '',
        body: '',
        callToAction: '',
        signature: '',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
  }

  private async breakdownSocialMedia(text: string, analysis: any, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert social media manager. Break down the content into structured social media format with hook, main content, hashtags, and engagement elements. Return as JSON.'
        },
        {
          role: 'user',
          content: `Break down this social media content: ${text}\n\nAnalysis: ${JSON.stringify(analysis)}`
        }
      ],
      max_tokens: 600,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const structure = JSON.parse(content);
      return {
        ...structure,
        type: 'social_media',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        type: 'social_media',
        hook: '',
        mainContent: '',
        hashtags: [],
        engagementElements: [],
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
  }

  private async breakdownLandingPage(text: string, analysis: any, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert landing page optimizer. Break down the content into structured landing page format with hero section, features, benefits, social proof, and call to action. Return as JSON.'
        },
        {
          role: 'user',
          content: `Break down this landing page content: ${text}\n\nAnalysis: ${JSON.stringify(analysis)}`
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const structure = JSON.parse(content);
      return {
        ...structure,
        type: 'landing_page',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        type: 'landing_page',
        heroSection: '',
        features: [],
        benefits: [],
        socialProof: '',
        callToAction: '',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
  }

  private async breakdownGeneral(text: string, analysis: any, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content structurer. Break down the content into logical sections with clear hierarchy and flow. Return as JSON.'
        },
        {
          role: 'user',
          content: `Break down this content: ${text}\n\nAnalysis: ${JSON.stringify(analysis)}`
        }
      ],
      max_tokens: 600,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const structure = JSON.parse(content);
      return {
        ...structure,
        type: 'general',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        type: 'general',
        sections: [],
        hierarchy: [],
        flow: '',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
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

  private extractComponents(structure: any): string[] {
    const components: string[] = [];
    
    if (structure.type === 'article') {
      components.push('title', 'introduction', 'sections', 'conclusion');
    } else if (structure.type === 'script') {
      components.push('hook', 'introduction', 'segments', 'callToAction');
    } else if (structure.type === 'ad_copy') {
      components.push('headline', 'subheadline', 'bodyCopy', 'callToAction');
    } else if (structure.type === 'email') {
      components.push('subjectLine', 'greeting', 'body', 'callToAction');
    } else if (structure.type === 'social_media') {
      components.push('hook', 'mainContent', 'hashtags', 'engagementElements');
    } else if (structure.type === 'landing_page') {
      components.push('heroSection', 'features', 'benefits', 'callToAction');
    } else {
      components.push('sections', 'hierarchy', 'flow');
    }
    
    return components;
  }

  private generateOutline(structure: any): any {
    const outline: any = {
      type: structure.type,
      sections: []
    };

    if (structure.type === 'article') {
      outline.sections = [
        { name: 'Title', content: structure.title },
        { name: 'Introduction', content: structure.introduction },
        ...structure.sections.map((section: any, index: number) => ({
          name: `Section ${index + 1}`,
          content: section
        })),
        { name: 'Conclusion', content: structure.conclusion }
      ];
    } else if (structure.type === 'script') {
      outline.sections = [
        { name: 'Hook', content: structure.hook },
        { name: 'Introduction', content: structure.introduction },
        ...structure.segments.map((segment: any, index: number) => ({
          name: `Segment ${index + 1}`,
          content: segment
        })),
        { name: 'Call to Action', content: structure.callToAction }
      ];
    }

    return outline;
  }

  private generateMetadata(structure: any, config: Record<string, any>): any {
    return {
      structureType: structure.type,
      componentCount: this.extractComponents(structure).length,
      complexity: this.assessComplexity(structure),
      estimatedLength: this.estimateLength(structure),
      processingHints: this.getProcessingHints(structure, config)
    };
  }

  private assessComplexity(structure: any): 'low' | 'medium' | 'high' {
    const componentCount = this.extractComponents(structure).length;
    
    if (componentCount <= 3) return 'low';
    if (componentCount <= 5) return 'medium';
    return 'high';
  }

  private estimateLength(structure: any): number {
    // Rough estimation based on structure type and components
    const baseLengths: Record<string, number> = {
      article: 1000,
      script: 800,
      ad_copy: 300,
      email: 400,
      social_media: 200,
      landing_page: 600,
      general: 500
    };

    return baseLengths[structure.type] || 500;
  }

  private getProcessingHints(structure: any, config: Record<string, any>): string[] {
    const hints: string[] = [];
    
    if (structure.type === 'article') {
      hints.push('Focus on clear section transitions');
      hints.push('Maintain consistent tone throughout');
    } else if (structure.type === 'script') {
      hints.push('Use conversational language');
      hints.push('Include engagement hooks');
    } else if (structure.type === 'ad_copy') {
      hints.push('Emphasize value proposition');
      hints.push('Create urgency');
    }

    return hints;
  }

  private isValidStructureType(type: string): boolean {
    const validTypes = ['article', 'script', 'ad_copy', 'email', 'social_media', 'landing_page', 'general'];
    return validTypes.includes(type);
  }

  private calculateCost(tokens: number): number {
    return tokens * 0.000002;
  }
}
