import { UserMemoryServiceDB } from '../user-memory/UserMemoryServiceDB';

export interface EnhancedPromptRequest {
  userId: string;
  originalPrompt: string;
  sessionId?: string;
  context?: Record<string, any>;
  enablePersonalization?: boolean;
  enableMemoryContext?: boolean;
  enableSummarization?: boolean;
}

export interface EnhancedPromptResponse {
  enhancedPrompt: string;
  appliedEnhancements: string[];
  memoryContext: {
    userPreferences: any;
    recentHistory: string[];
    behaviorPatterns: string[];
    summary: string;
    insights: string[];
  };
  personalization: {
    applied: boolean;
    confidence: number;
    changes: string[];
  };
  metadata: {
    originalLength: number;
    enhancedLength: number;
    processingTime: number;
  };
}

export class MemoryAwarePromptEnhancer {
  constructor(
    private userMemoryService: UserMemoryServiceDB,
    private aiEngine?: any
  ) {}

  async enhancePrompt(request: EnhancedPromptRequest): Promise<EnhancedPromptResponse> {
    const startTime = Date.now();
    const appliedEnhancements: string[] = [];

    // Get memory context if enabled
    let memoryContext: any = {
      userPreferences: {},
      recentHistory: [],
      behaviorPatterns: [],
      summary: '',
      insights: [],
      adaptations: []
    };

    if (request.enableMemoryContext !== false) {
      try {
        memoryContext = await this.userMemoryService.getContextForAI(request.userId, {
          userId: request.userId,
          recentInteractions: 5,
          timeWindow: 24
        });
        appliedEnhancements.push('memory_context');
      } catch (error) {
        console.warn('Failed to retrieve memory context:', error);
      }
    }

    // Start with original prompt
    let enhancedPrompt = request.originalPrompt;

    // 1. Add memory context to prompt
    if (request.enableMemoryContext !== false && memoryContext.summary) {
      enhancedPrompt = this.addMemoryContext(enhancedPrompt, memoryContext);
      appliedEnhancements.push('context_injection');
    }

    // 2. Apply personalization if enabled
    let personalization = {
      applied: false,
      confidence: 0,
      changes: [] as string[]
    };

    if (request.enablePersonalization !== false) {
      try {
        const personalizationResult = await this.userMemoryService.personalizeContent(
          request.userId,
          enhancedPrompt,
          request.context
        );
        enhancedPrompt = personalizationResult.personalizedContent;
        personalization = {
          applied: true,
          confidence: personalizationResult.confidence,
          changes: personalizationResult.appliedPersonalizations
        };
        appliedEnhancements.push('personalization');
      } catch (error) {
        console.warn('Personalization failed:', error);
      }
    }

    // 3. Add summarization if enabled and prompt is long
    if (request.enableSummarization !== false && enhancedPrompt.length > 1000) {
      enhancedPrompt = await this.summarizeIfNeeded(enhancedPrompt);
      appliedEnhancements.push('summarization');
    }

    // 4. Add system instructions for memory-aware responses
    enhancedPrompt = this.addMemoryInstructions(enhancedPrompt, memoryContext);

    const processingTime = Date.now() - startTime;

    return {
      enhancedPrompt,
      appliedEnhancements,
      memoryContext,
      personalization,
      metadata: {
        originalLength: request.originalPrompt.length,
        enhancedLength: enhancedPrompt.length,
        processingTime
      }
    };
  }

  private addMemoryContext(prompt: string, memoryContext: any): string {
    const contextSection = `
[USER MEMORY CONTEXT]
User Preferences: ${JSON.stringify(memoryContext.userPreferences)}
Recent Topics: ${memoryContext.recentHistory.slice(0, 3).join(', ')}
Behavior Patterns: ${memoryContext.behaviorPatterns.slice(0, 2).join(', ')}
Summary: ${memoryContext.summary}
Key Insights: ${memoryContext.insights.slice(0, 2).join(', ')}

[ORIGINAL REQUEST]
${prompt}
`;
    return contextSection;
  }

  private addMemoryInstructions(prompt: string, memoryContext: any): string {
    const instructions = `
[MEMORY-AWARE RESPONSE INSTRUCTIONS]
1. Reference the user's previous interactions and preferences when relevant
2. Adapt your response style based on their established patterns
3. Show continuity from previous conversations when appropriate
4. Consider their satisfaction history in your response quality
5. Personalize examples and recommendations based on their interests

${prompt}
`;
    return instructions;
  }

  private async summarizeIfNeeded(prompt: string): Promise<string> {
    if (!this.aiEngine || prompt.length < 1500) {
      return prompt;
    }

    try {
      const summarizationPrompt = `
Please summarize the following user prompt while preserving the key intent and requirements:

${prompt}

Keep the summary concise but maintain all important details and context.
`;

      const response = await this.aiEngine.generate({
        prompt: summarizationPrompt,
        maxTokens: 300,
        temperature: 0.3
      });

      return response.content || prompt;
    } catch (error) {
      console.error('Summarization failed:', error);
      return prompt;
    }
  }

  // Method to store interaction after AI response
  async storeInteraction(request: EnhancedPromptRequest, aiResponse: string, metadata?: {
    satisfaction?: number;
    tokensUsed?: number;
    responseTime?: number;
  }): Promise<void> {
    try {
      // Store the original prompt
      await this.userMemoryService.storePrompt(request.userId, request.originalPrompt, {
        response: aiResponse,
        sessionId: request.sessionId,
        satisfactionScore: metadata?.satisfaction,
        tokensUsed: metadata?.tokensUsed,
        metadata: {
          ...request.context,
          enhancementApplied: true,
          responseTime: metadata?.responseTime
        }
      });

      // Store the AI response
      await this.userMemoryService.storeResponse(request.userId, aiResponse, {
        prompt: request.originalPrompt,
        sessionId: request.sessionId,
        satisfactionScore: metadata?.satisfaction,
        metadata: {
          ...request.context,
          enhanced: true
        }
      });
    } catch (error) {
      console.error('Failed to store interaction:', error);
    }
  }

  // Method to get memory statistics for monitoring
  async getMemoryStats(userId: string): Promise<{
    totalInteractions: number;
    averageSatisfaction: number;
    personalizationScore: number;
    memoryDepth: string;
    lastActivity: Date;
  }> {
    try {
      const stats = await this.userMemoryService.getUserMemoryStats(userId);
      const insights = await this.userMemoryService.getUserInsights(userId);

      // Determine memory depth based on interaction count
      let memoryDepth = 'new';
      if (stats.totalInteractions > 100) {
        memoryDepth = 'deep';
      } else if (stats.totalInteractions > 20) {
        memoryDepth = 'moderate';
      } else if (stats.totalInteractions > 5) {
        memoryDepth = 'shallow';
      }

      return {
        totalInteractions: stats.totalInteractions,
        averageSatisfaction: stats.averageSatisfaction,
        personalizationScore: insights.personalizationScore,
        memoryDepth,
        lastActivity: stats.lastActivity
      };
    } catch (error) {
      console.error('Failed to get memory stats:', error);
      return {
        totalInteractions: 0,
        averageSatisfaction: 0,
        personalizationScore: 0,
        memoryDepth: 'none',
        lastActivity: new Date()
      };
    }
  }
}
