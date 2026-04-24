import OpenAI from 'openai';
import { IAIGenerator } from '@/domain/services/IWorkflowEngine';

export class OpenAIGenerator implements IAIGenerator {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ 
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1'
    });
  }

  async generateContent(prompt: string, config?: Record<string, any>): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: config?.model || 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a professional content writer. Create high-quality, engaging content based on the user\'s requirements.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config?.maxTokens || 1000,
      temperature: config?.temperature || 0.7,
    });

    return response.choices[0]?.message?.content || '';
  }

  async generateYouTubeScript(topic: string, config?: Record<string, any>): Promise<string> {
    const duration = config?.duration || '10 minutes';
    const style = config?.style || 'educational';
    
    const prompt = `Create a YouTube script about "${topic}" for a ${duration} video in ${style} style. 
    Include:
    - Hook/Introduction
    - Main content points
    - Call to action
    - Estimated timing for each section
    
    Format the script clearly with timestamps and speaker notes.`;

    const response = await this.openai.chat.completions.create({
      model: config?.model || 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an experienced YouTube script writer. Create engaging, well-structured scripts that keep viewers engaged.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config?.maxTokens || 1500,
      temperature: config?.temperature || 0.8,
    });

    return response.choices[0]?.message?.content || '';
  }

  async generateSEOContent(content: string, keywords: string[], config?: Record<string, any>): Promise<string> {
    const keywordString = keywords.join(', ');
    const prompt = `Optimize the following content for SEO using these keywords: ${keywordString}

Original content:
${content}

Please:
1. Naturally incorporate the keywords
2. Add proper heading structure (H1, H2, H3)
3. Include meta description
4. Add title suggestions
5. Maintain readability and flow
6. Include internal linking suggestions

Return the optimized content with clear sections for each SEO element.`;

    const response = await this.openai.chat.completions.create({
      model: config?.model || 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an SEO expert. Optimize content while maintaining quality and readability.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config?.maxTokens || 2000,
      temperature: config?.temperature || 0.3,
    });

    return response.choices[0]?.message?.content || '';
  }
}
