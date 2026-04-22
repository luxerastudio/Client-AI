import OpenAI from 'openai';
import { IPromptStructuringService } from '@/domain/ai-engine/services/IInputAnalysisService';
import { AnalysisResult } from '@/domain/ai-engine/entities/AIWorkflow';

export class PromptStructuringService implements IPromptStructuringService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async createPromptTemplate(analysis: AnalysisResult, config: Record<string, any>): Promise<{
    systemPrompt: string;
    userPromptTemplate: string;
    variables: Array<{ name: string; type: string; required: boolean }>;
  }> {
    const baseSystemPrompt = this.generateBaseSystemPrompt(analysis, config);
    const userPromptTemplate = this.generateUserPromptTemplate(analysis, config);
    const variables = this.extractVariables(userPromptTemplate);

    return {
      systemPrompt: baseSystemPrompt,
      userPromptTemplate,
      variables
    };
  }

  async optimizePrompt(prompt: string, target: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a prompt engineering expert. Optimize the given prompt to achieve the target outcome while maintaining clarity and effectiveness.'
        },
        {
          role: 'user',
          content: `Optimize this prompt for: ${target}\n\nOriginal prompt: ${prompt}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content?.trim() || prompt;
  }

  async validatePrompt(prompt: string): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a prompt validation expert. Analyze the prompt and identify issues and suggestions. Return as JSON with format: {"isValid": true, "issues": [], "suggestions": []}'
        },
        {
          role: 'user',
          content: `Validate this prompt: ${prompt}`
        }
      ],
      max_tokens: 300,
      temperature: 0.1
    });

    try {
      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch {
      return {
        isValid: true,
        issues: [],
        suggestions: ['Consider adding more specific instructions']
      };
    }
  }

  async contextualizePrompt(prompt: string, context: Record<string, any>): Promise<string> {
    const contextString = JSON.stringify(context, null, 2);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a prompt contextualization expert. Enhance the prompt with relevant context while maintaining its core intent.'
        },
        {
          role: 'user',
          content: `Enhance this prompt with context:\n\nPrompt: ${prompt}\n\nContext: ${contextString}`
        }
      ],
      max_tokens: 600,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content?.trim() || prompt;
  }

  private generateBaseSystemPrompt(analysis: AnalysisResult, config: Record<string, any>): string {
    const baseInstructions = this.getBaseInstructionsByIntent(analysis.intent);
    const complexityInstructions = this.getComplexityInstructions(analysis.complexity);
    const styleInstructions = config.style || 'professional and clear';
    const outputFormat = config.outputFormat || 'well-structured text';

    return `You are an expert AI assistant specializing in ${analysis.intent}. 

${baseInstructions}

${complexityInstructions}

Style: ${styleInstructions}
Output Format: ${outputFormat}

Guidelines:
- Be accurate and helpful
- Maintain consistency throughout
- Consider the ${analysis.sentiment} tone of the request
- Focus on quality and relevance
- Use the provided context effectively`;
  }

  private generateUserPromptTemplate(analysis: AnalysisResult, config: Record<string, any>): string {
    const template = this.getTemplateByIntent(analysis.intent);
    const contextVariables = this.getContextVariables(analysis);
    
    return `${template}

Context Information:
${contextVariables.map(variable => `- ${variable.name}: {{${variable.name}}}`).join('\n')}

{{userInput}}

Additional Requirements:
{{additionalRequirements}}`;
  }

  private getBaseInstructionsByIntent(intent: string): string {
    const instructions: Record<string, string> = {
      'content generation': 'creating high-quality, engaging content that meets the user\'s specific needs and requirements',
      'analysis': 'providing thorough, insightful analysis with clear reasoning and supporting evidence',
      'transformation': 'converting or reformatting information while maintaining accuracy and improving clarity',
      'optimization': 'improving and refining content to achieve better results and effectiveness',
      'summarization': 'condensing information while preserving key points and essential meaning',
      'explanation': 'providing clear, comprehensive explanations that are easy to understand',
      'creative writing': 'producing creative, original content that engages and inspires the audience',
      'technical writing': 'creating precise, accurate technical documentation and explanations'
    };

    return instructions[intent.toLowerCase()] || 'assisting with various tasks to provide helpful and accurate responses';
  }

  private getComplexityInstructions(complexity: string): string {
    const instructions: Record<string, string> = {
      'low': 'Provide a straightforward, concise response that directly addresses the request.',
      'medium': 'Provide a detailed response with appropriate depth and relevant examples.',
      'high': 'Provide a comprehensive, in-depth response with thorough analysis, multiple perspectives, and detailed explanations.'
    };

    return instructions[complexity] || instructions['medium'];
  }

  private getTemplateByIntent(intent: string): string {
    const templates: Record<string, string> = {
      'content generation': 'Please generate high-quality content based on the following request and context.',
      'analysis': 'Please analyze the following information and provide comprehensive insights.',
      'transformation': 'Please transform the following input according to the specified requirements.',
      'optimization': 'Please optimize the provided content to improve its effectiveness and quality.',
      'summarization': 'Please summarize the following information while preserving key points.',
      'explanation': 'Please provide a clear explanation of the following topic or concept.',
      'creative writing': 'Please create engaging creative content based on the following prompt.',
      'technical writing': 'Please provide clear, accurate technical information about the following topic.'
    };

    return templates[intent.toLowerCase()] || 'Please assist with the following request:';
  }

  private getContextVariables(analysis: AnalysisResult): Array<{ name: string; type: string }> {
    const variables: Array<{ name: string; type: string }> = [
      { name: 'userInput', type: 'string' },
      { name: 'additionalRequirements', type: 'string' }
    ];

    if (analysis.entities.length > 0) {
      variables.push({ name: 'entities', type: 'array' });
    }

    if (analysis.sentiment !== 'neutral') {
      variables.push({ name: 'sentiment', type: 'string' });
    }

    variables.push({ name: 'complexity', type: 'string' });
    variables.push({ name: 'intent', type: 'string' });

    return variables;
  }

  private extractVariables(template: string): Array<{ name: string; type: string; required: boolean }> {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: Array<{ name: string; type: string; required: boolean }> = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const variableName = match[1];
      variables.push({
        name: variableName,
        type: this.inferVariableType(variableName),
        required: variableName === 'userInput'
      });
    }

    return variables;
  }

  private inferVariableType(variableName: string): string {
    const typeMappings: Record<string, string> = {
      'userInput': 'string',
      'entities': 'array',
      'sentiment': 'string',
      'complexity': 'string',
      'intent': 'string',
      'additionalRequirements': 'string'
    };

    return typeMappings[variableName] || 'string';
  }
}
