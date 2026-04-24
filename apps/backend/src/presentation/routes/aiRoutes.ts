import { FastifyInstance, FastifyRequest } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';
import { AIEngine } from '../../infrastructure/ai/AIEngine';
import { MemoryAwarePromptEnhancer } from '../../infrastructure/ai/MemoryAwarePromptEnhancer';

// Extend FastifyRequest to include user context
interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
  };
  securityContext?: {
    user?: {
      id: string;
    };
  };
}

export async function aiRoutes(fastify: FastifyInstance, container: DependencyContainer) {
  const aiEngine = container.get('aiEngine') as AIEngine;
  // const promptEnhancer = container.get('promptEnhancer') as MemoryAwarePromptEnhancer;

  // Generate content
  fastify.post('/generate', {
    schema: {
      body: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: { type: 'string', minLength: 1, maxLength: 10000 },
          context: { type: 'string' },
          temperature: { type: 'number', minimum: 0, maximum: 2 },
          maxTokens: { type: 'number', minimum: 1, maximum: 32000 },
          model: { type: 'string' },
          systemPrompt: { type: 'string' },
          userId: { type: 'string' },
          sessionId: { type: 'string' },
          enableMemory: { type: 'boolean', default: true },
          enablePersonalization: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { prompt, userId, sessionId, enableMemory = true, enablePersonalization = true, ...options } = request.body as any;
      
      let finalPrompt = prompt;
      let memoryEnhancement = null;
      
      // Enhance prompt with memory context if userId provided (commented out - no promptEnhancer)
      // if (userId && enableMemory) {
      //   const enhancement = await promptEnhancer.enhancePrompt({
      //     userId,
      //     originalPrompt: prompt,
      //     sessionId,
      //     context: options.context,
      //     enablePersonalization,
      //     enableMemoryContext: true
      //   });
        
      //   finalPrompt = enhancement.enhancedPrompt;
      //   memoryEnhancement = {
      //     appliedEnhancements: enhancement.appliedEnhancements,
      //     personalizationConfidence: enhancement.personalization.confidence,
      //     memoryStats: await promptEnhancer.getMemoryStats(userId)
      //   };
      // }

      const startTime = Date.now();
      const response = await aiEngine.generate({
        prompt: finalPrompt,
        ...options
      });
      const responseTime = Date.now() - startTime;

      // Store interaction in memory if userId provided (commented out - no promptEnhancer)
      // if (userId) {
      //   await promptEnhancer.storeInteraction(
      //     { userId, originalPrompt: prompt, sessionId, context: options.context },
      //     response.content,
      //     {
      //       tokensUsed: response.usage?.totalTokens,
      //       processingTime: responseTime,
      //       satisfaction: options.satisfaction
      //     }
      //   );
      // }

      return reply.send({
        success: true,
        data: {
          content: response.content,
          model: response.model,
          usage: response.usage,
          finishReason: response.finishReason,
          memoryEnhancement
        }
      });
    } catch (error) {
      fastify.log.error('AI generation failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'AI generation failed',
          code: 'AI_GENERATION_ERROR'
        }
      });
    }
  });

  // Generate with streaming
  fastify.post('/generate-stream', {
    schema: {
      body: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: { type: 'string', minLength: 1, maxLength: 10000 },
          context: { type: 'string' },
          temperature: { type: 'number', minimum: 0, maximum: 2 },
          maxTokens: { type: 'number', minimum: 1, maximum: 32000 },
          model: { type: 'string' },
          systemPrompt: { type: 'string' },
          userId: { type: 'string' },
          sessionId: { type: 'string' },
          enableMemory: { type: 'boolean', default: true },
          enablePersonalization: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { prompt, userId, sessionId, enableMemory = true, ...options } = request.body as any;
      
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      let finalPrompt = prompt;
      let memoryEnhancement = null;
      
      // Enhance prompt with memory context if userId provided (commented out - no promptEnhancer)
      // if (userId && enableMemory) {
      //   const enhancement = await promptEnhancer.enhancePrompt({
      //     userId,
      //     originalPrompt: prompt,
      //     sessionId,
      //     context: options.context,
      //     enablePersonalization,
      //     enableMemoryContext: true
      //   });
        
      //   finalPrompt = enhancement.enhancedPrompt;
      //   memoryEnhancement = {
      //     appliedEnhancements: enhancement.appliedEnhancements,
      //     personalizationConfidence: enhancement.personalization.confidence
      //   };
      // }

      const stream = await aiEngine.generateStream({
        prompt: finalPrompt,
        ...options
      });

      let fullResponse = '';
      
      for await (const chunk of stream) {
        fullResponse += chunk;
        reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      // Store interaction in memory if userId provided (commented out - no promptEnhancer)
      // if (userId) {
      //   await promptEnhancer.storeInteraction(
      //     { userId, originalPrompt: prompt, sessionId, context: options.context },
      //     fullResponse,
      //     {
      //       satisfaction: undefined,
      //       tokensUsed: 0, // Streaming doesn't provide token count
      //       processingTime: 0
      //     }
      //   );
      // }

      reply.raw.write('data: [DONE]\n\n');
      reply.raw.end();
    } catch (error) {
      fastify.log.error('AI streaming failed:' + (error as Error).message);
      reply.raw.write(`data: ${JSON.stringify({ error: 'AI streaming failed' })}\n\n`);
      reply.raw.end();
    }
  });

  // Get user memory stats and insights (commented out - no promptEnhancer)
  // fastify.get('/memory/:userId', {
  //   schema: {
  //     params: {
  //       type: 'object',
  //       properties: {
  //         userId: { type: 'string' }
  //       }
  //     }
  //   }
  // }, async (request: AuthenticatedRequest, reply) => {
  //   try {
  //     const userId = request.user?.id || request.securityContext?.user?.id || 'anonymous';
  //     const memoryStats = await promptEnhancer.getMemoryStats(userId);
      
  //     return reply.send({
  //       success: true,
  //       data: {
  //         memoryStats,
  //         timestamp: new Date().toISOString()
  //       }
  //     });
  //   } catch (error) {
  //     fastify.log.error('Memory stats retrieval failed:' + (error as Error).message);
  //     return reply.status(500).send({
  //       success: false,
  //       error: {
  //         message: 'Memory stats retrieval failed',
  //         code: 'MEMORY_STATS_ERROR'
  //       }
  //     });
  //   }
  // });

  // Validate prompt
  fastify.post('/validate-prompt', {
    schema: {
      body: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: { type: 'string' }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { prompt } = request.body as { prompt: string };
      const validation = await aiEngine.validatePrompt(prompt);
      
      return reply.send({
        success: true,
        data: validation
      });
    } catch (error) {
      fastify.log.error('Prompt validation failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Prompt validation failed',
          code: 'PROMPT_VALIDATION_ERROR'
        }
      });
    }
  });

  // Estimate tokens
  fastify.post('/estimate-tokens', {
    schema: {
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string' }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { text } = request.body as { text: string };
      const tokens = await aiEngine.estimateTokens(text);
      
      return reply.send({
        success: true,
        data: { tokens }
      });
    } catch (error) {
      fastify.log.error('Token estimation failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Token estimation failed',
          code: 'TOKEN_ESTIMATION_ERROR'
        }
      });
    }
  });

  // Truncate text
  fastify.post('/truncate-text', {
    schema: {
      body: {
        type: 'object',
        required: ['text', 'maxTokens'],
        properties: {
          text: { type: 'string' },
          maxTokens: { type: 'number', minimum: 1 }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { text, maxTokens } = request.body as { text: string; maxTokens: number };
      const truncated = await aiEngine.truncateText(text, maxTokens);
      
      return reply.send({
        success: true,
        data: { 
          original: text,
          truncated,
          originalTokens: await aiEngine.estimateTokens(text),
          truncatedTokens: await aiEngine.estimateTokens(truncated)
        }
      });
    } catch (error) {
      fastify.log.error('Text truncation failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Text truncation failed',
          code: 'TEXT_TRUNCATION_ERROR'
        }
      });
    }
  });

  // Get AI engine stats
  fastify.get('/stats', async (request, reply) => {
    try {
      const stats = aiEngine.getStats();
      
      return reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      fastify.log.error('Failed to get AI stats:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get AI stats',
          code: 'AI_STATS_ERROR'
        }
      });
    }
  });

  // Health check for AI engine
  fastify.get('/health', async (request, reply) => {
    try {
      const health = await aiEngine.healthCheck();
      
      return reply.send({
        success: true,
        data: health
      });
    } catch (error) {
      fastify.log.error('AI health check failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'AI health check failed',
          code: 'AI_HEALTH_CHECK_ERROR'
        }
      });
    }
  });
}
