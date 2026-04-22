import { IInputAnalysisService, IPromptStructuringService, IAIGenerationService, IOutputRefinementService } from '@/domain/ai-engine/services/IInputAnalysisService';

export interface QuickGenerateRequest {
  input: string;
  config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    style?: string;
    outputFormat?: string;
    refinementRules?: Array<{
      type: 'formatting' | 'content' | 'style' | 'validation';
      config: Record<string, any>;
    }>;
  };
}

export interface QuickGenerateResponse {
  content: string;
  analysis: {
    intent: string;
    entities: Array<{ text: string; type: string; confidence: number }>;
    sentiment: 'positive' | 'negative' | 'neutral';
    complexity: 'low' | 'medium' | 'high';
    suggestedApproach: string;
  };
  metrics: {
    totalTokens: number;
    processingTime: number;
    cost: number;
  };
  qualityScore?: number;
}

export class QuickGenerate {
  constructor(
    private readonly inputAnalysisService: IInputAnalysisService,
    private readonly promptStructuringService: IPromptStructuringService,
    private readonly aiGenerationService: IAIGenerationService,
    private readonly outputRefinementService: IOutputRefinementService
  ) {}

  async execute(request: QuickGenerateRequest): Promise<QuickGenerateResponse> {
    const startTime = Date.now();
    
    try {
      // Step 1: Input Analysis
      const analysis = await this.inputAnalysisService.performFullAnalysis(request.input);
      
      // Step 2: Prompt Structuring
      const promptTemplate = await this.promptStructuringService.createPromptTemplate(
        analysis,
        {
          style: request.config?.style || 'professional',
          outputFormat: request.config?.outputFormat || 'structured'
        }
      );
      
      // Render the prompt template
      const renderedPrompt = this.renderTemplate(
        promptTemplate.userPromptTemplate,
        { userInput: request.input, ...analysis }
      );
      
      // Step 3: AI Generation
      const generationResult = await this.aiGenerationService.generate({
        prompt: renderedPrompt,
        config: {
          provider: 'openai',
          model: request.config?.model || 'gpt-3.5-turbo',
          temperature: request.config?.temperature || 0.7,
          maxTokens: request.config?.maxTokens || 1000,
          systemPrompt: promptTemplate.systemPrompt
        }
      });
      
      // Step 4: Output Refinement (if rules provided)
      let finalContent = generationResult.content;
      let qualityScore: number | undefined;
      
      if (request.config?.refinementRules && request.config.refinementRules.length > 0) {
        const refinementResult = await this.outputRefinementService.refineContent(
          generationResult.content,
          request.config.refinementRules
        );
        finalContent = refinementResult.refinedContent;
        qualityScore = refinementResult.qualityScore;
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        content: finalContent,
        analysis,
        metrics: {
          totalTokens: generationResult.tokens.total,
          processingTime,
          cost: generationResult.cost
        },
        qualityScore
      };
      
    } catch (error) {
      throw new Error(`Quick generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private renderTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key === 'userInput') {
        return context[key] || '';
      }
      return context[key] !== undefined ? String(context[key]) : match;
    });
  }
}
