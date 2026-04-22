import { FastifyRequest, FastifyReply } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';
import { WorkflowExecutionEngine } from '../../infrastructure/workflow-engine/WorkflowExecutionEngine';

export class WorkflowEngineController {
  private registry: any;

  constructor(private container: DependencyContainer) {
    this.registry = {
      getTemplateStats: () => ({ total: 0, categories: 0 }),
      getSupportedStepTypes: () => ['ai_process', 'data_transform', 'condition'],
      getProcessorCount: () => 1
    };
  }

  private getWorkflowEngine() {
    return this.container.get('workflowEngine') as WorkflowExecutionEngine;
  }

  // Template Management
  async getTemplates(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { category, tags, name } = request.query as any;
      
      let templates;
      if (category) {
        templates = await this.getWorkflowEngine().getTemplatesByCategory(category);
      } else if (tags || name) {
        // Simplified template search - in production would use registry
        templates = await this.getWorkflowEngine().getAllTemplates();
      } else {
        templates = await this.getWorkflowEngine().getAllTemplates();
      }

      return reply.send({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      const template = await this.getWorkflowEngine().getTemplate(id);
      if (!template) {
        return reply.status(404).send({
          success: false,
          error: 'Template not found'
        });
      }

      return reply.send({
        success: true,
        data: template
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const templateData = request.body as any;
      
      await this.getWorkflowEngine().registerTemplate(templateData);
      
      return reply.status(201).send({
        success: true,
        message: 'Template created successfully',
        data: templateData
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const updates = request.body as any;
      
      const updatedTemplate = await this.getWorkflowEngine().updateTemplate(id, updates);
      
      return reply.send({
        success: true,
        message: 'Template updated successfully',
        data: updatedTemplate
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      await this.getWorkflowEngine().deleteTemplate(id);
      
      return reply.send({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async validateTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const template = request.body as any;
      
      const validation = await this.getWorkflowEngine().validateWorkflow(template);
      
      return reply.send({
        success: true,
        data: validation
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Execution Management
  async executeWorkflow(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { templateId } = request.params as any;
      const { input, config } = request.body as any;
      
      const execution = await this.getWorkflowEngine().executeWorkflow(templateId, input, config);
      
      return reply.send({
        success: true,
        data: execution
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getExecution(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      const execution = await this.getWorkflowEngine().getExecution(id);
      if (!execution) {
        return reply.status(404).send({
          success: false,
          error: 'Execution not found'
        });
      }

      return reply.send({
        success: true,
        data: execution
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getExecutions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { templateId } = request.query as any;
      
      let executions;
      if (templateId) {
        executions = await this.getWorkflowEngine().getExecutionsByTemplate(templateId);
      } else {
        executions = Array.from((this.getWorkflowEngine() as any).executions.values());
      }

      return reply.send({
        success: true,
        data: executions,
        count: executions.length
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async cancelExecution(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      await this.getWorkflowEngine().cancelExecution(id);
      
      return reply.send({
        success: true,
        message: 'Execution cancelled successfully'
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async retryExecution(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      
      const execution = await this.getWorkflowEngine().retryExecution(id);
      
      return reply.send({
        success: true,
        message: 'Execution retry started',
        data: execution
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Quick Execute (for common workflows)
  async quickExecute(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { workflowType, input, config } = request.body as any;
      
      // Map workflow types to template IDs
      const templateMap: Record<string, string> = {
        'youtube_script': 'youtube-script-generator',
        'seo_article': 'seo-article-generator',
        'ad_copy': 'ad-copy-generator'
      };
      
      const templateId = templateMap[workflowType];
      if (!templateId) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid workflow type'
        });
      }
      
      const execution = await this.getWorkflowEngine().executeWorkflow(templateId, input, config);
      
      return reply.send({
        success: true,
        data: execution
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // System Information
  async getSystemInfo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await this.registry.getTemplateStats();
      const supportedStepTypes = this.registry.getSupportedStepTypes();
      
      return reply.send({
        success: true,
        data: {
          templates: stats,
          supportedStepTypes,
          processorCount: this.registry.getProcessorCount()
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Search
  async searchTemplates(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { q } = request.query as any;
      
      if (!q) {
        return reply.status(400).send({
          success: false,
          error: 'Search query is required'
        });
      }
      
      const templates = await this.registry.searchTemplates(q);
      
      return reply.send({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

}
