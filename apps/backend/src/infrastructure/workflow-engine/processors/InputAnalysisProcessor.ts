import OpenAI from 'openai';
import { IStepProcessor } from '@/domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowStep, WorkflowContext, StepResult, WorkflowStepType } from '@/domain/workflow-engine/entities/Workflow';

export class InputAnalysisProcessor implements IStepProcessor {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  canProcess(stepType: string): boolean {
    return stepType === WorkflowStepType.ANALYZE_INPUT;
  }

  async process(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      const input = context.input;
      const config = step.config || {};
      
      // Analyze the input based on the workflow type and configuration
      const analysis = await this.analyzeInput(input, config);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          analysis,
          insights: this.generateInsights(analysis, config),
          recommendations: this.generateRecommendations(analysis, config)
        },
        metrics: {
          duration,
          tokensUsed: analysis.tokensUsed || 0,
          cost: analysis.cost || 0
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in input analysis',
        metrics: {
          duration
        }
      };
    }
  }

  async validate(step: WorkflowStep, context: WorkflowContext): Promise<boolean> {
    // Validate that we have the required input
    if (!context.input || Object.keys(context.input).length === 0) {
      return false;
    }

    // Validate configuration
    const config = step.config || {};
    if (config.requiredFields && Array.isArray(config.requiredFields)) {
      for (const field of config.requiredFields) {
        if (!context.input[field]) {
          return false;
        }
      }
    }

    return true;
  }

  private async analyzeInput(input: Record<string, any>, config: Record<string, any>): Promise<any> {
    const analysisType = config.analysisType || 'general';
    const inputText = this.extractTextFromInput(input);
    
    switch (analysisType) {
      case 'content':
        return this.analyzeContent(inputText, config);
      case 'topic':
        return this.analyzeTopic(inputText, config);
      case 'audience':
        return this.analyzeAudience(inputText, config);
      case 'seo':
        return this.analyzeSEO(inputText, config);
      case 'marketing':
        return this.analyzeMarketing(inputText, config);
      default:
        return this.analyzeGeneral(inputText, config);
    }
  }

  private async analyzeGeneral(text: string, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content analyst. Analyze the input and provide insights about intent, complexity, key themes, and suggested approach. Return as JSON.'
        },
        {
          role: 'user',
          content: `Analyze this content: ${text}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const analysis = JSON.parse(content);
      return {
        ...analysis,
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        intent: 'general',
        complexity: 'medium',
        themes: [],
        approach: 'standard',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
  }

  private async analyzeContent(text: string, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a content analysis expert. Analyze the content for structure, tone, readability, engagement potential, and target audience. Return as JSON.'
        },
        {
          role: 'user',
          content: `Analyze this content: ${text}`
        }
      ],
      max_tokens: 600,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const analysis = JSON.parse(content);
      return {
        ...analysis,
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        structure: 'standard',
        tone: 'neutral',
        readability: 'medium',
        engagement: 'medium',
        audience: 'general',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
  }

  private async analyzeTopic(text: string, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a topic analysis expert. Identify the main topic, subtopics, keywords, and topic complexity. Return as JSON.'
        },
        {
          role: 'user',
          content: `Analyze this topic: ${text}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const analysis = JSON.parse(content);
      return {
        ...analysis,
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        mainTopic: 'unknown',
        subtopics: [],
        keywords: [],
        complexity: 'medium',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
  }

  private async analyzeAudience(text: string, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an audience analysis expert. Identify the target audience, their characteristics, knowledge level, and interests. Return as JSON.'
        },
        {
          role: 'user',
          content: `Analyze the audience for: ${text}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const analysis = JSON.parse(content);
      return {
        ...analysis,
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        primaryAudience: 'general',
        demographics: {},
        knowledgeLevel: 'intermediate',
        interests: [],
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
  }

  private async analyzeSEO(text: string, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an SEO analysis expert. Identify keywords, search intent, content gaps, and optimization opportunities. Return as JSON.'
        },
        {
          role: 'user',
          content: `Analyze SEO aspects of: ${text}`
        }
      ],
      max_tokens: 600,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const analysis = JSON.parse(content);
      return {
        ...analysis,
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        keywords: [],
        searchIntent: 'informational',
        contentGaps: [],
        opportunities: [],
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
  }

  private async analyzeMarketing(text: string, config: Record<string, any>): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a marketing analysis expert. Analyze the marketing potential, target market, value proposition, and competitive positioning. Return as JSON.'
        },
        {
          role: 'user',
          content: `Analyze marketing aspects of: ${text}`
        }
      ],
      max_tokens: 600,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const analysis = JSON.parse(content);
      return {
        ...analysis,
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    } catch {
      return {
        marketPotential: 'medium',
        targetMarket: 'general',
        valueProposition: '',
        positioning: '',
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      };
    }
  }

  private extractTextFromInput(input: Record<string, any>): string {
    if (typeof input === 'string') {
      return input;
    }

    // Try common text fields
    const textFields = ['text', 'content', 'input', 'prompt', 'query', 'topic', 'description'];
    for (const field of textFields) {
      if (input[field] && typeof input[field] === 'string') {
        return input[field];
      }
    }

    // If no text field found, stringify the input
    return JSON.stringify(input);
  }

  private generateInsights(analysis: any, config: Record<string, any>): string[] {
    const insights: string[] = [];
    
    if (analysis.complexity) {
      insights.push(`Content complexity is ${analysis.complexity}`);
    }
    
    if (analysis.tone) {
      insights.push(`Content tone is ${analysis.tone}`);
    }
    
    if (analysis.targetAudience) {
      insights.push(`Target audience: ${analysis.targetAudience}`);
    }
    
    if (analysis.keywords && analysis.keywords.length > 0) {
      insights.push(`Key topics: ${analysis.keywords.slice(0, 3).join(', ')}`);
    }
    
    return insights;
  }

  private generateRecommendations(analysis: any, config: Record<string, any>): string[] {
    const recommendations: string[] = [];
    
    if (analysis.complexity === 'high') {
      recommendations.push('Consider breaking down into simpler components');
    }
    
    if (analysis.readability === 'low') {
      recommendations.push('Improve readability with simpler language');
    }
    
    if (analysis.engagement === 'low') {
      recommendations.push('Add more engaging elements and hooks');
    }
    
    if (analysis.audience === 'technical') {
      recommendations.push('Use appropriate technical terminology');
    }
    
    return recommendations;
  }

  private calculateCost(tokens: number): number {
    // Rough cost calculation for GPT-3.5-turbo
    return tokens * 0.000002;
  }
}
