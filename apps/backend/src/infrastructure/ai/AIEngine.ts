import { config } from '../../config/index';
import OpenAI from 'openai';

export interface AIRequest {
  prompt: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  systemPrompt?: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

export interface AIProvider {
  name: string;
  generate(request: AIRequest): Promise<AIResponse>;
  validateRequest(request: AIRequest): boolean;
}

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI;
  private apiKey: string;

  constructor() {
    this.apiKey = config.ai?.apiKey || process.env.OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. Using mock mode for development. Set OPENAI_API_KEY environment variable for real API calls.');
      this.client = null as any; // Will be handled in generate method
    } else {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        timeout: 60000, // 60 seconds timeout
      });
    }
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    try {
      // Validate request strictly before API call
      if (!this.validateRequest(request)) {
        throw new Error('Invalid request: prompt is required and must not be empty');
      }

      // If no API key, return mock response
      if (!this.client) {
        console.warn('Using mock response (no OpenAI API key configured)');
        return {
          content: `Mock response for: ${request.prompt}. To get real OpenAI responses, set OPENAI_API_KEY environment variable.`,
          usage: {
            promptTokens: Math.floor(request.prompt.length / 4),
            completionTokens: 50,
            totalTokens: Math.floor(request.prompt.length / 4) + 50
          },
          model: 'gpt-4-mock',
          finishReason: 'stop'
        };
      }

      // Prepare messages for OpenAI API
      const messages: any[] = [];
      
      // Add system prompt if provided
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      
      // Add context if provided
      if (request.context) {
        messages.push({ role: 'system', content: `Context: ${request.context}` });
      }
      
      // Add user prompt
      messages.push({ role: 'user', content: request.prompt });

      // Call OpenAI API
      const completion = await this.client.chat.completions.create({
        model: request.model || config.ai.model || 'gpt-4',
        messages,
        temperature: request.temperature ?? config.ai.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? config.ai.maxTokens ?? 1000,
        stream: false,
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new Error('No response from OpenAI API');
      }

      const response: AIResponse = {
        content: choice.message.content || '',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        },
        model: completion.model,
        finishReason: choice.finish_reason
      };

      return response;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      // Handle specific OpenAI errors
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error('Invalid OpenAI API key');
        } else if (error.status === 429) {
          throw new Error('OpenAI API rate limit exceeded');
        } else if (error.status === 400) {
          throw new Error('Invalid request to OpenAI API');
        } else if (error.status === 500) {
          throw new Error('OpenAI API server error');
        }
      }
      
      throw new Error(`OpenAI API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateRequest(request: AIRequest): boolean {
    // Strict validation
    if (!request.prompt || typeof request.prompt !== 'string') {
      return false;
    }
    
    if (request.prompt.trim().length === 0) {
      return false;
    }
    
    if (request.prompt.length > 32000) { // OpenAI context limit
      return false;
    }
    
    // Validate optional parameters
    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      return false;
    }
    
    if (request.maxTokens !== undefined && (request.maxTokens < 1 || request.maxTokens > 4000)) {
      return false;
    }
    
    return true;
  }

  // Public method to access the OpenAI client for streaming
  getClient(): OpenAI | null {
    return this.client;
  }
}

export class AIEngine {
  private providers: Map<string, AIProvider> = new Map();
  private currentProvider!: AIProvider;
  private rateLimiter: Map<string, number[]> = new Map();
  private config: any;

  constructor(aiConfig?: any) {
    this.config = aiConfig || config.ai;
    this.initializeProviders();
  }

  async initialize(): Promise<void> {
    console.log('Initializing AI Engine...');
    
    // Register providers
    this.registerProvider(new OpenAIProvider());
    
    // Set default provider
    this.currentProvider = this.providers.get(this.config.provider) || this.providers.get('openai')!;
    
    console.log(`AI Engine initialized with provider: ${this.currentProvider.name}`);
  }

  private initializeProviders(): void {
    // Additional providers can be added here
    // e.g., Anthropic, Google AI, etc.
  }

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  setProvider(providerName: string): void {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found`);
    }
    this.currentProvider = provider;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    // Validate request
    if (!this.currentProvider.validateRequest(request)) {
      throw new Error('Invalid AI request');
    }

    // Check rate limiting
    this.checkRateLimit();

    // Apply default values
    const enrichedRequest: AIRequest = {
      ...request,
      temperature: request.temperature ?? this.config.temperature,
      maxTokens: request.maxTokens ?? this.config.maxTokens,
      model: request.model ?? this.config.model
    };

    try {
      // Generate response
      const response = await this.currentProvider.generate(enrichedRequest);
      
      // Log usage
      this.logUsage(response);
      
      return response;
    } catch (error) {
      console.error('AI generation failed:', error);
      throw new Error('AI generation failed');
    }
  }

  async generateWithRetry(request: AIRequest, maxRetries: number = 3): Promise<AIResponse> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.generate(request);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  async generateStream(request: AIRequest): Promise<AsyncIterable<string>> {
    try {
      // Validate request strictly before API call
      if (!this.currentProvider.validateRequest(request)) {
        throw new Error('Invalid request: prompt is required and must not be empty');
      }

      // Get the OpenAI provider
      const openAIProvider = this.currentProvider as OpenAIProvider;
      const client = openAIProvider.getClient();
      
      // If no API key, return mock stream
      if (!client) {
        console.warn('Using mock stream (no OpenAI API key configured)');
        const mockContent = `Mock stream response for: ${request.prompt}. To get real OpenAI streaming, set OPENAI_API_KEY environment variable.`;
        return this.createMockStream(mockContent);
      }
      
      // Prepare messages for OpenAI API
      const messages: any[] = [];
      
      // Add system prompt if provided
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      
      // Add context if provided
      if (request.context) {
        messages.push({ role: 'system', content: `Context: ${request.context}` });
      }
      
      // Add user prompt
      messages.push({ role: 'user', content: request.prompt });

      // Call OpenAI API with streaming
      const stream = await client.chat.completions.create({
        model: request.model || config.ai.model || 'gpt-4',
        messages,
        temperature: request.temperature ?? config.ai.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? config.ai.maxTokens ?? 1000,
        stream: true,
      });

      return this.createOpenAIStream(stream);
    } catch (error) {
      console.error('OpenAI Streaming Error:', error);
      
      // Handle specific OpenAI errors
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error('Invalid OpenAI API key');
        } else if (error.status === 429) {
          throw new Error('OpenAI API rate limit exceeded');
        } else if (error.status === 400) {
          throw new Error('Invalid request to OpenAI API');
        } else if (error.status === 500) {
          throw new Error('OpenAI API server error');
        }
      }
      
      throw new Error(`OpenAI streaming call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async *createMockStream(content: string): AsyncIterable<string> {
    const words = content.split(' ');
    
    for (const word of words) {
      yield word + ' ';
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming delay
    }
  }

  private async *createOpenAIStream(stream: any): AsyncIterable<string> {
    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          yield delta.content;
        }
        
        // Check if stream is finished
        if (chunk.choices[0]?.finish_reason) {
          break;
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error);
      throw new Error(`Stream processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validatePrompt(prompt: string): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    if (!prompt || prompt.trim().length === 0) {
      issues.push('Prompt cannot be empty');
    }
    
    if (prompt.length > 10000) {
      issues.push('Prompt too long (max 10,000 characters)');
    }
    
    if (prompt.includes('<script>') || prompt.includes('javascript:')) {
      issues.push('Prompt contains potentially unsafe content');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  async estimateTokens(text: string): Promise<number> {
    // Simple token estimation (roughly 4 characters per token)
    return Math.ceil(text.length / 4);
  }

  async truncateText(text: string, maxTokens: number): Promise<string> {
    const estimatedTokens = await this.estimateTokens(text);
    
    if (estimatedTokens <= maxTokens) {
      return text;
    }
    
    // Truncate to fit within token limit
    const targetLength = Math.floor((maxTokens / estimatedTokens) * text.length);
    return text.substring(0, targetLength);
  }

  private checkRateLimit(): void {
    const key = this.currentProvider.name;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = this.config.rateLimitPerMinute;

    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, []);
    }

    const requests = this.rateLimiter.get(key)!;
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    this.rateLimiter.set(key, validRequests);

    if (validRequests.length >= maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    validRequests.push(now);
  }

  private logUsage(response: AIResponse): void {
    if (response.usage) {
      console.log('AI Usage:', {
        model: response.model,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens
      });
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Test the AI provider with a simple request
      const testRequest: AIRequest = {
        prompt: 'Hello, this is a health check.',
        maxTokens: 10
      };

      const response = await this.generate(testRequest);
      
      return {
        healthy: true,
        details: {
          provider: this.currentProvider.name,
          model: response.model,
          responseTime: 'fast',
          rateLimitStatus: {
            current: this.rateLimiter.get(this.currentProvider.name)?.length || 0,
            max: this.config.rateLimitPerMinute
          }
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: this.currentProvider.name
        }
      };
    }
  }

  getStats(): any {
    return {
      providers: Array.from(this.providers.keys()),
      currentProvider: this.currentProvider.name,
      rateLimitStatus: {
        [this.currentProvider.name]: {
          current: this.rateLimiter.get(this.currentProvider.name)?.length || 0,
          max: this.config.rateLimitPerMinute
        }
      }
    };
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up AI Engine...');
    this.rateLimiter.clear();
    console.log('AI Engine cleaned up');
  }
}
