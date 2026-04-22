import { IStepProcessor } from '@/domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowStep, WorkflowContext, StepResult } from '@/domain/workflow-engine/entities/Workflow';
import { UserMemoryService } from '@/infrastructure/user-memory/UserMemoryService';
import { InteractionType, AdaptationType } from '@/domain/user-memory/entities/UserMemory';

export class UserMemoryProcessor implements IStepProcessor {
  private userMemoryService: UserMemoryService;

  constructor(userMemoryService: UserMemoryService) {
    this.userMemoryService = userMemoryService;
  }

  canProcess(stepType: string): boolean {
    return stepType === 'user_memory';
  }

  async process(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      const config = step.config || {};
      const userId = this.extractUserId(context);
      
      if (!userId) {
        throw new Error('User ID is required for user memory processing');
      }

      // Ensure user preferences exist
      await this.ensureUserPreferences(userId, config);

      // Add interaction to history
      await this.addInteraction(userId, step, context);

      // Extract and store prompt history if available
      await this.storePromptHistory(userId, context);

      // Detect behavior patterns
      const patterns = await this.detectPatternsIfNeeded(userId);

      // Apply personalization if enabled
      let personalizedContent: string | null = null;
      let adaptations: any[] = [];
      
      if (config.enablePersonalization !== false) {
        const contentToPersonalize = this.extractContentToPersonalize(context);
        if (contentToPersonalize) {
          const personalizationResult = await this.userMemoryService.personalizeContent(
            userId,
            contentToPersonalize,
            {
              workflowType: context.metadata?.workflowType,
              stepId: step.id,
              stepType: step.type
            }
          );
          
          personalizedContent = personalizationResult.personalizedContent;
          adaptations = personalizationResult.adaptations;
        }
      }

      // Apply prompt adaptation if enabled
      let adaptedPrompt: string | null = null;
      
      if (config.enablePromptAdaptation && context.input?.prompt) {
        const adaptationResult = await this.userMemoryService.adaptPrompt(
          userId,
          context.input.prompt,
          {
            workflowType: context.metadata?.workflowType,
            stepId: step.id
          }
        );
        
        adaptedPrompt = adaptationResult.personalizedContent;
      }

      // Get user insights if requested
      let insights = null;
      
      if (config.includeInsights) {
        insights = await this.userMemoryService.getUserInsights(userId);
      }

      // Get personalization score
      const personalizationScore = await this.userMemoryService.getPersonalizationScore(userId);

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          userId,
          patternsDetected: patterns.length,
          personalizedContent,
          adaptedPrompt,
          adaptations,
          insights,
          personalizationScore,
          memoryStats: await this.userMemoryService.getUserMemoryStats(userId)
        },
        metrics: {
          duration,
          tokensUsed: context.metadata?.tokensUsed,
          cost: context.metadata?.cost
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in user memory processing',
        metrics: {
          duration
        }
      };
    }
  }

  async validate(step: WorkflowStep, context: WorkflowContext): Promise<boolean> {
    const userId = this.extractUserId(context);
    
    if (!userId) {
      return false;
    }

    const config = step.config || {};
    
    // Validate configuration
    if (config.maxPromptHistory && (config.maxPromptHistory < 1 || config.maxPromptHistory > 10000)) {
      return false;
    }
    
    if (config.patternDetectionThreshold && (config.patternDetectionThreshold < 0 || config.patternDetectionThreshold > 1)) {
      return false;
    }

    return true;
  }

  // Helper methods

  private extractUserId(context: WorkflowContext): string | null {
    // Try to extract user ID from various sources
    return context.metadata?.userId || 
           context.input?.userId || 
           (context as any).sessionId ||
           null;
  }

  private async ensureUserPreferences(userId: string, config: any): Promise<void> {
    const existingPreferences = await this.userMemoryService.getUserPreferences(userId);
    
    if (!existingPreferences) {
      // Create default preferences
      await this.userMemoryService.createUserPreferences(userId, {
        preferences: {
          language: config.defaultLanguage || 'en',
          tone: config.defaultTone,
          style: config.defaultStyle,
          length: config.defaultLength,
          complexity: config.defaultComplexity,
          targetAudience: config.targetAudience,
          keywords: config.defaultKeywords || [],
          avoidKeywords: config.avoidKeywords || [],
          customInstructions: config.customInstructions
        }
      });
    } else if (config.updatePreferences) {
      // Update existing preferences with config
      await this.userMemoryService.updateUserPreferences(userId, {
        preferences: {
          ...existingPreferences.preferences,
          ...config.updatePreferences
        }
      });
    }
  }

  private async addInteraction(userId: string, step: WorkflowStep, context: WorkflowContext): Promise<void> {
    const interaction = {
      userId,
      interactionType: this.determineInteractionType(step),
      data: {
        stepId: step.id,
        stepType: step.type,
        stepName: step.name,
        workflowType: context.metadata?.workflowType
      },
      context: {
        sessionId: (context as any).sessionId,
        metadata: context.metadata
      },
      outcome: {
        success: true, // Will be updated if step fails
        modifications: [], // Empty for now
        satisfaction: context.metadata?.userSatisfaction
      },
      timestamp: new Date(),
      duration: 0, // Will be updated when step completes
      metadata: {
        contentType: context.metadata?.contentType,
        workflowType: context.metadata?.workflowType,
        tokensUsed: context.metadata?.tokensUsed,
        cost: context.metadata?.cost
      }
    };

    await this.userMemoryService.addInteraction(interaction);
  }

  private determineInteractionType(step: WorkflowStep): InteractionType {
    switch (step.type as string) {
      case 'generate_output':
        return InteractionType.CONTENT_GENERATION;
      case 'quality_score':
        return InteractionType.FEEDBACK;
      case 'versioning':
        return InteractionType.SELECTION;
      case 'refine_output':
        return InteractionType.MODIFICATION;
      default:
        return InteractionType.PROMPT;
    }
  }

  private async storePromptHistory(userId: string, context: WorkflowContext): Promise<void> {
    if (context.input?.prompt) {
      const promptHistory = {
        userId,
        prompt: context.input?.prompt,
        context: {
          workflowType: context.metadata?.workflowType,
          stepId: context.metadata?.currentStep,
          sessionId: (context as any).sessionId
        },
        response: (context as any).output?.output,
        metadata: {
          timestamp: new Date(),
          contentType: context.metadata?.contentType,
          workflowType: context.metadata?.workflowType,
          tokensUsed: context.metadata?.tokensUsed,
          cost: context.metadata?.cost,
          duration: context.metadata?.duration,
          qualityScore: context.metadata?.qualityScore,
          userSatisfaction: context.metadata?.userSatisfaction
        },
        extractedInsights: await this.extractPromptInsights(context.input.prompt)
      };

      await this.userMemoryService.addPromptHistory(promptHistory);
    }
  }

  private async extractPromptInsights(prompt: string): Promise<{
    topics: string[];
    entities: string[];
    intent: string;
    sentiment: string;
    complexity: string;
    requirements: string[];
  }> {
    // Basic prompt analysis - in a real implementation, this would use NLP
    const words = prompt.toLowerCase().split(/\s+/);
    const topics = words
      .filter(word => word.length > 4)
      .slice(0, 5);
    
    const entities = prompt
      .match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []
      .slice(0, 3);
    
    let intent = 'general';
    if (prompt.toLowerCase().includes('create') || prompt.toLowerCase().includes('generate')) {
      intent = 'creative';
    } else if (prompt.toLowerCase().includes('explain') || prompt.toLowerCase().includes('describe')) {
      intent = 'explanatory';
    }
    
    let sentiment = 'neutral';
    if (prompt.includes('?')) sentiment = 'questioning';
    else if (prompt.includes('!')) sentiment = 'enthusiastic';
    
    const complexity = prompt.length > 200 ? 'complex' : prompt.length > 100 ? 'moderate' : 'simple';
    
    const requirements = words
      .filter(word => ['include', 'must', 'should', 'require', 'need'].some(req => word.includes(req)))
      .slice(0, 3);

    return {
      topics,
      entities,
      intent,
      sentiment,
      complexity,
      requirements
    };
  }

  private async detectPatternsIfNeeded(userId: string): Promise<any[]> {
    const stats = await this.userMemoryService.getUserMemoryStats(userId);
    
    // Detect patterns every 10 interactions
    if (stats.totalInteractions % 10 === 0) {
      return await this.userMemoryService.detectBehaviorPatterns(userId);
    }
    
    return [];
  }

  private extractContentToPersonalize(context: WorkflowContext): string | null {
    // Try to extract content from various sources
    return (context as any).output?.output ||
           context.input?.content ||
           context.metadata?.content ||
           null;
  }

  // Helper method to create a user memory step
  static createUserMemoryStep(config: {
    enablePersonalization?: boolean;
    enablePromptAdaptation?: boolean;
    includeInsights?: boolean;
    updatePreferences?: any;
    defaultLanguage?: string;
    defaultTone?: string;
    defaultStyle?: string;
    defaultLength?: string;
    defaultComplexity?: string;
    targetAudience?: string;
    defaultKeywords?: string[];
    avoidKeywords?: string[];
    customInstructions?: string;
  }): WorkflowStep {
    return {
      id: 'user_memory',
      type: 'user_memory' as any,
      name: 'User Memory Processing',
      description: 'Processes user interactions, detects patterns, and applies personalization',
      order: 1, // Typically early in the workflow
      dependencies: [],
      status: 'pending' as any,
      timeout: 30000, // 30 seconds timeout
      retryConfig: {
        maxRetries: 1,
        retryDelay: 1000,
        backoffMultiplier: 2
      },
      config
    };
  }

  // Helper method to add user memory to existing workflow templates
  static addUserMemoryToTemplate(template: any, config?: any): any {
    const userMemoryStep = this.createUserMemoryStep(config || {});
    
    // Add the user memory step to the template
    const updatedTemplate = {
      ...template,
      steps: [userMemoryStep, ...template.steps]
    };

    // Update dependencies for other steps to depend on user memory
    updatedTemplate.steps.forEach((step: any, index: number) => {
      if (index > 0 && step.type !== 'user_memory') {
        if (!step.dependencies.includes('user_memory')) {
          step.dependencies.push('user_memory');
        }
      }
    });

    return updatedTemplate;
  }

  // Method to create user memory configuration for different use cases
  static createConfigForContentType(contentType: string): any {
    const configs: Record<string, any> = {
      'youtube_script': {
        enablePersonalization: true,
        enablePromptAdaptation: true,
        includeInsights: true,
        defaultTone: 'engaging',
        defaultStyle: 'conversational',
        targetAudience: 'youtube viewers',
        customInstructions: 'Make content engaging and suitable for YouTube format'
      },
      'seo_article': {
        enablePersonalization: true,
        enablePromptAdaptation: true,
        includeInsights: false,
        defaultTone: 'professional',
        defaultStyle: 'informative',
        targetAudience: 'readers interested in the topic',
        customInstructions: 'Focus on SEO optimization and informative content'
      },
      'ad_copy': {
        enablePersonalization: true,
        enablePromptAdaptation: true,
        includeInsights: true,
        defaultTone: 'persuasive',
        defaultStyle: 'marketing',
        targetAudience: 'potential customers',
        customInstructions: 'Create persuasive and compelling marketing copy'
      },
      'email': {
        enablePersonalization: true,
        enablePromptAdaptation: true,
        includeInsights: false,
        defaultTone: 'professional',
        defaultStyle: 'business',
        targetAudience: 'email recipients',
        customInstructions: 'Maintain professional email communication standards'
      }
    };

    return configs[contentType] || configs['seo_article'];
  }

  // Method to extract user context for workflow execution
  static extractUserContext(context: WorkflowContext): {
    userId: string;
    sessionId: string;
    preferences: any;
    patterns: any[];
    personalized: boolean;
  } {
    return {
      userId: context.metadata?.userId || 'anonymous',
      sessionId: (context as any).sessionId || 'default',
      preferences: context.metadata?.userPreferences || {},
      patterns: context.metadata?.behaviorPatterns || [],
      personalized: context.metadata?.personalized || false
    };
  }

  // Method to update context with user memory data
  static enrichContextWithMemory(context: WorkflowContext, memoryData: any): WorkflowContext {
    return {
      ...context,
      metadata: {
        ...context.metadata,
        userMemory: memoryData,
        personalized: memoryData.personalizedContent ? true : false,
        adaptationCount: memoryData.adaptations?.length || 0
      },
      // If content was personalized, update the output
      ...(memoryData.personalizedContent && {
        output: {
          ...(context as any).output,
          output: memoryData.personalizedContent,
          personalized: true
        }
      })
    };
  }
}
