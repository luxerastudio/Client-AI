import { IStepProcessor } from '../../../domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowStep, WorkflowContext, StepResult } from '../../../domain/workflow-engine/entities/Workflow';

export class RefineOutputProcessor implements IStepProcessor {
  private aiEngine: any; // Will be injected via DI

  constructor(aiEngine?: any) {
    this.aiEngine = aiEngine;
  }

  canProcess(stepType: string): boolean {
    return stepType === 'refine_output';
  }

  async validate(step: WorkflowStep, context: WorkflowContext): Promise<boolean> {
    if (!step.id) {
      return false;
    }
    
    if (!context.stepResults || Object.keys(context.stepResults).length === 0) {
      return false;
    }
    
    return true;
  }

  async process(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    try {
      // Get generation result from previous step
      const generationResult = context.stepResults[step.dependencies[0]];
      if (!generationResult || !generationResult.success) {
        throw new Error('No valid generation result from previous step');
      }

      const originalOutput = generationResult.data.output;
      const components = generationResult.data.components;

      // Refine the output
      let refinedOutput: string;
      
      if (this.aiEngine) {
        refinedOutput = await this.refineWithAI(originalOutput, components, step.config);
      } else {
        refinedOutput = await this.refineFallback(originalOutput, components, step.config);
      }

      // Store refinement result
      context.stepResults[step.id] = {
        success: true,
        data: {
          refinedOutput,
          originalOutput,
          components,
          refinementMethod: this.aiEngine ? 'ai' : 'fallback',
          metadata: {
            processor: 'RefineOutputProcessor',
            processedAt: new Date().toISOString(),
            originalLength: originalOutput.length,
            refinedLength: refinedOutput.length
          }
        }
      };

      return {
        success: true,
        data: {
          refinedOutput,
          originalOutput,
          components,
          refinementMethod: this.aiEngine ? 'ai' : 'fallback',
          output: refinedOutput,
          metadata: {
            processor: 'RefineOutputProcessor',
            processedAt: new Date().toISOString(),
            originalLength: originalOutput.length,
            refinedLength: refinedOutput.length
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during output refinement'
      };
    }
  }

  private async refineWithAI(originalOutput: string, components: any[], config: any): Promise<string> {
    if (!this.aiEngine) {
      throw new Error('AI Engine not available');
    }

    // Create a refinement prompt
    const prompt = this.createRefinementPrompt(originalOutput, components, config);

    try {
      const response = await this.aiEngine.generate({
        prompt,
        temperature: config.temperature || 0.5, // Lower temperature for refinement
        maxTokens: config.maxTokens || 1500,
        systemPrompt: config.systemPrompt || 'You are an expert editor that refines and improves content while preserving the original meaning and structure.'
      });

      return response.content || originalOutput;
    } catch (error) {
      console.error('AI refinement failed, using fallback refinement:', error);
      return await this.refineFallback(originalOutput, components, config);
    }
  }

  private createRefinementPrompt(originalOutput: string, components: any[], config: any): string {
    let prompt = `Please refine and improve the following content while preserving its core meaning and structure:\n\n`;
    prompt += `Original Content:\n${originalOutput}\n\n`;

    if (config.refinementGoals) {
      prompt += `Refinement Goals:\n`;
      if (Array.isArray(config.refinementGoals)) {
        config.refinementGoals.forEach((goal: string, index: number) => {
          prompt += `${index + 1}. ${goal}\n`;
        });
      } else {
        prompt += `${config.refinementGoals}\n`;
      }
      prompt += '\n';
    }

    if (config.targetAudience) {
      prompt += `Target Audience: ${config.targetAudience}\n\n`;
    }

    if (config.style) {
      prompt += `Style: ${config.style}\n\n`;
    }

    if (config.length) {
      prompt += `Target Length: ${config.length}\n\n`;
    }

    prompt += `Please provide a refined version that:\n`;
    prompt += `1. Improves clarity and readability\n`;
    prompt += `2. Fixes any grammatical or structural issues\n`;
    prompt += `3. Enhances the overall quality\n`;
    prompt += `4. Maintains the original intent and key information\n`;

    return prompt;
  }

  private async refineFallback(originalOutput: string, components: any[], config: any): Promise<string> {
    // Fallback refinement without AI
    let refined = originalOutput;

    // Basic text cleanup
    refined = this.cleanupText(refined);

    // Apply basic formatting improvements
    refined = this.improveFormatting(refined);

    // Add structure if needed
    if (config.addStructure) {
      refined = this.addStructure(refined, components);
    }

    // Improve readability
    refined = this.improveReadability(refined);

    return refined;
  }

  private cleanupText(text: string): string {
    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Fix spacing around punctuation
      .replace(/\s+([,.!?;:])/g, '$1')
      .replace(/([,.!?;:])\s+/g, '$1 ')
      // Fix multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();
  }

  private improveFormatting(text: string): string {
    // Capitalize first letter of sentences
    text = text.replace(/([.!?]\s+)([a-z])/g, (match, punctuation, letter) => {
      return punctuation + letter.toUpperCase();
    });

    // Ensure proper spacing after punctuation
    text = text.replace(/([.!?])([a-zA-Z])/g, '$1 $2');

    return text;
  }

  private addStructure(text: string, components: any[]): string {
    // Add basic structure based on components
    if (components.length > 1) {
      // Add section headers if there are multiple components
      const lines = text.split('\n');
      let structuredText = '';

      lines.forEach((line, index) => {
        if (line.trim()) {
          if (index === 0) {
            structuredText += `# ${line}\n\n`;
          } else if (line.length < 50 && components[index]) {
            structuredText += `## ${components[index].key || 'Section'}\n${line}\n\n`;
          } else {
            structuredText += `${line}\n\n`;
          }
        }
      });

      return structuredText;
    }

    return text;
  }

  private improveReadability(text: string): string {
    // Break up long sentences
    text = text.replace(/([^.!?]{80,}[.!?])/g, (match) => {
      // Try to break at commas or conjunctions
      const breakPoints = [', and ', ', but ', ', or ', ', so '];
      for (const point of breakPoints) {
        if (match.includes(point)) {
          return match.replace(point, point + '\n');
        }
      }
      return match;
    });

    return text;
  }
}
