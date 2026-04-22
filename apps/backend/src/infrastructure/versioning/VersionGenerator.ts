import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { 
  IVersionGenerator, 
  IVersionRepository,
  IVersionComparator
} from '@/domain/versioning/services/IVersioningService';
import { 
  ContentVersion, 
  VersionRequest, 
  VersionStatus, 
  VersionGenerationStrategy,
  VersionGenerationConfig
} from '@/domain/versioning/entities/Version';
import { QualityScoringService } from '@/infrastructure/quality-scoring/QualityScoringService';

export class VersionGenerator implements IVersionGenerator {
  private openai: OpenAI;
  private repository: IVersionRepository;
  private comparator: IVersionComparator;
  private qualityService: QualityScoringService;

  constructor(
    apiKey: string,
    repository: IVersionRepository,
    comparator: IVersionComparator,
    qualityService: QualityScoringService
  ) {
    this.openai = new OpenAI({ apiKey });
    this.repository = repository;
    this.comparator = comparator;
    this.qualityService = qualityService;
  }

  async generateVersions(request: VersionRequest): Promise<ContentVersion[]> {
    const startTime = Date.now();
    
    try {
      let versions: ContentVersion[] = [];
      
      switch (request.config.strategy) {
        case VersionGenerationStrategy.SEQUENTIAL:
          versions = await this.generateSequentialVersions(request);
          break;
        case VersionGenerationStrategy.PARALLEL:
          versions = await this.generateParallelVersions(request);
          break;
        case VersionGenerationStrategy.IMPROVEMENT:
          versions = await this.generateImprovementVersions(request);
          break;
        case VersionGenerationStrategy.VARIATION:
          versions = await this.generateVariationVersions(request);
          break;
        default:
          versions = await this.generateSequentialVersions(request);
      }
      
      // Save all generated versions
      for (const version of versions) {
        await this.repository.saveVersion(version);
      }
      
      return versions;
    } catch (error) {
      throw new Error(`Version generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImprovedVersion(
    originalVersion: ContentVersion,
    feedback: string,
    context?: Record<string, any>
  ): Promise<ContentVersion> {
    const startTime = Date.now();
    
    try {
      // Generate improved content
      const improvedContent = await this.generateImprovedContent(
        originalVersion.content,
        feedback,
        context
      );
      
      // Evaluate quality
      const qualityScore = await this.qualityService.evaluate({
        content: improvedContent,
        context: context || {},
        criteria: {
          targetAudience: context?.targetAudience,
          purpose: context?.purpose,
          keywords: context?.keywords,
          tone: context?.tone
        }
      });
      
      // Create improved version
      const improvedVersion: ContentVersion = {
        id: uuidv4(),
        requestId: originalVersion.requestId,
        versionNumber: originalVersion.versionNumber + 0.1, // Incremental version
        content: improvedContent,
        status: VersionStatus.GENERATED,
        generationStrategy: VersionGenerationStrategy.IMPROVEMENT,
        qualityScore: qualityScore.overall,
        qualityBreakdown: {
          clarity: qualityScore.clarity,
          relevance: qualityScore.relevance,
          depth: qualityScore.depth,
          usefulness: qualityScore.usefulness
        },
        metadata: {
          generatedAt: new Date(),
          processingTime: Date.now() - startTime,
          tokensUsed: this.estimateTokens(improvedContent),
          cost: this.estimateCost(this.estimateTokens(improvedContent)),
          improvementCount: originalVersion.metadata.improvementCount + 1,
          parentVersionId: originalVersion.id,
          generationPrompt: this.buildImprovementPrompt(originalVersion.content, feedback, context),
          feedback,
          tags: ['improved', ...originalVersion.metadata.tags]
        }
      };
      
      return improvedVersion;
    } catch (error) {
      throw new Error(`Improved version generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateVariations(
    baseVersion: ContentVersion,
    variationCount: number,
    context?: Record<string, any>
  ): Promise<ContentVersion[]> {
    const startTime = Date.now();
    const variations: ContentVersion[] = [];
    
    try {
      // Generate different variations
      const variationStrategies = [
        'different_tone',
        'different_structure',
        'different_focus',
        'different_style'
      ];
      
      for (let i = 0; i < Math.min(variationCount, variationStrategies.length); i++) {
        const strategy = variationStrategies[i];
        const variedContent = await this.generateVariedContent(
          baseVersion.content,
          strategy,
          context
        );
        
        // Evaluate quality
        const qualityScore = await this.qualityService.evaluate({
          content: variedContent,
          context: context || {},
          criteria: {
            targetAudience: context?.targetAudience,
            purpose: context?.purpose,
            keywords: context?.keywords,
            tone: context?.tone
          }
        });
        
        const variation: ContentVersion = {
          id: uuidv4(),
          requestId: baseVersion.requestId,
          versionNumber: baseVersion.versionNumber + (i + 1) * 0.1,
          content: variedContent,
          status: VersionStatus.GENERATED,
          generationStrategy: VersionGenerationStrategy.VARIATION,
          qualityScore: qualityScore.overall,
          qualityBreakdown: {
            clarity: qualityScore.clarity,
            relevance: qualityScore.relevance,
            depth: qualityScore.depth,
            usefulness: qualityScore.usefulness
          },
          metadata: {
            generatedAt: new Date(),
            processingTime: Date.now() - startTime,
            tokensUsed: this.estimateTokens(variedContent),
            cost: this.estimateCost(this.estimateTokens(variedContent)),
            improvementCount: 0,
            parentVersionId: baseVersion.id,
            generationPrompt: this.buildVariationPrompt(baseVersion.content, strategy, context),
            tags: ['variation', strategy, ...baseVersion.metadata.tags]
          }
        };
        
        variations.push(variation);
      }
      
      return variations;
    } catch (error) {
      throw new Error(`Variation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSequentialVersions(request: VersionRequest): Promise<ContentVersion[]> {
    const versions: ContentVersion[] = [];
    let previousContent = '';
    
    for (let i = 1; i <= request.config.maxVersions; i++) {
      const startTime = Date.now();
      
      try {
        const prompt = this.buildSequentialPrompt(
          request.originalInput,
          i,
          previousContent,
          request.context
        );
        
        const content = await this.generateContent(prompt);
        
        // Evaluate quality
        const qualityScore = await this.qualityService.evaluate({
          content,
          context: request.context || {},
          criteria: {
            targetAudience: request.context?.targetAudience,
            purpose: request.context?.purpose,
            keywords: request.context?.keywords,
            tone: request.context?.tone
          }
        });
        
        const version: ContentVersion = {
          id: uuidv4(),
          requestId: request.id,
          versionNumber: i,
          content,
          status: VersionStatus.GENERATED,
          generationStrategy: VersionGenerationStrategy.SEQUENTIAL,
          qualityScore: qualityScore.overall,
          qualityBreakdown: {
            clarity: qualityScore.clarity,
            relevance: qualityScore.relevance,
            depth: qualityScore.depth,
            usefulness: qualityScore.usefulness
          },
          metadata: {
            generatedAt: new Date(),
            processingTime: Date.now() - startTime,
            tokensUsed: this.estimateTokens(content),
            cost: this.estimateCost(this.estimateTokens(content)),
            improvementCount: 0,
            generationPrompt: prompt,
            tags: ['sequential']
          }
        };
        
        versions.push(version);
        previousContent = content;
        
        // If we got a good score and auto-select is enabled, we can stop
        if (qualityScore.overall >= 8.5 && request.config.autoSelect) {
          break;
        }
        
      } catch (error) {
        console.error(`Error generating sequential version ${i}:`, error);
        // Continue with next version
      }
    }
    
    return versions;
  }

  async generateParallelVersions(request: VersionRequest): Promise<ContentVersion[]> {
    const versions: ContentVersion[] = [];
    const prompts = this.buildParallelPrompts(request.originalInput, request.config.maxVersions, request.context);
    
    // Generate all versions in parallel
    const generationPromises = prompts.map(async (prompt, index) => {
      const startTime = Date.now();
      
      try {
        const content = await this.generateContent(prompt);
        
        // Evaluate quality
        const qualityScore = await this.qualityService.evaluate({
          content,
          context: request.context || {},
          criteria: {
            targetAudience: request.context?.targetAudience,
            purpose: request.context?.purpose,
            keywords: request.context?.keywords,
            tone: request.context?.tone
          }
        });
        
        return {
          id: uuidv4(),
          requestId: request.id,
          versionNumber: index + 1,
          content,
          status: VersionStatus.GENERATED,
          generationStrategy: VersionGenerationStrategy.PARALLEL,
          qualityScore: qualityScore.overall,
          qualityBreakdown: {
            clarity: qualityScore.clarity,
            relevance: qualityScore.relevance,
            depth: qualityScore.depth,
            usefulness: qualityScore.usefulness
          },
          metadata: {
            generatedAt: new Date(),
            processingTime: Date.now() - startTime,
            tokensUsed: this.estimateTokens(content),
            cost: this.estimateCost(this.estimateTokens(content)),
            improvementCount: 0,
            generationPrompt: prompt,
            tags: ['parallel']
          }
        } as ContentVersion;
      } catch (error) {
        console.error(`Error generating parallel version ${index + 1}:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(generationPromises);
    return results.filter(version => version !== null) as ContentVersion[];
  }

  async generateImprovementVersions(request: VersionRequest): Promise<ContentVersion[]> {
    const versions: ContentVersion[] = [];
    
    // Start with a base version
    const baseVersion = await this.generateBaseVersion(request);
    versions.push(baseVersion);
    
    // Generate improved versions if base version doesn't meet threshold
    if (baseVersion.qualityScore && baseVersion.qualityScore < request.config.improvementThreshold) {
      let currentVersion = baseVersion;
      let improvementCount = 0;
      const maxImprovements = Math.min(request.config.maxVersions - 1, 3);
      
      while (improvementCount < maxImprovements && 
             currentVersion.qualityScore && 
             currentVersion.qualityScore < request.config.improvementThreshold) {
        
        const feedback = this.generateFeedback(currentVersion);
        const improvedVersion = await this.generateImprovedVersion(
          currentVersion,
          feedback,
          request.context
        );
        
        versions.push(improvedVersion);
        
        // Check if improvement was successful
        if (improvedVersion.qualityScore && improvedVersion.qualityScore > currentVersion.qualityScore) {
          currentVersion = improvedVersion;
        } else {
          break; // Stop if no improvement
        }
        
        improvementCount++;
      }
    }
    
    return versions;
  }

  async generateVariationVersions(request: VersionRequest): Promise<ContentVersion[]> {
    // Generate a base version first
    const baseVersion = await this.generateBaseVersion(request);
    
    // Generate variations from the base version
    const variations = await this.generateVariations(
      baseVersion,
      request.config.maxVersions - 1,
      request.context
    );
    
    return [baseVersion, ...variations];
  }

  // Private helper methods
  
  private async generateContent(prompt: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content generator. Generate high-quality content based on the given prompt.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || '';
  }

  private async generateImprovedContent(
    originalContent: string,
    feedback: string,
    context?: Record<string, any>
  ): Promise<string> {
    const prompt = this.buildImprovementPrompt(originalContent, feedback, context);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content editor. Improve the given content based on the feedback provided.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1200,
      temperature: 0.5
    });

    return response.choices[0]?.message?.content || originalContent;
  }

  private async generateVariedContent(
    baseContent: string,
    strategy: string,
    context?: Record<string, any>
  ): Promise<string> {
    const prompt = this.buildVariationPrompt(baseContent, strategy, context);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content creator. Generate a variation of the given content based on the specified strategy.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.8
    });

    return response.choices[0]?.message?.content || baseContent;
  }

  private buildSequentialPrompt(
    input: Record<string, any>,
    versionNumber: number,
    previousContent: string,
    context?: Record<string, any>
  ): string {
    let prompt = `Generate version ${versionNumber} of content based on the following input:\n\n`;
    
    prompt += `Input: ${JSON.stringify(input)}\n\n`;
    
    if (context) {
      prompt += `Context: ${JSON.stringify(context)}\n\n`;
    }
    
    if (previousContent && versionNumber > 1) {
      prompt += `Previous version:\n${previousContent}\n\n`;
      prompt += `Please generate an improved version that addresses any issues in the previous version.\n`;
    } else {
      prompt += `Please generate the first version of this content.\n`;
    }
    
    return prompt;
  }

  private buildParallelPrompts(
    input: Record<string, any>,
    count: number,
    context?: Record<string, any>
  ): string[] {
    const prompts: string[] = [];
    
    for (let i = 0; i < count; i++) {
      let prompt = `Generate variation ${i + 1} of content based on the following input:\n\n`;
      
      prompt += `Input: ${JSON.stringify(input)}\n\n`;
      
      if (context) {
        prompt += `Context: ${JSON.stringify(context)}\n\n`;
      }
      
      prompt += `Please generate a unique variation of this content with different approach/style.\n`;
      
      prompts.push(prompt);
    }
    
    return prompts;
  }

  private buildImprovementPrompt(
    originalContent: string,
    feedback: string,
    context?: Record<string, any>
  ): string {
    let prompt = `Please improve the following content based on the feedback provided:\n\n`;
    
    prompt += `Original content:\n${originalContent}\n\n`;
    prompt += `Feedback: ${feedback}\n\n`;
    
    if (context) {
      prompt += `Context: ${JSON.stringify(context)}\n\n`;
    }
    
    prompt += `Please generate an improved version that addresses the feedback while maintaining the core message and intent.\n`;
    
    return prompt;
  }

  private buildVariationPrompt(
    baseContent: string,
    strategy: string,
    context?: Record<string, any>
  ): string {
    let prompt = `Generate a variation of the following content using the ${strategy} strategy:\n\n`;
    
    prompt += `Base content:\n${baseContent}\n\n`;
    
    if (context) {
      prompt += `Context: ${JSON.stringify(context)}\n\n`;
    }
    
    switch (strategy) {
      case 'different_tone':
        prompt += `Please rewrite this content with a different tone (e.g., more formal, more casual, more persuasive, etc.).\n`;
        break;
      case 'different_structure':
        prompt += `Please rewrite this content with a different structure (e.g., different organization, different flow, etc.).\n`;
        break;
      case 'different_focus':
        prompt += `Please rewrite this content with a different focus or emphasis.\n`;
        break;
      case 'different_style':
        prompt += `Please rewrite this content with a different writing style.\n`;
        break;
      default:
        prompt += `Please generate a variation of this content.\n`;
    }
    
    return prompt;
  }

  private async generateBaseVersion(request: VersionRequest): Promise<ContentVersion> {
    const startTime = Date.now();
    
    const prompt = this.buildSequentialPrompt(request.originalInput, 1, '', request.context);
    const content = await this.generateContent(prompt);
    
    // Evaluate quality
    const qualityScore = await this.qualityService.evaluate({
      content,
      context: request.context || {},
      criteria: {
        targetAudience: request.context?.targetAudience,
        purpose: request.context?.purpose,
        keywords: request.context?.keywords,
        tone: request.context?.tone
      }
    });
    
    return {
      id: uuidv4(),
      requestId: request.id,
      versionNumber: 1,
      content,
      status: VersionStatus.GENERATED,
      generationStrategy: VersionGenerationStrategy.SEQUENTIAL,
      qualityScore: qualityScore.overall,
      qualityBreakdown: {
        clarity: qualityScore.clarity,
        relevance: qualityScore.relevance,
        depth: qualityScore.depth,
        usefulness: qualityScore.usefulness
      },
      metadata: {
        generatedAt: new Date(),
        processingTime: Date.now() - startTime,
        tokensUsed: this.estimateTokens(content),
        cost: this.estimateCost(this.estimateTokens(content)),
        improvementCount: 0,
        generationPrompt: prompt,
        tags: ['base']
      }
    };
  }

  private generateFeedback(version: ContentVersion): string {
    const feedback: string[] = [];
    
    if (version.qualityScore && version.qualityScore < 7) {
      feedback.push('Overall quality needs improvement');
    }
    
    if (version.qualityBreakdown) {
      if (version.qualityBreakdown.clarity < 7) {
        feedback.push('Improve clarity and readability');
      }
      if (version.qualityBreakdown.relevance < 7) {
        feedback.push('Enhance relevance to target audience');
      }
      if (version.qualityBreakdown.depth < 7) {
        feedback.push('Add more depth and substance');
      }
      if (version.qualityBreakdown.usefulness < 7) {
        feedback.push('Increase practical value and usefulness');
      }
    }
    
    return feedback.join('. ');
  }

  private estimateTokens(content: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(content.length / 4);
  }

  private estimateCost(tokens: number): number {
    // Rough cost estimation for GPT-3.5-turbo
    return tokens * 0.000002; // $0.002 per 1K tokens
  }
}
