import { FastifyInstance, FastifyRequest } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';
import { ICreditService } from '../../domain/credit/entities/Credit';
import { 
  createCreditMiddleware, 
  createCreditTrackingMiddleware, 
  addRequestStartTime,
  createAICreditMiddleware 
} from '../../infrastructure/credit/CreditMiddleware';

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
  creditInfo?: any;
}

export async function aiRoutesWithCredits(fastify: FastifyInstance, container: DependencyContainer) {
  const creditService = container.get('creditService') as ICreditService;

  // Add request start time middleware for tracking
  fastify.addHook('preHandler', addRequestStartTime());

  // Add credit tracking middleware (runs after request)
  fastify.addHook('onResponse', createCreditTrackingMiddleware(creditService));

  // AI generation endpoint with credit enforcement
  fastify.post('/generate', {
    preHandler: [
      async (request, reply, done) => {
        await createAICreditMiddleware(creditService)(request, reply);
        done();
      }
    ],
    schema: {
      description: 'Generate AI content (credits required)',
      tags: ['ai', 'credits'],
      body: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: { type: 'string', minLength: 1 },
          maxTokens: { type: 'number', minimum: 1, maximum: 4000, default: 1000 },
          temperature: { type: 'number', minimum: 0, maximum: 2, default: 0.7 },
          model: { type: 'string', enum: ['gpt-3.5-turbo', 'gpt-4'], default: 'gpt-3.5-turbo' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                usage: {
                  type: 'object',
                  properties: {
                    promptTokens: { type: 'number' },
                    completionTokens: { type: 'number' },
                    totalTokens: { type: 'number' },
                    creditsSpent: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { prompt, maxTokens = 1000, temperature = 0.7, model = 'gpt-3.5-turbo' } = request.body as any;
      const userId = request.user?.id || request.securityContext?.user?.id || 'anonymous';

      // Calculate credit cost based on request parameters
      const creditCost = calculateAICreditCost({ prompt, maxTokens, model });

      // Update credit info with calculated cost
      if (request.creditInfo) {
        request.creditInfo.cost = creditCost;
        request.creditInfo.operation = `ai_generation_${model}`;
      }

      // Get AI engine from container
      const aiEngine = container.get('aiEngine') as any;
      
      // Generate content
      const startTime = Date.now();
      const result = await aiEngine.generate({
        prompt,
        maxTokens,
        temperature,
        model
      });
      const processingTime = Date.now() - startTime;

      // Track usage with detailed metadata
      await creditService.trackUsage(userId, {
        userId,
        apiEndpoint: '/ai/generate',
        operation: `ai_generation_${model}`,
        creditsSpent: creditCost,
        tokensUsed: result.usage?.totalTokens,
        processingTime,
        model,
        metadata: {
          promptLength: prompt.length,
          maxTokens,
          temperature,
          model,
          responseLength: result.content?.length || 0
        },
        ipAddress: request.ip || request.connection?.remoteAddress,
        userAgent: request.headers['user-agent'],
        requestId: request.id,
        status: 'completed'
      });

      return reply.send({
        success: true,
        data: {
          content: result.content,
          usage: {
            ...result.usage,
            creditsSpent: creditCost,
            processingTime
          }
        }
      });

    } catch (error) {
      fastify.log.error({ error: error as Error }, 'AI generation failed');
      
      // Track failed usage
      const userId = request.user?.id || request.securityContext?.user?.id || 'anonymous';
      if (userId && request.creditInfo) {
        await creditService.trackUsage(userId, {
          userId,
          apiEndpoint: '/ai/generate',
          operation: 'ai_generation_failed',
          creditsSpent: 0, // No credits deducted for failed requests
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            request: request.body
          },
          ipAddress: request.ip || request.connection?.remoteAddress,
          userAgent: request.headers['user-agent'],
          requestId: request.id,
          status: 'failed'
        });
      }

      return reply.status(500).send({
        success: false,
        error: {
          message: 'AI generation failed',
          code: 'AI_GENERATION_ERROR'
        }
      });
    }
  });

  // AI analysis endpoint with credit enforcement
  fastify.post('/analyze', {
    preHandler: [
      async (request, reply, done) => {
        await createCreditMiddleware(creditService, {
          creditCost: 15, // Higher cost for analysis
          operation: 'ai_analysis'
        })(request, reply);
        done();
      }
    ],
    schema: {
      description: 'Analyze content with AI (credits required)',
      tags: ['ai', 'credits'],
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1 },
          analysisType: { type: 'string', enum: ['sentiment', 'keywords', 'summary', 'insights'], default: 'insights' },
          model: { type: 'string', enum: ['gpt-3.5-turbo', 'gpt-4'], default: 'gpt-3.5-turbo' }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { content, analysisType = 'insights', model = 'gpt-3.5-turbo' } = request.body as any;
      const userId = request.user?.id || request.securityContext?.user?.id || 'anonymous';

      // Get AI engine
      const aiEngine = container.get('aiEngine') as any;
      
      // Perform analysis
      const result = await aiEngine.analyze({
        content,
        type: analysisType,
        model
      });

      return reply.send({
        success: true,
        data: {
          analysis: result,
          type: analysisType,
          model
        }
      });

    } catch (error) {
      fastify.log.error({ error: error as Error }, 'AI analysis failed');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'AI analysis failed',
          code: 'AI_ANALYSIS_ERROR'
        }
      });
    }
  });

  // Batch generation endpoint with credit enforcement
  fastify.post('/batch-generate', {
    preHandler: [
      async (request, reply, done) => {
        await createCreditMiddleware(creditService, {
          creditCost: 50, // Higher cost for batch operations
          operation: 'ai_batch_generation'
        })(request, reply);
        done();
      }
    ],
    schema: {
      description: 'Generate multiple AI responses (credits required)',
      tags: ['ai', 'credits'],
      body: {
        type: 'object',
        required: ['requests'],
        properties: {
          requests: {
            type: 'array',
            items: {
              type: 'object',
              required: ['prompt'],
              properties: {
                prompt: { type: 'string', minLength: 1 },
                maxTokens: { type: 'number', minimum: 1, maximum: 2000, default: 500 }
              }
            },
            minItems: 1,
            maxItems: 10
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { requests } = request.body as any;
      const userId = request.user?.id || request.securityContext?.user?.id || 'anonymous';

      // Get AI engine
      const aiEngine = container.get('aiEngine') as any;
      
      // Process batch requests
      const results = await Promise.all(
        requests.map(async (req: any) => {
          const result = await aiEngine.generate({
            prompt: req.prompt,
            maxTokens: req.maxTokens || 500
          });
          return {
            prompt: req.prompt,
            content: result.content,
            usage: result.usage
          };
        })
      );

      return reply.send({
        success: true,
        data: {
          results,
          count: results.length
        }
      });

    } catch (error) {
      fastify.log.error({ error: error as Error }, 'AI batch generation failed');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'AI batch generation failed',
          code: 'AI_BATCH_ERROR'
        }
      });
    }
  });

  // Free endpoint for getting AI models (no credits required)
  fastify.get('/models', {
    preHandler: [
      // No credit middleware for this endpoint
    ],
    schema: {
      description: 'Get available AI models (free)',
      tags: ['ai']
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const aiEngine = container.get('aiEngine') as any;
      const models = await aiEngine.getAvailableModels();

      return reply.send({
        success: true,
        data: { models }
      });

    } catch (error) {
      fastify.log.error({ error: error as Error }, 'Failed to get AI models');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get AI models',
          code: 'MODELS_ERROR'
        }
      });
    }
  });
}

// Helper function to calculate AI credit costs
function calculateAICreditCost(request: any): number {
  const { prompt = '', maxTokens = 1000, model = 'gpt-3.5-turbo' } = request;
  
  // Base cost per model
  const modelCosts = {
    'gpt-3.5-turbo': 1,
    'gpt-4': 3,
    'gpt-4-turbo': 2
  };
  
  const baseCost = modelCosts[model as keyof typeof modelCosts] || 1;
  
  // Calculate cost based on content length and token limits
  const promptLength = prompt.length;
  const tokenMultiplier = Math.ceil(maxTokens / 1000);
  const lengthMultiplier = Math.ceil(promptLength / 1000);
  
  return baseCost * Math.max(1, tokenMultiplier, lengthMultiplier);
}
