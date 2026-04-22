import { FastifyInstance } from 'fastify';
import { WorkflowEngineController } from '../controllers/WorkflowEngineController';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';

export async function workflowEngineRoutes(fastify: FastifyInstance, container: DependencyContainer) {
  const controller = new WorkflowEngineController(container);

  // Template Management Routes
  
  // Get all templates with optional filtering
  fastify.get('/workflow-engine/templates', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          name: { type: 'string' }
        }
      }
    }
  }, controller.getTemplates.bind(controller));

  // Get specific template
  fastify.get('/workflow-engine/templates/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, controller.getTemplate.bind(controller));

  // Create new template
  fastify.post('/workflow-engine/templates', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'category', 'steps'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'type', 'name', 'order'],
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                order: { type: 'number' },
                dependencies: { type: 'array', items: { type: 'string' } },
                config: { type: 'object' },
                timeout: { type: 'number' }
              }
            }
          },
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          metadata: { type: 'object' }
        }
      }
    }
  }, controller.createTemplate.bind(controller));

  // Update template
  fastify.put('/workflow-engine/templates/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          steps: { type: 'array' },
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          metadata: { type: 'object' },
          isActive: { type: 'boolean' }
        }
      }
    }
  }, controller.updateTemplate.bind(controller));

  // Delete template
  fastify.delete('/workflow-engine/templates/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, controller.deleteTemplate.bind(controller));

  // Validate template
  fastify.post('/workflow-engine/templates/validate', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'category', 'steps'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          steps: { type: 'array' },
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          metadata: { type: 'object' }
        }
      }
    }
  }, controller.validateTemplate.bind(controller));

  // Execution Management Routes
  
  // Execute workflow
  fastify.post('/workflow-engine/execute/:templateId', {
    schema: {
      params: {
        type: 'object',
        required: ['templateId'],
        properties: {
          templateId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['input'],
        properties: {
          input: { type: 'object' },
          config: { type: 'object' }
        }
      }
    }
  }, controller.executeWorkflow.bind(controller));

  // Get execution details
  fastify.get('/workflow-engine/executions/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, controller.getExecution.bind(controller));

  // Get all executions (with optional template filtering)
  fastify.get('/workflow-engine/executions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          templateId: { type: 'string' }
        }
      }
    }
  }, controller.getExecutions.bind(controller));

  // Cancel execution
  fastify.post('/workflow-engine/executions/:id/cancel', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, controller.cancelExecution.bind(controller));

  // Retry execution
  fastify.post('/workflow-engine/executions/:id/retry', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, controller.retryExecution.bind(controller));

  // Quick Execute Routes (for common workflows)
  
  // Quick execute common workflow types
  fastify.post('/workflow-engine/quick-execute', {
    schema: {
      body: {
        type: 'object',
        required: ['workflowType', 'input'],
        properties: {
          workflowType: { 
            type: 'string', 
            enum: ['youtube_script', 'seo_article', 'ad_copy'] 
          },
          input: { type: 'object' },
          config: { type: 'object' }
        }
      }
    }
  }, controller.quickExecute.bind(controller));

  // System Information Routes
  
  // Get system information
  fastify.get('/workflow-engine/system/info', {}, controller.getSystemInfo.bind(controller));

  // Search templates
  fastify.get('/workflow-engine/search', {
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string' }
        }
      }
    }
  }, controller.searchTemplates.bind(controller));

  // YouTube Script Specific Routes
  
  // Generate YouTube script
  fastify.post('/workflow-engine/youtube-script', {
    schema: {
      body: {
        type: 'object',
        required: ['topic', 'duration', 'style'],
        properties: {
          topic: { type: 'string' },
          duration: { type: 'string' },
          style: { 
            type: 'string', 
            enum: ['educational', 'entertainment', 'tutorial', 'review', 'vlog', 'interview'] 
          },
          targetAudience: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } },
          callToAction: { type: 'string' },
          platform: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const execution = await controller.executeWorkflow(request, reply);
      return execution;
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // SEO Article Specific Routes
  
  // Generate SEO article
  fastify.post('/workflow-engine/seo-article', {
    schema: {
      body: {
        type: 'object',
        required: ['topic', 'keywords'],
        properties: {
          topic: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } },
          targetAudience: { type: 'string' },
          articleLength: { 
            type: 'string', 
            enum: ['short', 'medium', 'long'] 
          },
          tone: { 
            type: 'string', 
            enum: ['formal', 'casual', 'professional', 'conversational'] 
          },
          primaryKeyword: { type: 'string' },
          secondaryKeywords: { type: 'array', items: { type: 'string' } },
          wordCount: { type: 'number' },
          includeMetaDescription: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const execution = await controller.executeWorkflow(request, reply);
      return execution;
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Ad Copy Specific Routes
  
  // Generate ad copy
  fastify.post('/workflow-engine/ad-copy', {
    schema: {
      body: {
        type: 'object',
        required: ['product', 'audience'],
        properties: {
          product: { type: 'string' },
          audience: { type: 'string' },
          adType: { 
            type: 'string', 
            enum: ['social_media', 'display', 'search', 'email', 'landing_page'] 
          },
          tone: { 
            type: 'string', 
            enum: ['professional', 'casual', 'urgent', 'friendly', 'authoritative'] 
          },
          uniqueSellingProposition: { type: 'string' },
          keyBenefits: { type: 'array', items: { type: 'string' } },
          callToAction: { type: 'string' },
          characterLimit: { type: 'number' },
          platform: { type: 'string' },
          urgency: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const execution = await controller.executeWorkflow(request, reply);
      return execution;
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
