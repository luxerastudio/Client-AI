import { WorkflowTemplate, WorkflowStep, WorkflowStepType } from '@/domain/workflow-engine/entities/Workflow';

export class SEOArticleWorkflow {
  static getTemplate(): WorkflowTemplate {
    return {
      id: 'seo-article-generator',
      name: 'SEO Article Generator',
      description: 'Creates SEO-optimized articles with proper structure, keywords, and search engine optimization',
      category: 'content_marketing',
      tags: ['seo', 'article', 'content', 'optimization', 'marketing'],
      steps: [
        {
          id: 'analyze_seo_requirements',
          type: WorkflowStepType.ANALYZE_INPUT,
          name: 'Analyze SEO Requirements',
          description: 'Analyze topic, keywords, target audience, and SEO requirements',
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
            analysisType: 'seo',
            requiredFields: ['topic', 'keywords'],
            focus: 'seo_optimization'
          }
        },
        {
          id: 'structure_article',
          type: WorkflowStepType.BREAKDOWN_STRUCTURE,
          name: 'Structure Article Components',
          description: 'Break down the article into SEO-friendly sections with proper hierarchy',
          order: 1,
          dependencies: ['analyze_seo_requirements'],
          status: 'pending' as any,
          timeout: 30000,
          retryConfig: {
            maxRetries: 3,
            retryDelay: 1000,
            backoffMultiplier: 2
          },
          config: {
            structureType: 'article',
            includeHeadings: true,
            seoStructure: true,
            sectionCount: 6
          }
        },
        {
          id: 'generate_article',
          type: WorkflowStepType.GENERATE_OUTPUT,
          name: 'Generate SEO Article',
          description: 'Write the complete SEO-optimized article with keyword integration',
          order: 2,
          dependencies: ['structure_article'],
          status: 'pending' as any,
          timeout: 60000,
          retryConfig: {
            maxRetries: 2,
            retryDelay: 2000,
            backoffMultiplier: 2
          },
          config: {
            outputType: 'article',
            articleStyle: 'informative',
            optimizeForSEO: true,
            maxTokens: 2500,
            temperature: 0.6
          }
        },
        {
          id: 'refine_seo',
          type: WorkflowStepType.REFINE_OUTPUT,
          name: 'Refine SEO Optimization',
          description: 'Refine the article for better SEO performance and readability',
          order: 3,
          dependencies: ['generate_article'],
          status: 'pending' as any,
          timeout: 45000,
          retryConfig: {
            maxRetries: 2,
            retryDelay: 1500,
            backoffMultiplier: 2
          },
          config: {
            refinementType: 'seo',
            targetTone: 'authoritative',
            optimizeFor: 'search_engines',
            includeMeta: true
          }
        }
      ],
      inputSchema: {
        type: 'object',
        required: ['topic', 'keywords'],
        properties: {
          topic: {
            type: 'string',
            description: 'Main topic of the article'
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Target keywords for SEO optimization'
          },
          targetAudience: {
            type: 'string',
            description: 'Target audience for the article'
          },
          articleLength: {
            type: 'string',
            enum: ['short', 'medium', 'long'],
            description: 'Desired article length'
          },
          tone: {
            type: 'string',
            enum: ['formal', 'casual', 'professional', 'conversational'],
            description: 'Tone of the article'
          },
          primaryKeyword: {
            type: 'string',
            description: 'Primary keyword for focus'
          },
          secondaryKeywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Secondary keywords to include'
          },
          wordCount: {
            type: 'number',
            description: 'Target word count'
          },
          includeMetaDescription: {
            type: 'boolean',
            default: true,
            description: 'Generate meta description'
          }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          article: {
            type: 'string',
            description: 'Complete SEO-optimized article'
          },
          metadata: {
            type: 'object',
            properties: {
              wordCount: { type: 'number' },
              keywordDensity: { type: 'number' },
              readabilityScore: { type: 'number' },
              seoScore: { type: 'number' }
            }
          },
          seoElements: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              metaDescription: { type: 'string' },
              headings: { type: 'array', items: { type: 'string' } },
              internalLinks: { type: 'array', items: { type: 'string' } }
            }
          },
          suggestions: {
            type: 'array',
            items: { type: 'string' },
            description: 'SEO improvement suggestions'
          }
        }
      },
      metadata: {
        version: '1.0.0',
        author: 'Workflow Engine',
        estimatedProcessingTime: '3-4 minutes',
        complexity: 'medium',
        successRate: 0.88
      },
      isActive: true,
      version: '1.0.0'
    };
  }

  static getCustomTemplate(config: {
    articleLength?: string;
    tone?: string;
    includeMetaDescription?: boolean;
    targetWordCount?: number;
  }): WorkflowTemplate {
    const baseTemplate = this.getTemplate();
    
    // Customize the template based on configuration
    if (config.articleLength) {
      baseTemplate.inputSchema!.properties!.articleLength = {
        type: 'string',
        default: config.articleLength
      };
    }
    
    if (config.tone) {
      baseTemplate.inputSchema!.properties!.tone = {
        type: 'string',
        default: config.tone
      };
    }
    
    if (config.includeMetaDescription !== undefined) {
      baseTemplate.inputSchema!.properties!.includeMetaDescription = {
        type: 'boolean',
        default: config.includeMetaDescription
      };
    }
    
    if (config.targetWordCount) {
      baseTemplate.inputSchema!.properties!.wordCount = {
        type: 'number',
        default: config.targetWordCount
      };
    }
    
    return baseTemplate;
  }

  static getVariants(): Array<{ name: string; template: WorkflowTemplate }> {
    return [
      {
        name: 'Blog Post',
        template: this.getCustomTemplate({
          articleLength: 'medium',
          tone: 'conversational',
          includeMetaDescription: true,
          targetWordCount: 1500
        })
      },
      {
        name: 'Technical Article',
        template: this.getCustomTemplate({
          articleLength: 'long',
          tone: 'professional',
          includeMetaDescription: true,
          targetWordCount: 2500
        })
      },
      {
        name: 'News Article',
        template: this.getCustomTemplate({
          articleLength: 'medium',
          tone: 'formal',
          includeMetaDescription: true,
          targetWordCount: 800
        })
      },
      {
        name: 'Product Review',
        template: this.getCustomTemplate({
          articleLength: 'medium',
          tone: 'conversational',
          includeMetaDescription: true,
          targetWordCount: 1200
        })
      }
    ];
  }
}
