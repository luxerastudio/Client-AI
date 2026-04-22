import { IStepProcessor } from '@/domain/services/IWorkflowEngine';
import { WorkflowStep } from '@/domain/entities/Workflow';
import { IAIGenerator } from '@/domain/services/IWorkflowEngine';

export class AIGenerationProcessor implements IStepProcessor {
  constructor(private readonly aiGenerator: IAIGenerator) {}

  canProcess(stepType: string): boolean {
    return stepType === 'ai_generation';
  }

  async process(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    const config = step.config || {};
    const prompt = config.prompt || context.prompt || '';
    
    if (!prompt) {
      throw new Error('Prompt is required for AI generation step');
    }

    let result: string;

    switch (config.generationType) {
      case 'youtube_script':
        result = await this.aiGenerator.generateYouTubeScript(prompt, config);
        break;
      
      case 'seo_content':
        const keywords = config.keywords || context.keywords || [];
        result = await this.aiGenerator.generateSEOContent(prompt, keywords, config);
        break;
      
      case 'content':
      default:
        result = await this.aiGenerator.generateContent(prompt, config);
        break;
    }

    return {
      type: config.generationType || 'content',
      content: result,
      metadata: {
        stepId: step.id,
        processedAt: new Date().toISOString()
      }
    };
  }
}
