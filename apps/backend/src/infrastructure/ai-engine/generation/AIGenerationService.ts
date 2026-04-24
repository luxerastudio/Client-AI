import OpenAI from 'openai';
import { IAIGenerationService } from '@/domain/ai-engine/services/IInputAnalysisService';

export class AIGenerationService implements IAIGenerationService {
  private openai: OpenAI;
  private modelCosts: Map<string, number> = new Map([
    ['llama-3.3-70b-versatile', 0.000001],
    ['gpt-3.5-turbo', 0.000002],
    ['gpt-4', 0.00003],
    ['gpt-4-turbo', 0.00001],
    ['text-davinci-003', 0.00002]
  ]);

  constructor(apiKey: string) {
    this.openai = new OpenAI({ 
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1'
    });
  }

  async generate(request: {
    prompt: string;
    config: Record<string, any>;
    context?: Record<string, any>;
  }): Promise<{
    content: string;
    tokens: { prompt: number; completion: number; total: number };
    model: string;
    processingTime: number;
    cost: number;
  }> {
    const startTime = Date.now();
    const model = request.config.model || 'llama-3.3-70b-versatile';
    
    try {
      const messages = this.buildMessages(request.prompt, request.context, request.config);
      
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        max_tokens: request.config.maxTokens || 1000,
        temperature: request.config.temperature || 0.7,
        top_p: request.config.topP,
        frequency_penalty: request.config.frequencyPenalty,
        presence_penalty: request.config.presencePenalty,
        stream: false
      });

      const content = response.choices[0]?.message?.content || '';
      const promptTokens = response.usage?.prompt_tokens || 0;
      const completionTokens = response.usage?.completion_tokens || 0;
      const totalTokens = response.usage?.total_tokens || 0;
      
      const processingTime = Date.now() - startTime;
      const cost = await this.estimateCost(totalTokens, model);

      return {
        content,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens
        },
        model,
        processingTime,
        cost
      };
    } catch (error) {
      throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async batchGenerate(requests: Array<{
    prompt: string;
    config: Record<string, any>;
    context?: Record<string, any>;
  }>): Promise<Array<{
    content: string;
    tokens: { prompt: number; completion: number; total: number };
    model: string;
    processingTime: number;
    cost: number;
  }>> {
    const batchSize = 5; // Process in batches to avoid rate limits
    const results: Array<any> = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.generate(request));
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            content: '',
            tokens: { prompt: 0, completion: 0, total: 0 },
            model: 'unknown',
            processingTime: 0,
            cost: 0,
            error: result.reason
          });
        }
      }
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  async estimateTokens(text: string): Promise<number> {
    // Rough estimation: ~4 characters per token for English
    const roughEstimate = Math.ceil(text.length / 4);
    
    // For more accurate estimation, we could use tiktoken library
    // For now, return the rough estimate
    return roughEstimate;
  }

  async estimateCost(tokens: number, model: string): Promise<number> {
    const costPerToken = this.modelCosts.get(model) || 0.000002;
    return tokens * costPerToken;
  }

  private buildMessages(prompt: string, context?: Record<string, any>, config?: Record<string, any>): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Add system message if provided
    if (config?.systemPrompt) {
      messages.push({
        role: 'system',
        content: config.systemPrompt
      });
    }

    // Add context if provided
    if (context && Object.keys(context).length > 0) {
      const contextString = this.formatContext(context);
      messages.push({
        role: 'system',
        content: `Context: ${contextString}`
      });
    }

    // Add user prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    return messages;
  }

  private formatContext(context: Record<string, any>): string {
    return Object.entries(context)
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}: ${JSON.stringify(value, null, 2)}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');
  }

  // Advanced generation methods for specific use cases

  async generateWithChainOfThought(prompt: string, config: Record<string, any>): Promise<{
    content: string;
    reasoning?: string;
    tokens: { prompt: number; completion: number; total: number };
    model: string;
    processingTime: number;
    cost: number;
  }> {
    const cotPrompt = `Please think step by step to answer the following question. Show your reasoning process.

${prompt}

Reasoning:`;

    const result = await this.generate({
      prompt: cotPrompt,
      config: { ...config, maxTokens: (config.maxTokens || 1000) + 500 }
    });

    // Split reasoning and final answer
    const parts = result.content.split('Final Answer:');
    const reasoning = parts[0].replace('Reasoning:', '').trim();
    const finalAnswer = parts[1]?.trim() || parts[0].trim();

    return {
      ...result,
      content: finalAnswer,
      reasoning
    };
  }

  async generateWithFewShot(prompt: string, examples: Array<{ input: string; output: string }>, config: Record<string, any>): Promise<{
    content: string;
    tokens: { prompt: number; completion: number; total: number };
    model: string;
    processingTime: number;
    cost: number;
  }> {
    const fewShotPrompt = this.buildFewShotPrompt(prompt, examples);
    
    return this.generate({
      prompt: fewShotPrompt,
      config
    });
  }

  private buildFewShotPrompt(mainPrompt: string, examples: Array<{ input: string; output: string }>): string {
    let prompt = 'Here are some examples:\n\n';
    
    examples.forEach((example, index) => {
      prompt += `Example ${index + 1}:\n`;
      prompt += `Input: ${example.input}\n`;
      prompt += `Output: ${example.output}\n\n`;
    });
    
    prompt += `Now, please respond to this:\n`;
    prompt += `Input: ${mainPrompt}\n`;
    prompt += `Output:`;
    
    return prompt;
  }

  async generateStream(request: {
    prompt: string;
    config: Record<string, any>;
    context?: Record<string, any>;
  }): Promise<AsyncIterable<{
    content: string;
    delta: string;
    isComplete: boolean;
  }>> {
    const model = request.config.model || 'llama-3.3-70b-versatile';
    const messages = this.buildMessages(request.prompt, request.context, request.config);
    
    const stream = await this.openai.chat.completions.create({
      model,
      messages,
      max_tokens: request.config.maxTokens || 1000,
      temperature: request.config.temperature || 0.7,
      stream: true
    });

    let accumulatedContent = '';
    
    return this.transformStream(stream, () => {
      accumulatedContent = '';
    });
  }

  private async *transformStream(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
    onInit: () => void
  ): AsyncIterable<{
    content: string;
    delta: string;
    isComplete: boolean;
  }> {
    onInit();
    let accumulatedContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        accumulatedContent += delta;
        yield {
          content: accumulatedContent,
          delta,
          isComplete: false
        };
      }
    }

    yield {
      content: accumulatedContent,
      delta: '',
      isComplete: true
    };
  }
}
