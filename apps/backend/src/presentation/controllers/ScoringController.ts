import { FastifyRequest, FastifyReply } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';
import { ScoringEngine, ScoringRequest } from '../../infrastructure/scoring/ScoringEngine';

export class ScoringController {
  constructor(private container: DependencyContainer) {}

  async scoreContent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { content, criteria, algorithm } = request.body as any;
      const scoringEngine = this.container.get('scoringEngine') as ScoringEngine;
      
      const scoringRequest: ScoringRequest = {
        entityType: 'content',
        entityId: `content_${Date.now()}`,
        factors: criteria.map((criterion: any) => ({
          name: criterion.name,
          weight: criterion.weight || 1.0,
          value: criterion.value || 0.5,
          description: criterion.description
        })),
        algorithm: algorithm || 'weighted',
        context: { timestamp: new Date() }
      };

      const result = await scoringEngine.calculateScore(scoringRequest);

      return {
        success: true,
        data: {
          score: result.score,
          algorithm: result.algorithm,
          breakdown: result.breakdown,
          confidence: result.confidence,
          metadata: result.metadata
        }
      };
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async batchScore(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { items, criteria, algorithm } = request.body as any;
      const scoringEngine = this.container.get('scoringEngine') as ScoringEngine;
      
      const results = await Promise.all(
        items.map(async (item: any) => {
          const scoringRequest: ScoringRequest = {
            entityType: item.entityType || 'content',
            entityId: item.entityId || `item_${Date.now()}_${Math.random()}`,
            factors: criteria.map((criterion: any) => ({
              name: criterion.name,
              weight: criterion.weight || 1.0,
              value: item[criterion.name] || 0.5,
              description: criterion.description
            })),
            algorithm: algorithm || 'weighted',
            context: { timestamp: new Date(), item }
          };

          return await (scoringEngine as any).calculate(scoringRequest);
        })
      );

      return {
        success: true,
        data: {
          results,
          total: results.length,
          averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length
        }
      };
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAlgorithms(request: FastifyRequest, reply: FastifyReply) {
    try {
      const scoringEngine = this.container.get('scoringEngine') as ScoringEngine;
      
      return {
        success: true,
        data: {
          algorithms: ['weighted', 'exponential'],
          default: 'weighted',
          description: {
            weighted: 'Standard weighted average algorithm',
            exponential: 'Exponential weighting for emphasis on high scores'
          }
        }
      };
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
