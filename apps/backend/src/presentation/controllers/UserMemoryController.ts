import { FastifyRequest, FastifyReply } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';
import { AdaptationType, InteractionType } from '@/domain/user-memory/entities/UserMemory';

export class UserMemoryController {
  constructor(private container: DependencyContainer) {}

  private getUserMemoryService() {
    return this.container.get('userMemoryService') as any;
  }

  // User Preferences Management
  async getUserPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      
      const preferences = await this.getUserMemoryService().getUserPreferences(userId);
      if (!preferences) {
        return reply.status(404).send({
          success: false,
          error: 'User preferences not found'
        });
      }

      return reply.send({
        success: true,
        data: preferences
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createUserPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const preferences = request.body as any;
      
      const createdPreferences = await this.getUserMemoryService().createUserPreferences(userId, preferences);
      
      return reply.status(201).send({
        success: true,
        data: createdPreferences
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateUserPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const updates = request.body as any;
      
      await this.getUserMemoryService().updateUserPreferences(userId, updates);
      
      return reply.send({
        success: true,
        message: 'User preferences updated successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteUserPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      
      await this.getUserMemoryService().deleteUserPreferences(userId);
      
      return reply.send({
        success: true,
        message: 'User preferences deleted successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Prompt History Management
  async getPromptHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { limit } = request.query as any;
      
      const history = await this.getUserMemoryService().getPromptHistory(userId, limit ? parseInt(limit) : undefined);
      
      return reply.send({
        success: true,
        data: {
          history,
          count: history.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async searchPromptHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { query } = request.query as any;
      
      if (!query) {
        return reply.status(400).send({
          success: false,
          error: 'Query parameter is required'
        });
      }
      
      const results = await this.getUserMemoryService().searchPromptHistory(userId, query);
      
      return reply.send({
        success: true,
        data: {
          results,
          count: results.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async analyzePromptTrends(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      
      const trends = await this.getUserMemoryService().analyzePromptTrends(userId);
      
      return reply.send({
        success: true,
        data: trends
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deletePromptHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { beforeDate } = request.query as any;
      
      await this.getUserMemoryService().deletePromptHistory(userId, beforeDate ? new Date(beforeDate) : undefined);
      
      return reply.send({
        success: true,
        message: 'Prompt history deleted successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Behavior Pattern Management
  async detectBehaviorPatterns(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      
      const patterns = await this.getUserMemoryService().detectBehaviorPatterns(userId);
      
      return reply.send({
        success: true,
        data: {
          patterns,
          count: patterns.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getBehaviorPatterns(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { patternType } = request.query as any;
      
      const patterns = await this.getUserMemoryService().getBehaviorPatterns(userId, patternType);
      
      return reply.send({
        success: true,
        data: {
          patterns,
          count: patterns.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateBehaviorPattern(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { patternId } = request.params as any;
      const updates = request.body as any;
      
      await this.getUserMemoryService().updateBehaviorPattern(patternId, updates);
      
      return reply.send({
        success: true,
        message: 'Behavior pattern updated successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteBehaviorPattern(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { patternId } = request.params as any;
      
      await this.getUserMemoryService().deleteBehaviorPattern(patternId);
      
      return reply.send({
        success: true,
        message: 'Behavior pattern deleted successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Content Preferences Management
  async getContentPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { contentType } = request.query as any;
      
      const preferences = await this.getUserMemoryService().getContentPreferences(userId, contentType);
      
      return reply.send({
        success: true,
        data: {
          preferences,
          count: preferences.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateContentPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId, contentType } = request.params as any;
      const updates = request.body as any;
      
      await this.getUserMemoryService().updateContentPreferences(userId, contentType, updates);
      
      return reply.send({
        success: true,
        message: 'Content preferences updated successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async addContentFeedback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId, contentType } = request.params as any;
      const feedback = request.body as any;
      
      await this.getUserMemoryService().addContentFeedback(userId, contentType, feedback);
      
      return reply.send({
        success: true,
        message: 'Content feedback added successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteContentPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { contentType } = request.query as any;
      
      await this.getUserMemoryService().deleteContentPreferences(userId, contentType);
      
      return reply.send({
        success: true,
        message: 'Content preferences deleted successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Interaction History Management
  async getInteractionHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { limit, interactionType } = request.query as any;
      
      let interactions;
      if (interactionType) {
        interactions = await this.getUserMemoryService().getInteractionsByType(userId, interactionType as InteractionType);
      } else {
        interactions = await this.getUserMemoryService().getInteractionHistory(userId, limit ? parseInt(limit) : undefined);
      }
      
      return reply.send({
        success: true,
        data: {
          interactions,
          count: interactions.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async addInteraction(request: FastifyRequest, reply: FastifyReply) {
    try {
      const interaction = request.body as any;
      
      await this.getUserMemoryService().addInteraction(interaction);
      
      return reply.status(201).send({
        success: true,
        message: 'Interaction added successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteInteractionHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { beforeDate } = request.query as any;
      
      await this.getUserMemoryService().deleteInteractionHistory(userId, beforeDate ? new Date(beforeDate) : undefined);
      
      return reply.send({
        success: true,
        message: 'Interaction history deleted successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Adaptation Data Management
  async getAdaptationHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { adaptationType } = request.query as any;
      
      let adaptations;
      if (adaptationType) {
        adaptations = await this.getUserMemoryService().getAdaptationsByType(userId, adaptationType as AdaptationType);
      } else {
        adaptations = await this.getUserMemoryService().getAdaptationHistory(userId);
      }
      
      return reply.send({
        success: true,
        data: {
          adaptations,
          count: adaptations.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async addAdaptation(request: FastifyRequest, reply: FastifyReply) {
    try {
      const adaptation = request.body as any;
      
      await this.getUserMemoryService().addAdaptation(adaptation);
      
      return reply.status(201).send({
        success: true,
        message: 'Adaptation added successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteAdaptationHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { beforeDate } = request.query as any;
      
      await this.getUserMemoryService().deleteAdaptationHistory(userId, beforeDate ? new Date(beforeDate) : undefined);
      
      return reply.send({
        success: true,
        message: 'Adaptation history deleted successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Personalization Core
  async personalizeContent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { content, context } = request.body as any;
      
      if (!content) {
        return reply.status(400).send({
          success: false,
          error: 'Content is required'
        });
      }
      
      const result = await this.getUserMemoryService().personalizeContent(userId, content, context);
      
      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async adaptPrompt(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { prompt, context } = request.body as any;
      
      if (!prompt) {
        return reply.status(400).send({
          success: false,
          error: 'Prompt is required'
        });
      }
      
      const result = await this.getUserMemoryService().adaptPrompt(userId, prompt, context);
      
      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async shouldPersonalize(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { context } = request.query as any;
      
      const shouldPersonalize = await this.getUserMemoryService().shouldPersonalize(userId, context);
      
      return reply.send({
        success: true,
        data: {
          shouldPersonalize
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Advanced Analytics
  async getUserInsights(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      
      const insights = await this.getUserMemoryService().getUserInsights(userId);
      
      return reply.send({
        success: true,
        data: insights
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getPersonalizationScore(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      
      const score = await this.getUserMemoryService().getPersonalizationScore(userId);
      
      return reply.send({
        success: true,
        data: score
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Memory Management
  async getUserMemoryStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      
      const stats = await this.getUserMemoryService().getUserMemoryStats(userId);
      
      return reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async cleanupOldMemory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { olderThanDays } = request.query as any;
      
      const result = await this.getUserMemoryService().cleanupOldMemory(userId, olderThanDays ? parseInt(olderThanDays) : undefined);
      
      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Configuration Management
  async updateConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const config = request.body as any;
      
      await this.getUserMemoryService().updateConfig(userId, config);
      
      return reply.send({
        success: true,
        message: 'User configuration updated successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      
      const config = await this.getUserMemoryService().getConfig(userId);
      
      return reply.send({
        success: true,
        data: config
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Batch Operations
  async batchUpdatePreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const updates = request.body as any;
      
      await this.getUserMemoryService().batchUpdatePreferences(updates);
      
      return reply.send({
        success: true,
        message: 'Batch preferences updated successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async batchAddInteractions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const interactions = request.body as any;
      
      await this.getUserMemoryService().batchAddInteractions(interactions);
      
      return reply.send({
        success: true,
        message: 'Batch interactions added successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Search and Discovery
  async searchUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const criteria = request.query as any;
      
      const users = await this.getUserMemoryService().searchUsers(criteria);
      
      return reply.send({
        success: true,
        data: {
          users,
          count: users.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async findSimilarUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const { limit } = request.query as any;
      
      const similarUsers = await this.getUserMemoryService().findSimilarUsers(userId, limit ? parseInt(limit) : undefined);
      
      return reply.send({
        success: true,
        data: {
          similarUsers,
          count: similarUsers.length
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Export/Import
  async exportUserData(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      
      const userData = await this.getUserMemoryService().exportUserData(userId);
      
      return reply.send({
        success: true,
        data: userData
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async importUserData(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const data = request.body as any;
      
      await this.getUserMemoryService().importUserData(userId, data);
      
      return reply.send({
        success: true,
        message: 'User data imported successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Quick Personalization Endpoints
  async quickPersonalize(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId, content, contentType } = request.body as any;
      
      if (!userId || !content) {
        return reply.status(400).send({
          success: false,
          error: 'User ID and content are required'
        });
      }
      
      const context = { contentType };
      const result = await this.getUserMemoryService().personalizeContent(userId, content, context);
      
      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async quickAdaptPrompt(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId, prompt, workflowType } = request.body as any;
      
      if (!userId || !prompt) {
        return reply.status(400).send({
          success: false,
          error: 'User ID and prompt are required'
        });
      }
      
      const context = { workflowType };
      const result = await this.getUserMemoryService().adaptPrompt(userId, prompt, context);
      
      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
