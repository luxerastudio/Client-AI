import { WorkflowTemplate, WorkflowStep, WorkflowStepType } from '@/domain/workflow-engine/entities/Workflow';

export class AdCopyWorkflow {
  static getTemplate(): WorkflowTemplate {
    return {
      id: 'ad-copy-generator',
      name: 'Ad Copy Generator',
      description: 'Creates compelling advertising copy with hooks, benefits, and persuasive calls to action',
      category: 'marketing',
      tags: ['advertising', 'copy', 'marketing', 'conversion', 'persuasion'],
      steps: [
        {
          id: 'analyze_audience_product',
          type: WorkflowStepType.ANALYZE_INPUT,
          name: 'Analyze Audience & Product',
          description: 'Analyze target audience, product features, and marketing objectives',
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
            analysisType: 'marketing',
            requiredFields: ['product', 'audience'],
            focus: 'advertising'
          }
        },
        {
          id: 'structure_ad_copy',
          type: WorkflowStepType.BREAKDOWN_STRUCTURE,
          name: 'Structure Ad Components',
          description: 'Break down the ad copy into headline, benefits, features, and CTA sections',
          order: 1,
          dependencies: ['analyze_audience_product'],
          status: 'pending' as any,
          timeout: 30000,
          retryConfig: {
            maxRetries: 3,
            retryDelay: 1000,
            backoffMultiplier: 2
          },
          config: {
            structureType: 'ad_copy',
            includeHeadline: true,
            includeCTA: true,
            componentCount: 4
          }
        },
        {
          id: 'generate_ad_copy',
          type: WorkflowStepType.GENERATE_OUTPUT,
          name: 'Generate Ad Copy',
          description: 'Write persuasive ad copy with emotional appeals and clear benefits',
          order: 2,
          dependencies: ['structure_ad_copy'],
          status: 'pending' as any,
          timeout: 45000,
          retryConfig: {
            maxRetries: 2,
            retryDelay: 2000,
            backoffMultiplier: 2
          },
          config: {
            outputType: 'ad_copy',
            copyStyle: 'persuasive',
            includeEmotional: true,
            maxTokens: 800,
            temperature: 0.8
          }
        },
        {
          id: 'refine_ad_copy',
          type: WorkflowStepType.REFINE_OUTPUT,
          name: 'Refine & Optimize Copy',
          description: 'Refine the ad copy for maximum conversion and engagement',
          order: 3,
          dependencies: ['generate_ad_copy'],
          status: 'pending' as any,
          timeout: 30000,
          retryConfig: {
            maxRetries: 2,
            retryDelay: 1500,
            backoffMultiplier: 2
          },
          config: {
            refinementType: 'engagement',
            targetTone: 'persuasive',
            optimizeFor: 'conversion',
            includeUrgency: true
          }
        }
      ],
      inputSchema: {
        type: 'object',
        required: ['product', 'audience'],
        properties: {
          product: {
            type: 'string',
            description: 'Product or service being advertised'
          },
          audience: {
            type: 'string',
            description: 'Target audience for the advertisement'
          },
          adType: {
            type: 'string',
            enum: ['social_media', 'display', 'search', 'email', 'landing_page'],
            description: 'Type of advertisement'
          },
          tone: {
            type: 'string',
            enum: ['professional', 'casual', 'urgent', 'friendly', 'authoritative'],
            description: 'Tone of the advertisement'
          },
          uniqueSellingProposition: {
            type: 'string',
            description: 'Unique selling proposition of the product'
          },
          keyBenefits: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key benefits to highlight'
          },
          callToAction: {
            type: 'string',
            description: 'Desired call to action'
          },
          characterLimit: {
            type: 'number',
            description: 'Character limit for the ad copy'
          },
          platform: {
            type: 'string',
            description: 'Platform where the ad will be displayed'
          },
          urgency: {
            type: 'boolean',
            default: false,
            description: 'Include urgency elements'
          }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          adCopy: {
            type: 'string',
            description: 'Complete advertising copy'
          },
          metadata: {
            type: 'object',
            properties: {
              characterCount: { type: 'number' },
              wordCount: { type: 'number' },
              emotionalScore: { type: 'number' },
              persuasionScore: { type: 'number' }
            }
          },
          components: {
            type: 'object',
            properties: {
              headline: { type: 'string' },
              subheadline: { type: 'string' },
              bodyCopy: { type: 'string' },
              callToAction: { type: 'string' }
            }
          },
          suggestions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Suggestions for ad optimization'
          }
        }
      },
      metadata: {
        version: '1.0.0',
        author: 'Workflow Engine',
        estimatedProcessingTime: '2-3 minutes',
        complexity: 'medium',
        successRate: 0.86
      },
      isActive: true,
      version: '1.0.0'
    };
  }

  static getCustomTemplate(config: {
    adType?: string;
    tone?: string;
    characterLimit?: number;
    includeUrgency?: boolean;
  }): WorkflowTemplate {
    const baseTemplate = this.getTemplate();
    
    // Customize the template based on configuration
    if (config.adType) {
      baseTemplate.inputSchema!.properties!.adType = {
        type: 'string',
        default: config.adType
      };
    }
    
    if (config.tone) {
      baseTemplate.inputSchema!.properties!.tone = {
        type: 'string',
        default: config.tone
      };
    }
    
    if (config.characterLimit) {
      baseTemplate.inputSchema!.properties!.characterLimit = {
        type: 'number',
        default: config.characterLimit
      };
    }
    
    if (config.includeUrgency !== undefined) {
      baseTemplate.inputSchema!.properties!.urgency = {
        type: 'boolean',
        default: config.includeUrgency
      };
    }
    
    return baseTemplate;
  }

  static getVariants(): Array<{ name: string; template: WorkflowTemplate }> {
    return [
      {
        name: 'Facebook Ad',
        template: this.getCustomTemplate({
          adType: 'social_media',
          tone: 'friendly',
          characterLimit: 280,
          includeUrgency: true
        })
      },
      {
        name: 'Google Search Ad',
        template: this.getCustomTemplate({
          adType: 'search',
          tone: 'professional',
          characterLimit: 90,
          includeUrgency: false
        })
      },
      {
        name: 'Email Campaign',
        template: this.getCustomTemplate({
          adType: 'email',
          tone: 'conversational',
          characterLimit: 500,
          includeUrgency: true
        })
      },
      {
        name: 'Landing Page Copy',
        template: this.getCustomTemplate({
          adType: 'landing_page',
          tone: 'persuasive',
          characterLimit: 1000,
          includeUrgency: true
        })
      }
    ];
  }
}
