import { FastifyInstance } from 'fastify';
import { UserMemoryController } from '../controllers/UserMemoryController';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';

// Define enum types since they're missing from domain
enum InteractionType {
  PROMPT = 'prompt',
  RESPONSE = 'response',
  FEEDBACK = 'feedback',
  SEARCH = 'search',
  VIEW = 'view'
}

enum AdaptationType {
  PERSONALIZATION = 'personalization',
  PROMPT_ADAPTATION = 'prompt_adaptation',
  CONTENT_ADAPTATION = 'content_adaptation',
  BEHAVIOR_ADAPTATION = 'behavior_adaptation'
}

export async function userMemoryRoutes(fastify: FastifyInstance, container: DependencyContainer) {
  const controller = container.get('userMemoryController') as UserMemoryController;

  // User Preferences Routes
  
  // Get user preferences
  fastify.get('/user-memory/:userId/preferences', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, controller.getUserPreferences.bind(controller));

  // Create user preferences
  fastify.post('/user-memory/:userId/preferences', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          preferences: {
            type: 'object',
            properties: {
              tone: { type: 'string' },
              style: { type: 'string' },
              length: { type: 'string' },
              complexity: { type: 'string' },
              format: { type: 'string' },
              language: { type: 'string' },
              targetAudience: { type: 'string' },
              industry: { type: 'string' },
              contentType: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
              avoidKeywords: { type: 'array', items: { type: 'string' } },
              customInstructions: { type: 'string' }
            }
          }
        }
      }
    }
  }, controller.createUserPreferences.bind(controller));

  // Update user preferences
  fastify.put('/user-memory/:userId/preferences', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          preferences: {
            type: 'object',
            properties: {
              tone: { type: 'string' },
              style: { type: 'string' },
              length: { type: 'string' },
              complexity: { type: 'string' },
              format: { type: 'string' },
              language: { type: 'string' },
              targetAudience: { type: 'string' },
              industry: { type: 'string' },
              contentType: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
              avoidKeywords: { type: 'array', items: { type: 'string' } },
              customInstructions: { type: 'string' }
            }
          }
        }
      }
    }
  }, controller.updateUserPreferences.bind(controller));

  // Delete user preferences
  fastify.delete('/user-memory/:userId/preferences', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, controller.deleteUserPreferences.bind(controller));

  // Prompt History Routes
  
  // Get prompt history
  fastify.get('/user-memory/:userId/prompt-history', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 1000 }
        }
      }
    }
  }, controller.getPromptHistory.bind(controller));

  // Search prompt history
  fastify.get('/user-memory/:userId/prompt-history/search', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', minLength: 1 }
        }
      }
    }
  }, controller.searchPromptHistory.bind(controller));

  // Analyze prompt trends
  fastify.get('/user-memory/:userId/prompt-trends', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, controller.analyzePromptTrends.bind(controller));

  // Delete prompt history
  fastify.delete('/user-memory/:userId/prompt-history', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          beforeDate: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, controller.deletePromptHistory.bind(controller));

  // Behavior Pattern Routes
  
  // Detect behavior patterns
  fastify.post('/user-memory/:userId/behavior-patterns/detect', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, controller.detectBehaviorPatterns.bind(controller));

  // Get behavior patterns
  fastify.get('/user-memory/:userId/behavior-patterns', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          patternType: { type: 'string' }
        }
      }
    }
  }, controller.getBehaviorPatterns.bind(controller));

  // Update behavior pattern
  fastify.put('/user-memory/behavior-patterns/:patternId', {
    schema: {
      params: {
        type: 'object',
        required: ['patternId'],
        properties: {
          patternId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          pattern: { type: 'object' },
          frequency: { type: 'number' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          lastObserved: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, controller.updateBehaviorPattern.bind(controller));

  // Delete behavior pattern
  fastify.delete('/user-memory/behavior-patterns/:patternId', {
    schema: {
      params: {
        type: 'object',
        required: ['patternId'],
        properties: {
          patternId: { type: 'string' }
        }
      }
    }
  }, controller.deleteBehaviorPattern.bind(controller));

  // Content Preferences Routes
  
  // Get content preferences
  fastify.get('/user-memory/:userId/content-preferences', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          contentType: { type: 'string' }
        }
      }
    }
  }, controller.getContentPreferences.bind(controller));

  // Update content preferences
  fastify.put('/user-memory/:userId/content-preferences/:contentType', {
    schema: {
      params: {
        type: 'object',
        required: ['userId', 'contentType'],
        properties: {
          userId: { type: 'string' },
          contentType: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          preferences: {
            type: 'object',
            properties: {
              structure: { type: 'array', items: { type: 'string' } },
              elements: { type: 'array', items: { type: 'string' } },
              avoidElements: { type: 'array', items: { type: 'string' } },
              length: {
                type: 'object',
                properties: {
                  min: { type: 'number' },
                  max: { type: 'number' },
                  preferred: { type: 'string' }
                }
              },
              tone: { type: 'string' },
              style: { type: 'string' },
              format: { type: 'string' }
            }
          }
        }
      }
    }
  }, controller.updateContentPreferences.bind(controller));

  // Add content feedback
  fastify.post('/user-memory/:userId/content-preferences/:contentType/feedback', {
    schema: {
      params: {
        type: 'object',
        required: ['userId', 'contentType'],
        properties: {
          userId: { type: 'string' },
          contentType: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['rating', 'feedback'],
        properties: {
          rating: { type: 'number', minimum: 1, maximum: 10 },
          feedback: { type: 'string' },
          aspects: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, controller.addContentFeedback.bind(controller));

  // Delete content preferences
  fastify.delete('/user-memory/:userId/content-preferences', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          contentType: { type: 'string' }
        }
      }
    }
  }, controller.deleteContentPreferences.bind(controller));

  // Interaction History Routes
  
  // Get interaction history
  fastify.get('/user-memory/:userId/interactions', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 1000 },
          interactionType: { 
            type: 'string',
            enum: Object.values(InteractionType)
          }
        }
      }
    }
  }, controller.getInteractionHistory.bind(controller));

  // Add interaction
  fastify.post('/user-memory/interactions', {
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'interactionType'],
        properties: {
          userId: { type: 'string' },
          interactionType: { 
            type: 'string',
            enum: Object.values(InteractionType)
          },
          data: { type: 'object' },
          context: { type: 'object' },
          outcome: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              modifications: { type: 'array', items: { type: 'string' } },
              satisfaction: { type: 'number', minimum: 1, maximum: 10 },
              feedback: { type: 'string' }
            }
          },
          timestamp: { type: 'string', format: 'date-time' },
          duration: { type: 'number' },
          metadata: { type: 'object' }
        }
      }
    }
  }, controller.addInteraction.bind(controller));

  // Delete interaction history
  fastify.delete('/user-memory/:userId/interactions', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          beforeDate: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, controller.deleteInteractionHistory.bind(controller));

  // Adaptation Data Routes
  
  // Get adaptation history
  fastify.get('/user-memory/:userId/adaptations', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          adaptationType: { 
            type: 'string',
            enum: Object.values(AdaptationType)
          }
        }
      }
    }
  }, controller.getAdaptationHistory.bind(controller));

  // Add adaptation
  fastify.post('/user-memory/adaptations', {
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'adaptationType', 'original', 'adapted'],
        properties: {
          userId: { type: 'string' },
          adaptationType: { 
            type: 'string',
            enum: Object.values(AdaptationType)
          },
          original: { type: 'string' },
          adapted: { type: 'string' },
          context: { type: 'object' },
          trigger: { type: 'string' },
          effectiveness: { type: 'number', minimum: 0, maximum: 10 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          timestamp: { type: 'string', format: 'date-time' },
          feedback: {
            type: 'object',
            properties: {
              userRating: { type: 'number', minimum: 1, maximum: 10 },
              systemRating: { type: 'number', minimum: 0, maximum: 10 },
              comments: { type: 'string' }
            }
          }
        }
      }
    }
  }, controller.addAdaptation.bind(controller));

  // Delete adaptation history
  fastify.delete('/user-memory/:userId/adaptations', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          beforeDate: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, controller.deleteAdaptationHistory.bind(controller));

  // Personalization Core Routes
  
  // Personalize content
  fastify.post('/user-memory/:userId/personalize', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' },
          context: { type: 'object' }
        }
      }
    }
  }, controller.personalizeContent.bind(controller));

  // Adapt prompt
  fastify.post('/user-memory/:userId/adapt-prompt', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: { type: 'string' },
          context: { type: 'object' }
        }
      }
    }
  }, controller.adaptPrompt.bind(controller));

  // Check if should personalize
  fastify.get('/user-memory/:userId/should-personalize', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          context: { type: 'object' }
        }
      }
    }
  }, controller.shouldPersonalize.bind(controller));

  // Advanced Analytics Routes
  
  // Get user insights
  fastify.get('/user-memory/:userId/insights', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, controller.getUserInsights.bind(controller));

  // Get personalization score
  fastify.get('/user-memory/:userId/personalization-score', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, controller.getPersonalizationScore.bind(controller));

  // Memory Management Routes
  
  // Get user memory stats
  fastify.get('/user-memory/:userId/stats', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, controller.getUserMemoryStats.bind(controller));

  // Cleanup old memory
  fastify.post('/user-memory/:userId/cleanup', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          olderThanDays: { type: 'number', minimum: 1, maximum: 365 }
        }
      }
    }
  }, controller.cleanupOldMemory.bind(controller));

  // Configuration Management Routes
  
  // Update user config
  fastify.put('/user-memory/:userId/config', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          maxPromptHistory: { type: 'number', minimum: 1, maximum: 10000 },
          maxInteractionHistory: { type: 'number', minimum: 1, maximum: 10000 },
          patternDetectionThreshold: { type: 'number', minimum: 0, maximum: 1 },
          adaptationConfidenceThreshold: { type: 'number', minimum: 0, maximum: 1 },
          personalizationEnabled: { type: 'boolean' },
          autoAdaptation: { type: 'boolean' },
          retentionPeriod: { type: 'number', minimum: 1, maximum: 365 }
        }
      }
    }
  }, controller.updateConfig.bind(controller));

  // Get user config
  fastify.get('/user-memory/:userId/config', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, controller.getConfig.bind(controller));

  // Batch Operations Routes
  
  // Batch update preferences
  fastify.post('/user-memory/batch/preferences', {
    schema: {
      body: {
        type: 'array',
        items: {
          type: 'object',
          required: ['userId', 'preferences'],
          properties: {
            userId: { type: 'string' },
            preferences: { type: 'object' }
          }
        }
      }
    }
  }, controller.batchUpdatePreferences.bind(controller));

  // Batch add interactions
  fastify.post('/user-memory/batch/interactions', {
    schema: {
      body: {
        type: 'array',
        items: {
          type: 'object',
          required: ['userId', 'interactionType'],
          properties: {
            userId: { type: 'string' },
            interactionType: { 
              type: 'string',
              enum: Object.values(InteractionType)
            },
            data: { type: 'object' },
            context: { type: 'object' },
            outcome: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                modifications: { type: 'array', items: { type: 'string' } },
                satisfaction: { type: 'number', minimum: 1, maximum: 10 },
                feedback: { type: 'string' }
              }
            },
            timestamp: { type: 'string', format: 'date-time' },
            duration: { type: 'number' },
            metadata: { type: 'object' }
          }
        }
      }
    }
  }, controller.batchAddInteractions.bind(controller));

  // Search and Discovery Routes
  
  // Search users
  fastify.get('/user-memory/users/search', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          'preferences.tone': { type: 'string' },
          'preferences.style': { type: 'string' },
          'preferences.language': { type: 'string' },
          patterns: { type: 'array', items: { type: 'string' } },
          'activityRange.start': { type: 'string', format: 'date-time' },
          'activityRange.end': { type: 'string', format: 'date-time' }
        }
      }
    }
  }, controller.searchUsers.bind(controller));

  // Find similar users
  fastify.get('/user-memory/:userId/similar', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100 }
        }
      }
    }
  }, controller.findSimilarUsers.bind(controller));

  // Export/Import Routes
  
  // Export user data
  fastify.get('/user-memory/:userId/export', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, controller.exportUserData.bind(controller));

  // Import user data
  fastify.post('/user-memory/:userId/import', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          preferences: { type: 'object' },
          promptHistory: { type: 'array', items: { type: 'object' } },
          patterns: { type: 'array', items: { type: 'object' } },
          contentPreferences: { type: 'array', items: { type: 'object' } },
          interactions: { type: 'array', items: { type: 'object' } },
          adaptations: { type: 'array', items: { type: 'object' } }
        }
      }
    }
  }, controller.importUserData.bind(controller));

  // Quick Personalization Routes
  
  // Quick personalize content
  fastify.post('/user-memory/quick-personalize', {
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'content'],
        properties: {
          userId: { type: 'string' },
          content: { type: 'string' },
          contentType: { type: 'string' }
        }
      }
    }
  }, controller.quickPersonalize.bind(controller));

  // Quick adapt prompt
  fastify.post('/user-memory/quick-adapt-prompt', {
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'prompt'],
        properties: {
          userId: { type: 'string' },
          prompt: { type: 'string' },
          workflowType: { type: 'string' }
        }
      }
    }
  }, controller.quickAdaptPrompt.bind(controller));

  // System Information Route
  fastify.get('/user-memory/info', {}, async (request, reply) => {
    try {
      return reply.send({
        success: true,
        data: {
          version: '1.0.0',
          features: [
            'User preferences management',
            'Prompt history tracking',
            'Behavior pattern detection',
            'Content personalization',
            'Prompt adaptation',
            'Adaptation engine',
            'Memory analytics',
            'Batch operations',
            'Search and discovery',
            'Export/Import functionality'
          ],
          adaptationTypes: Object.values(AdaptationType),
          interactionTypes: Object.values(InteractionType),
          defaultConfig: {
            maxPromptHistory: 1000,
            maxInteractionHistory: 1000,
            patternDetectionThreshold: 0.7,
            adaptationConfidenceThreshold: 0.6,
            personalizationEnabled: true,
            autoAdaptation: true,
            retentionPeriod: 90
          },
          capabilities: {
            personalization: true,
            adaptation: true,
            patternDetection: true,
            analytics: true,
            batchOperations: true,
            search: true,
            exportImport: true
          }
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
