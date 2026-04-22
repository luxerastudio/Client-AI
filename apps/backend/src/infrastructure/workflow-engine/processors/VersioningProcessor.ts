import { IStepProcessor } from '@/domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowStep, WorkflowContext, StepResult } from '@/domain/workflow-engine/entities/Workflow';
import { VersioningService } from '@/infrastructure/versioning/VersioningService';
import { VersionGenerationStrategy, VersionStatus } from '@/domain/versioning/entities/Version';

export class VersioningProcessor implements IStepProcessor {
  private versioningService: VersioningService;

  constructor(versioningService: VersioningService) {
    this.versioningService = versioningService;
  }

  canProcess(stepType: string): boolean {
    return stepType === 'versioning';
  }

  async process(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      const config = step.config || {};
      
      // Get the generated output from previous steps
      const generatedOutput = this.extractGeneratedOutput(context);
      
      if (!generatedOutput) {
        throw new Error('No generated output found for versioning');
      }

      // Create version request
      const request = await this.versioningService.createVersionRequest({
        content: generatedOutput,
        ...context.metadata
      }, {
        maxVersions: config.maxVersions || 3,
        strategy: config.strategy || VersionGenerationStrategy.SEQUENTIAL,
        selectionCriteria: config.selectionCriteria || 'quality',
        improvementThreshold: config.improvementThreshold || 7,
        enableComparison: config.enableComparison !== false,
        autoSelect: config.autoSelect || false,
        retainAllVersions: config.retainAllVersions !== false
      });

      // Update request context
      await this.versioningService.updateVersionRequest(request.id, {
        context: {
          ...request.context,
          stepId: step.id,
          originalInput: context.input,
          targetAudience: config.targetAudience,
          purpose: config.purpose,
          keywords: config.keywords,
          tone: config.tone
        }
      });

      // Generate versions
      const versions = await this.versioningService.generateVersions(request.id);

      // Evaluate versions (quality scoring is done during generation)
      let bestVersion: any = null;
      let comparison: any = null;

      if (versions.length > 0 && config.enableComparison !== false) {
        try {
          // Select best version
          bestVersion = await this.versioningService.selectBestVersion(
            request.id, 
            config.selectionCriteria || 'quality'
          );

          // Get comparison details
          const allVersions = await this.versioningService.getAllVersions(request.id);
          if (allVersions.length > 1) {
            comparison = await this.versioningService.compareVersions(
              request.id,
              allVersions.map(v => v.id),
              ['quality', 'content']
            );
          }
        } catch (error) {
          console.warn('Version selection failed:', error);
          // Fallback to first version
          bestVersion = versions[0];
        }
      } else {
        bestVersion = versions[0];
      }

      // Run improvement loop if enabled
      let improvedVersion = bestVersion;
      let improvementMetrics = null;

      if (config.enableImprovementLoop && bestVersion.qualityScore && bestVersion.qualityScore < (config.targetQuality || 8.0)) {
        try {
          const improvementResult = await this.versioningService.runImprovementLoop(
            request.id,
            config.maxImprovementIterations || 3,
            config.targetQuality || 8.0
          );
          
          improvedVersion = improvementResult.finalVersion;
          improvementMetrics = {
            improved: improvementResult.improved,
            iterations: improvementResult.iterations,
            finalScore: improvementResult.finalVersion.qualityScore,
            initialScore: bestVersion.qualityScore
          };
        } catch (error) {
          console.warn('Improvement loop failed:', error);
        }
      }

      // Generate variations if requested
      let variations: any[] = [];
      if (config.generateVariations && config.variationCount && config.variationCount > 0) {
        try {
          variations = await this.versioningService.generateVariations(
            improvedVersion.id,
            config.variationCount,
            context.metadata
          );
        } catch (error) {
          console.warn('Variation generation failed:', error);
        }
      }

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          requestId: request.id,
          selectedVersion: improvedVersion,
          allVersions: versions,
          variations,
          comparison,
          improvementMetrics,
          versionCount: versions.length,
          bestQualityScore: Math.max(...versions.map(v => v.qualityScore || 0)),
          averageQualityScore: versions.reduce((sum, v) => sum + (v.qualityScore || 0), 0) / versions.length,
          selectedVersionId: improvedVersion.id,
          selectedContent: improvedVersion.content,
          selectedQualityScore: improvedVersion.qualityScore
        },
        metrics: {
          duration,
          tokensUsed: versions.reduce((sum, v) => sum + v.metadata.tokensUsed, 0),
          cost: versions.reduce((sum, v) => sum + v.metadata.cost, 0)
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in versioning process',
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
    if (config.maxVersions && (config.maxVersions < 1 || config.maxVersions > 10)) {
      return false;
    }

    if (config.improvementThreshold && (config.improvementThreshold < 0 || config.improvementThreshold > 10)) {
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

  // Helper method to create a versioning step
  static createVersioningStep(config: {
    maxVersions?: number;
    strategy?: VersionGenerationStrategy;
    selectionCriteria?: string;
    improvementThreshold?: number;
    enableComparison?: boolean;
    autoSelect?: boolean;
    retainAllVersions?: boolean;
    enableImprovementLoop?: boolean;
    maxImprovementIterations?: number;
    targetQuality?: number;
    generateVariations?: boolean;
    variationCount?: number;
    targetAudience?: string;
    purpose?: string;
    keywords?: string[];
    tone?: string;
  }): WorkflowStep {
    return {
      id: 'versioning',
      type: 'versioning' as any,
      name: 'Version Generation and Selection',
      description: 'Generates multiple versions and selects the best one',
      order: 5, // Typically after quality scoring
      dependencies: ['generate_output', 'refine_output', 'quality_score'],
      status: 'pending' as any,
      timeout: 120000, // 2 minutes timeout
      retryConfig: {
        maxRetries: 1,
        retryDelay: 2000,
        backoffMultiplier: 2
      },
      config
    };
  }

  // Helper method to add versioning to existing workflow templates
  static addVersioningToTemplate(template: any, config?: any): any {
    const versioningStep = this.createVersioningStep(config || {});
    
    // Add the versioning step to the template
    const updatedTemplate = {
      ...template,
      steps: [...template.steps, versioningStep]
    };

    // Update dependencies to include versioning
    updatedTemplate.steps.forEach((step: any) => {
      if (step.type === 'generate_output' || step.type === 'refine_output' || step.type === 'quality_score') {
        if (!step.dependencies.includes('versioning')) {
          step.dependencies.push('versioning');
        }
      }
    });

    return updatedTemplate;
  }

  // Method to create versioning configuration for different use cases
  static createConfigForContentType(contentType: string): any {
    const configs: Record<string, any> = {
      'youtube_script': {
        maxVersions: 3,
        strategy: VersionGenerationStrategy.VARIATION,
        selectionCriteria: 'quality',
        improvementThreshold: 7.5,
        enableComparison: true,
        autoSelect: false,
        enableImprovementLoop: true,
        maxImprovementIterations: 2,
        targetQuality: 8.5,
        generateVariations: true,
        variationCount: 2,
        targetAudience: 'youtube viewers',
        purpose: 'entertaining and educational content',
        tone: 'engaging'
      },
      'seo_article': {
        maxVersions: 4,
        strategy: VersionGenerationStrategy.IMPROVEMENT,
        selectionCriteria: 'quality',
        improvementThreshold: 7.0,
        enableComparison: true,
        autoSelect: false,
        enableImprovementLoop: true,
        maxImprovementIterations: 3,
        targetQuality: 8.0,
        generateVariations: false,
        targetAudience: 'readers interested in the topic',
        purpose: 'informative and SEO-optimized content',
        tone: 'professional'
      },
      'ad_copy': {
        maxVersions: 5,
        strategy: VersionGenerationStrategy.PARALLEL,
        selectionCriteria: 'quality',
        improvementThreshold: 7.5,
        enableComparison: true,
        autoSelect: false,
        enableImprovementLoop: true,
        maxImprovementIterations: 2,
        targetQuality: 9.0,
        generateVariations: true,
        variationCount: 3,
        targetAudience: 'potential customers',
        purpose: 'persuasive marketing content',
        tone: 'persuasive'
      },
      'email': {
        maxVersions: 3,
        strategy: VersionGenerationStrategy.SEQUENTIAL,
        selectionCriteria: 'quality',
        improvementThreshold: 7.0,
        enableComparison: true,
        autoSelect: true,
        enableImprovementLoop: false,
        targetQuality: 8.0,
        targetAudience: 'email recipients',
        purpose: 'communication and engagement',
        tone: 'professional'
      }
    };

    return configs[contentType] || configs['seo_article'];
  }
}
