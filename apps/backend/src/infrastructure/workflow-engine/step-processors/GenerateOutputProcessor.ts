import { IStepProcessor } from '../../../domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowStep, WorkflowContext, StepResult } from '../../../domain/workflow-engine/entities/Workflow';

export class GenerateOutputProcessor implements IStepProcessor {
  private aiEngine: any; // Will be injected via DI

  constructor(aiEngine?: any) {
    this.aiEngine = aiEngine;
  }

  canProcess(stepType: string): boolean {
    return stepType === 'generate_output';
  }

  async validate(step: WorkflowStep, context: WorkflowContext): Promise<boolean> {
    if (!step.id) {
      return false;
    }
    
    if (!context.stepResults || Object.keys(context.stepResults).length === 0) {
      return false;
    }
    
    if (!this.aiEngine) {
      console.warn('AI Engine not available, using fallback generation');
    }
    
    return true;
  }

  async process(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    try {
      // Get breakdown result from previous step
      const breakdownResult = context.stepResults[step.dependencies[0]];
      if (!breakdownResult || !breakdownResult.success) {
        throw new Error('No valid breakdown result from previous step');
      }

      const components = breakdownResult.data.components;
      const breakdown = breakdownResult.data.breakdown;

      // Generate output using AI engine or fallback
      let output: string;
      
      if (this.aiEngine) {
        output = await this.generateWithAI(components, breakdown, step.config);
      } else {
        output = await this.generateFallback(components, breakdown, step.config);
      }

      // Store generation result
      context.stepResults[step.id] = {
        success: true,
        data: {
          output,
          components,
          generationMethod: this.aiEngine ? 'ai' : 'fallback',
          metadata: {
            processor: 'GenerateOutputProcessor',
            processedAt: new Date().toISOString(),
            outputLength: output.length
          }
        }
      };

      return {
        success: true,
        data: {
          output,
          components,
          generationMethod: this.aiEngine ? 'ai' : 'fallback',
          metadata: {
            processor: 'GenerateOutputProcessor',
            processedAt: new Date().toISOString(),
            outputLength: output.length
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during output generation'
      };
    }
  }

  private async generateWithAI(components: any[], breakdown: any, config: any): Promise<string> {
    if (!this.aiEngine) {
      throw new Error('AI Engine not available');
    }

    // Create a structured prompt for the AI
    const prompt = this.createStructuredPrompt(components, breakdown, config);

    try {
      const response = await this.aiEngine.generate({
        prompt,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 1000,
        systemPrompt: config.systemPrompt || 'You are a helpful assistant that processes and generates content based on structured input.'
      });

      return response.content || 'No content generated';
    } catch (error) {
      console.error('AI generation failed, falling back to basic generation:', error);
      return await this.generateFallback(components, breakdown, config);
    }
  }

  private createStructuredPrompt(components: any[], breakdown: any, config: any): string {
    const componentSummary = components.map(comp => 
      `- ${comp.type}: ${comp.content?.toString().substring(0, 100)}${comp.content?.toString().length > 100 ? '...' : ''}`
    ).join('\n');

    let prompt = `Please process the following structured input and generate a coherent output:\n\n`;
    prompt += `Input Structure Type: ${breakdown.originalType}\n`;
    prompt += `Number of Components: ${components.length}\n\n`;
    prompt += `Components:\n${componentSummary}\n\n`;

    if (config.outputType) {
      prompt += `Please generate output in the following format: ${config.outputType}\n`;
    }

    if (config.outputInstructions) {
      prompt += `Instructions: ${config.outputInstructions}\n`;
    }

    if (config.tone) {
      prompt += `Tone: ${config.tone}\n`;
    }

    prompt += `Please create a well-structured, coherent output based on these components.`;

    return prompt;
  }

  private async generateFallback(components: any[], breakdown: any, config: any): Promise<string> {
    // Fallback generation without AI
    let output = '';

    // Basic content aggregation
    const textComponents = components.filter(comp => comp.type === 'paragraph' || comp.type === 'text');
    const objectComponents = components.filter(comp => comp.type === 'object_property');

    if (textComponents.length > 0) {
      output += 'Generated Content:\n\n';
      textComponents.forEach((comp, index) => {
        output += `${index + 1}. ${comp.content}\n`;
      });
    }

    if (objectComponents.length > 0) {
      output += '\n\nStructured Data:\n\n';
      objectComponents.forEach(comp => {
        output += `${comp.key}: ${comp.content}\n`;
      });
    }

    // Add metadata
    output += `\n\n---\n`;
    output += `Generated: ${new Date().toISOString()}\n`;
    output += `Components Processed: ${components.length}\n`;
    output += `Input Type: ${breakdown.originalType}\n`;

    return output;
  }
}
