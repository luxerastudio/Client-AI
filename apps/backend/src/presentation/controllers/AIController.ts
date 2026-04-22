import { FastifyRequest, FastifyReply } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';
import { AIEngine } from '../../infrastructure/ai/AIEngine';

export class AIController {
  constructor(private container: DependencyContainer) {}

  async generateContent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { prompt } = request.body as any;
      const aiEngine = this.container.get('aiEngine') as AIEngine;
      
      const result = await aiEngine.generate({
        prompt,
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.7
      });

      return {
        success: true,
        data: {
          content: result.content,
          model: result.model,
          usage: result.usage
        }
      };
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateStream(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { prompt } = request.body as any;
      const aiEngine = this.container.get('aiEngine') as AIEngine;
      
      // For now, return a simple response. In production, this would stream
      const result = await aiEngine.generate({
        prompt,
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.7
      });

      return {
        success: true,
        data: {
          content: result.content,
          model: result.model,
          usage: result.usage
        }
      };
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async validatePrompt(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { prompt } = request.body as any;
      
      // Basic validation
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid prompt'
        });
      }

      if (prompt.length > 10000) {
        return reply.status(400).send({
          success: false,
          error: 'Prompt too long (max 10000 characters)'
        });
      }

      return {
        success: true,
        data: {
          valid: true,
          length: prompt.length,
          estimatedTokens: Math.ceil(prompt.length / 4)
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
