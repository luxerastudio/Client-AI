import { FastifyInstance } from 'fastify';
import { WorkflowController } from '../controllers/WorkflowController';

export async function workflowRoutes(fastify: FastifyInstance, controller: WorkflowController) {
  
  fastify.post('/workflows', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'type', 'steps', 'userId'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          type: { 
            type: 'string', 
            enum: ['content_generation', 'youtube_script', 'seo_writing', 'automation_pipeline'] 
          },
          steps: { 
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                type: { type: 'string' },
                config: { type: 'object' },
                order: { type: 'number' }
              }
            }
          },
          config: { type: 'object' },
          userId: { type: 'string' }
        }
      }
    }
  }, controller.createWorkflow.bind(controller));

  fastify.post('/workflows/:workflowId/execute', {
    schema: {
      params: {
        type: 'object',
        required: ['workflowId'],
        properties: {
          workflowId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          input: { type: 'object' }
        }
      }
    }
  }, controller.executeWorkflow.bind(controller));

  fastify.post('/content/generate', {
    schema: {
      body: {
        type: 'object',
        required: ['type', 'prompt'],
        properties: {
          type: { 
            type: 'string', 
            enum: ['content', 'youtube_script', 'seo_content'] 
          },
          prompt: { type: 'string' },
          config: { type: 'object' },
          keywords: { 
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    }
  }, controller.generateContent.bind(controller));

  fastify.get('/workflows/executions/:executionId/status', {
    schema: {
      params: {
        type: 'object',
        required: ['executionId'],
        properties: {
          executionId: { type: 'string' }
        }
      }
    }
  }, controller.getWorkflowStatus.bind(controller));
}
