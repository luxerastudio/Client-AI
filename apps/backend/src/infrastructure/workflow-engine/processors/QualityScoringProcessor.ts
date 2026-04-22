import { IStepProcessor } from '@/domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowStep, WorkflowContext, StepResult, WorkflowStepType } from '@/domain/workflow-engine/entities/Workflow';
import { QualityScoringService } from '@/infrastructure/quality-scoring/QualityScoringService';
import { QualityEvaluationRequest, QualityResult } from '@/domain/quality-scoring/entities/QualityScore';

export class QualityScoringProcessor implements IStepProcessor {
  private qualityService: QualityScoringService;

  constructor(apiKey: string) {
    this.qualityService = new QualityScoringService(apiKey);
  }

  canProcess(stepType: string): boolean {
    return stepType === 'quality_score';
  }

  async process(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      const config = step.config || {};
      
      // Get the generated output from previous steps
      const generatedOutput = this.extractGeneratedOutput(context);
      
      if (!generatedOutput) {
        throw new Error('No generated output found to score');
      }

      // Build quality evaluation request
      const evaluationRequest: QualityEvaluationRequest = {
        content: generatedOutput,
        context: context.metadata,
        criteria: {
          targetAudience: config.targetAudience,
          purpose: config.purpose,
          keywords: config.keywords,
          expectedLength: config.expectedLength,
          tone: config.tone
        },
        thresholds: {
          minimum: config.minScore || 7,
          excellent: config.excellentScore || 8.5
        }
      };

      // Evaluate with auto-regeneration if enabled
      const enableRegeneration = config.enableRegeneration !== false;
      let result: QualityResult;

      if (enableRegeneration) {
        result = await this.qualityService.evaluateWithRegeneration(evaluationRequest);
      } else {
        const score = await this.qualityService.evaluate(evaluationRequest);
        result = {
          success: true,
          score,
          output: undefined,
          regenerated: false,
          regenerationAttempts: 0,
          processingTime: Date.now() - startTime
        };
      }

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          qualityScore: result.score,
          output: result.output,
          regenerated: result.regenerated,
          regenerationAttempts: result.regenerationAttempts,
          passed: result.score.passed,
          needsRegeneration: result.score.needsRegeneration,
          suggestions: result.score.suggestions,
          breakdown: result.score.breakdown,
          metadata: result.score.metadata
        },
        metrics: {
          duration,
          tokensUsed: 0, // Quality scoring doesn't use AI tokens directly
          cost: 0
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in quality scoring',
        metrics: {
          duration
        }
      };
    }
  }

  async validate(step: WorkflowStep, context: WorkflowContext): Promise<boolean> {
    // Check if we have generated output from previous steps
    const generatedOutput = this.extractGeneratedOutput(context);
    if (!generatedOutput) {
      return false;
    }

    // Validate configuration
    const config = step.config || {};
    if (config.minScore && (config.minScore < 0 || config.minScore > 10)) {
      return false;
    }

    if (config.excellentScore && (config.excellentScore < 0 || config.excellentScore > 10)) {
      return false;
    }

    return true;
  }

  private extractGeneratedOutput(context: WorkflowContext): string | null {
    // Try to find the most recent generated output
    const stepResults = context.stepResults;
    
    // Look for output from generation step
    const generationStep = Object.keys(stepResults)
      .filter(stepId => stepId.includes('generate'))
      .sort((a, b) => {
        // Get the step with the highest order number
        const orderA = parseInt(a.split('_').pop() || '0');
        const orderB = parseInt(b.split('_').pop() || '0');
        return orderB - orderA;
      })[0];

    if (generationStep && stepResults[generationStep]?.data?.output) {
      return stepResults[generationStep].data.output;
    }

    // Look for refined output
    const refinementStep = Object.keys(stepResults)
      .filter(stepId => stepId.includes('refine'))
      .sort((a, b) => {
        const orderA = parseInt(a.split('_').pop() || '0');
        const orderB = parseInt(b.split('_').pop() || '0');
        return orderB - orderA;
      })[0];

    if (refinementStep && stepResults[refinementStep]?.data?.refinedOutput) {
      return stepResults[refinementStep].data.refinedOutput;
    }

    // Look for any output field
    for (const [stepId, result] of Object.entries(stepResults)) {
      if (result.success && result.data) {
        if (result.data.output) {
          return result.data.output;
        }
        if (result.data.refinedOutput) {
          return result.data.refinedOutput;
        }
        if (result.data.content) {
          return result.data.content;
        }
      }
    }

    return null;
  }

  // Helper method to create a quality scoring step
  static createQualityScoringStep(config: {
    minScore?: number;
    excellentScore?: number;
    enableRegeneration?: boolean;
    targetAudience?: string;
    purpose?: string;
    keywords?: string[];
    expectedLength?: string;
    tone?: string;
  }): WorkflowStep {
    return {
      id: 'quality_score',
      type: 'quality_score' as any,
      name: 'Quality Scoring',
      description: 'Scores the generated content for quality and regenerates if needed',
      order: 4, // Typically the last step
      dependencies: ['generate_output', 'refine_output'],
      status: 'pending' as any,
      timeout: 60000,
      retryConfig: {
        maxRetries: 2,
        retryDelay: 1000,
        backoffMultiplier: 2
      },
      config
    };
  }

  // Helper method to add quality scoring to existing workflow templates
  static addQualityScoringToTemplate(template: any, config?: any): any {
    const qualityStep = this.createQualityScoringStep(config || {});
    
    // Add the quality scoring step to the template
    const updatedTemplate = {
      ...template,
      steps: [...template.steps, qualityStep]
    };

    // Update dependencies to include quality scoring
    updatedTemplate.steps.forEach((step: any) => {
      if (step.type === 'generate_output' || step.type === 'refine_output') {
        if (!step.dependencies.includes('quality_score')) {
          step.dependencies.push('quality_score');
        }
      }
    });

    return updatedTemplate;
  }
}
