import { WorkflowTemplate, WorkflowStep, WorkflowStepType } from '@/domain/workflow-engine/entities/Workflow';

export class YouTubeScriptWorkflow {
  static getTemplate(): WorkflowTemplate {
    return {
      id: 'youtube-script-generator',
      name: 'YouTube Script Generator',
      description: 'Creates engaging YouTube video scripts with hooks, content, and calls to action',
      category: 'video_content',
      tags: ['youtube', 'script', 'video', 'content', 'engagement'],
      steps: [
        {
          id: 'analyze_topic',
          type: WorkflowStepType.ANALYZE_INPUT,
          name: 'Analyze Topic & Audience',
          description: 'Analyze the video topic, target audience, and content requirements',
          order: 0,
          dependencies: [],
          status: 'pending' as any,
          timeout: 30000,
          retryConfig: {
            maxRetries: 3,
            retryDelay: 1000,
            backoffMultiplier: 2
          },
          config: {
            analysisType: 'content',
            requiredFields: ['topic', 'duration', 'style'],
            focus: 'video_content'
          }
        },
        {
          id: 'structure_script',
          type: WorkflowStepType.BREAKDOWN_STRUCTURE,
          name: 'Structure Script Components',
          description: 'Break down the script into hook, intro, main content, and CTA sections',
          order: 1,
          dependencies: ['analyze_topic'],
          status: 'pending' as any,
          timeout: 30000,
          retryConfig: {
            maxRetries: 3,
            retryDelay: 1000,
            backoffMultiplier: 2
          },
          config: {
            structureType: 'script',
            includeTimestamps: true,
            segmentCount: 5
          }
        },
        {
          id: 'generate_script',
          type: WorkflowStepType.GENERATE_OUTPUT,
          name: 'Generate Script Content',
          description: 'Write the complete YouTube script with engaging content',
          order: 2,
          dependencies: ['structure_script'],
          status: 'pending' as any,
          timeout: 60000,
          retryConfig: {
            maxRetries: 2,
            retryDelay: 2000,
            backoffMultiplier: 2
          },
          config: {
            outputType: 'script',
            scriptStyle: 'conversational',
            includeHooks: true,
            maxTokens: 2000,
            temperature: 0.8
          }
        },
        {
          id: 'refine_script',
          type: WorkflowStepType.REFINE_OUTPUT,
          name: 'Refine & Optimize Script',
          description: 'Refine the script for engagement, clarity, and YouTube optimization',
          order: 3,
          dependencies: ['generate_script'],
          status: 'pending' as any,
          timeout: 45000,
          retryConfig: {
            maxRetries: 2,
            retryDelay: 1500,
            backoffMultiplier: 2
          },
          config: {
            refinementType: 'engagement',
            targetTone: 'engaging',
            optimizeFor: 'youtube',
            includeCTA: true
          }
        }
      ],
      inputSchema: {
        type: 'object',
        required: ['topic', 'duration', 'style'],
        properties: {
          topic: {
            type: 'string',
            description: 'Main topic or subject of the video'
          },
          duration: {
            type: 'string',
            description: 'Target video duration (e.g., "10 minutes", "5-8 minutes")'
          },
          style: {
            type: 'string',
            enum: ['educational', 'entertainment', 'tutorial', 'review', 'vlog', 'interview'],
            description: 'Video style and format'
          },
          targetAudience: {
            type: 'string',
            description: 'Target audience for the video'
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Keywords for SEO and discoverability'
          },
          callToAction: {
            type: 'string',
            description: 'Specific call to action for viewers'
          },
          platform: {
            type: 'string',
            default: 'youtube',
            description: 'Primary platform for the video'
          }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          script: {
            type: 'string',
            description: 'Complete video script'
          },
          metadata: {
            type: 'object',
            properties: {
              estimatedDuration: { type: 'string' },
              wordCount: { type: 'number' },
              hookCount: { type: 'number' },
              engagementScore: { type: 'number' }
            }
          },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                content: { type: 'string' },
                timestamp: { type: 'string' }
              }
            }
          },
          suggestions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Suggestions for video production and optimization'
          }
        }
      },
      metadata: {
        version: '1.0.0',
        author: 'Workflow Engine',
        estimatedProcessingTime: '2-3 minutes',
        complexity: 'medium',
        successRate: 0.85
      },
      isActive: true,
      version: '1.0.0'
    };
  }

  static getCustomTemplate(config: {
    style?: string;
    duration?: string;
    includeTimestamps?: boolean;
    optimizeForSEO?: boolean;
  }): WorkflowTemplate {
    const baseTemplate = this.getTemplate();
    
    // Customize the template based on configuration
    if (config.style) {
      baseTemplate.steps[2].config!.scriptStyle = config.style;
    }
    
    if (config.duration) {
      baseTemplate.inputSchema!.properties!.duration = {
        type: 'string',
        default: config.duration
      };
    }
    
    if (config.includeTimestamps !== undefined) {
      baseTemplate.steps[1].config!.includeTimestamps = config.includeTimestamps;
    }
    
    if (config.optimizeForSEO) {
      baseTemplate.steps.push({
        id: 'seo_optimization',
        type: WorkflowStepType.REFINE_OUTPUT,
        name: 'SEO Optimization',
        description: 'Optimize script for YouTube SEO and discoverability',
        order: 4,
        dependencies: ['refine_script'],
        status: 'pending' as any,
        timeout: 30000,
        retryConfig: {
          maxRetries: 2,
          retryDelay: 1000,
          backoffMultiplier: 2
        },
        config: {
          refinementType: 'seo',
          keywords: ['youtube', 'video', 'content'],
          optimizeFor: 'youtube'
        }
      });
    }
    
    return baseTemplate;
  }

  static getVariants(): Array<{ name: string; template: WorkflowTemplate }> {
    return [
      {
        name: 'Educational Tutorial',
        template: this.getCustomTemplate({
          style: 'educational',
          includeTimestamps: true,
          optimizeForSEO: true
        })
      },
      {
        name: 'Entertainment Video',
        template: this.getCustomTemplate({
          style: 'entertainment',
          includeTimestamps: false,
          optimizeForSEO: true
        })
      },
      {
        name: 'Product Review',
        template: this.getCustomTemplate({
          style: 'review',
          includeTimestamps: true,
          optimizeForSEO: true
        })
      },
      {
        name: 'Quick Tutorial',
        template: this.getCustomTemplate({
          style: 'tutorial',
          duration: '5-8 minutes',
          includeTimestamps: true,
          optimizeForSEO: false
        })
      }
    ];
  }
}
