import { FastifyInstance } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';
import { ScoringEngine } from '../../infrastructure/scoring/ScoringEngine';

export async function scoringRoutes(fastify: FastifyInstance, container: DependencyContainer) {
  const scoringEngine = container.get('scoringEngine') as ScoringEngine;

  // Calculate score for entity
  fastify.post('/calculate', {
    schema: {
      body: {
        type: 'object',
        required: ['entityType', 'entityId', 'factors'],
        properties: {
          entityType: { type: 'string' },
          entityId: { type: 'string' },
          factors: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'value'],
              properties: {
                name: { type: 'string' },
                value: { type: 'number', minimum: 0, maximum: 1 },
                weight: { type: 'number', minimum: 0 },
                description: { type: 'string' }
              }
            }
          },
          algorithm: { type: 'string' },
          context: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const scoringRequest = request.body as any;
      const result = await scoringEngine.calculateScore(scoringRequest);
      
      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      fastify.log.error('Score calculation failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Score calculation failed',
          code: 'SCORING_CALCULATION_ERROR'
        }
      });
    }
  });

  // Batch calculate scores
  fastify.post('/batch-calculate', {
    schema: {
      body: {
        type: 'object',
        required: ['requests'],
        properties: {
          requests: {
            type: 'array',
            items: {
              type: 'object',
              required: ['entityType', 'entityId', 'factors']
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { requests } = request.body as { requests: any[] };
      const results = await scoringEngine.calculateBatch(requests);
      
      return reply.send({
        success: true,
        data: results
      });
    } catch (error) {
      fastify.log.error('Batch scoring failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Batch scoring failed',
          code: 'BATCH_SCORING_ERROR'
        }
      });
    }
  });

  // Get historical scores
  fastify.get('/history/:entityType/:entityId', {
    schema: {
      params: {
        entityType: { type: 'string' },
        entityId: { type: 'string' }
      }
    }
  }, async (request, reply) => {
    try {
      const { entityType, entityId } = request.params as { entityType: string; entityId: string };
      const history = await scoringEngine.getHistoricalScores(entityType, entityId);
      
      return reply.send({
        success: true,
        data: history
      });
    } catch (error) {
      fastify.log.error('Failed to get scoring history:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get scoring history',
          code: 'SCORING_HISTORY_ERROR'
        }
      });
    }
  });

  // Compare scores
  fastify.post('/compare', {
    schema: {
      body: {
        type: 'object',
        required: ['requests'],
        properties: {
          requests: {
            type: 'array',
            items: {
              type: 'object',
              required: ['entityType', 'entityId', 'factors']
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { requests } = request.body as { requests: any[] };
      const comparison = await scoringEngine.compareScores(requests);
      
      return reply.send({
        success: true,
        data: comparison
      });
    } catch (error) {
      fastify.log.error('Score comparison failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Score comparison failed',
          code: 'SCORING_COMPARISON_ERROR'
        }
      });
    }
  });

  // Get scoring engine stats
  fastify.get('/stats', async (request, reply) => {
    try {
      const stats = scoringEngine.getStats();
      
      return reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      fastify.log.error('Failed to get scoring stats:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get scoring stats',
          code: 'SCORING_STATS_ERROR'
        }
      });
    }
  });

  // Clear cache
  fastify.delete('/cache', async (request, reply) => {
    try {
      scoringEngine.clearCache();
      
      return reply.send({
        success: true,
        message: 'Scoring cache cleared'
      });
    } catch (error) {
      fastify.log.error('Failed to clear scoring cache:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to clear scoring cache',
          code: 'SCORING_CACHE_CLEAR_ERROR'
        }
      });
    }
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
      const health = await scoringEngine.healthCheck();
      
      return reply.send({
        success: true,
        data: health
      });
    } catch (error) {
      fastify.log.error('Scoring health check failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Scoring health check failed',
          code: 'SCORING_HEALTH_CHECK_ERROR'
        }
      });
    }
  });
}
