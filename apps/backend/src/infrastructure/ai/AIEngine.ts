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
    this.apiKey = process.env.GROQ_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }
    
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
      timeout: 60000, // 60 seconds timeout
    });
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    try {
      // Validate request strictly before API call
      if (!this.validateRequest(request)) {
        throw new Error('Invalid request: prompt is required and must not be empty');
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

      // Call Groq API (OpenAI-compatible)
      const completion = await this.client.chat.completions.create({
        model: request.model || config.ai.model || 'llama-3.3-70b-versatile',
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
      
      // Handle specific API errors (Groq/OpenAI compatible)
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error('Invalid Groq API key');
        } else if (error.status === 429) {
          throw new Error('Groq API rate limit exceeded');
        } else if (error.status === 400) {
          throw new Error('Invalid request to Groq API');
        } else if (error.status === 500) {
          throw new Error('Groq API server error');
        }
      }
      
      throw new Error(`Groq API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    if (request.prompt.length > 32000) { // Groq context limit
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
    const provider = this.providers.get(this.config.provider) || this.providers.get('openai');
    if (!provider) {
      throw new Error(`AI provider '${this.config.provider || 'openai'}' not found`);
    }
    this.currentProvider = provider;
    
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

    // Apply rate limiting with delay to prevent 502 errors
    await this.enforceRateLimitDelay();

    // Apply default values
    const enrichedRequest: AIRequest = {
      ...request,
      temperature: request.temperature ?? this.config.temperature,
      maxTokens: request.maxTokens ?? this.config.maxTokens,
      model: request.model ?? this.config.model
    };

    let lastError: Error;
    
    // Try first attempt
    try {
      const response = await this.currentProvider.generate(enrichedRequest);
      this.logUsage(response);
      return response;
    } catch (error) {
      lastError = error as Error;
      console.error('AI generation failed (attempt 1):', lastError.message);
      
      // Check if it's a 429 rate limit error
      if (lastError.message.includes('rate limit') || lastError.message.includes('429')) {
        console.log('🔄 429 Rate limit detected, waiting 2 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Retry once
        try {
          const response = await this.currentProvider.generate(enrichedRequest);
          this.logUsage(response);
          console.log('✅ Retry successful after rate limit');
          return response;
        } catch (retryError) {
          lastError = retryError as Error;
          console.error('AI generation failed (retry):', lastError.message);
        }
      }
    }
    
    // If we get here, both attempts failed
    console.error('AI generation failed permanently:', {
      message: lastError.message,
      stack: lastError.stack,
      currentProvider: this.currentProvider?.name || 'undefined',
      hasProvider: !!this.currentProvider
    });
    
    // Return graceful failure message
    throw new Error('System is busy, please try again in a moment');
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
      
      // If no API key, fail safe instead of mocking
      if (!client) {
        console.error('❌ Groq API key not configured - cannot generate AI stream');
        throw new Error('Groq API key not configured. Set GROQ_API_KEY environment variable to enable AI streaming.');
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

      // Call Groq API with streaming (OpenAI-compatible)
      const stream = await client.chat.completions.create({
        model: request.model || config.ai.model || 'llama-3.3-70b-versatile',
        messages,
        temperature: request.temperature ?? config.ai.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? config.ai.maxTokens ?? 1000,
        stream: true,
      });

      return this.createOpenAIStream(stream);
    } catch (error) {
      console.error('OpenAI Streaming Error:', error);
      
      // Handle specific API errors (Groq/OpenAI compatible)
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error('Invalid Groq API key');
        } else if (error.status === 429) {
          throw new Error('Groq API rate limit exceeded');
        } else if (error.status === 400) {
          throw new Error('Invalid request to Groq API');
        } else if (error.status === 500) {
          throw new Error('Groq API server error');
        }
      }
      
      throw new Error(`Groq streaming call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    const maxRequests = this.config.rateLimitPerMinute || 20; // Default to 20 requests/minute for Groq free tier

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

  private async enforceRateLimitDelay(): Promise<void> {
    const key = this.currentProvider.name;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = this.config.rateLimitPerMinute || 20; // Default to 20 requests/minute for Groq free tier

    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, []);
    }

    const requests = this.rateLimiter.get(key)!;
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    this.rateLimiter.set(key, validRequests);

    // If we're approaching the rate limit, add a delay
    if (validRequests.length >= Math.floor(maxRequests * 0.8)) {
      const delayMs = Math.ceil((windowMs / maxRequests) * 2); // 2x the normal interval
      console.log(`🔄 Rate limit approach detected, adding ${delayMs}ms delay to prevent 502 errors`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
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
