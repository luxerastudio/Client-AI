import { IStepProcessor } from '../../../domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowStep, WorkflowContext, StepResult } from '../../../domain/workflow-engine/entities/Workflow';

export class AnalyzeInputProcessor implements IStepProcessor {
  canProcess(stepType: string): boolean {
    return stepType === 'analyze_input';
  }

  async validate(step: WorkflowStep, context: WorkflowContext): Promise<boolean> {
    if (!step.id) {
      return false;
    }
    
    if (!context.input) {
      return false;
    }
    
    return true;
  }

  async process(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    try {
      // Extract input from context
      const input = context.input || {};
      
      // Analyze the input structure and content
      const analysis = {
        inputType: this.detectInputType(input),
        contentLength: this.calculateContentLength(input),
        hasStructure: this.hasStructure(input),
        keyFields: this.extractKeyFields(input),
        complexity: this.assessComplexity(input),
        suggestions: this.generateSuggestions(input)
      };

      // Store analysis in context for next steps
      context.stepResults[step.id] = {
        success: true,
        data: {
          analysis,
          processedInput: input,
          metadata: {
            processor: 'AnalyzeInputProcessor',
            processedAt: new Date().toISOString()
          }
        }
      };

      return {
        success: true,
        data: {
          analysis,
          processedInput: input,
          output: `Input analyzed: ${analysis.inputType}, complexity: ${analysis.complexity}`,
          metadata: {
            processor: 'AnalyzeInputProcessor',
            processedAt: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during input analysis'
      };
    }
  }

  private detectInputType(input: any): string {
    if (typeof input === 'string') {
      if (input.includes('<') && input.includes('>')) return 'html';
      if (input.startsWith('{') || input.startsWith('[')) return 'json';
      if (input.includes('\n') && input.length > 100) return 'text_document';
      return 'plain_text';
    }
    
    if (Array.isArray(input)) return 'array';
    if (typeof input === 'object' && input !== null) return 'object';
    
    return 'unknown';
  }

  private calculateContentLength(input: any): number {
    if (typeof input === 'string') return input.length;
    if (Array.isArray(input)) return input.length;
    if (typeof input === 'object' && input !== null) return Object.keys(input).length;
    return 0;
  }

  private hasStructure(input: any): boolean {
    if (typeof input === 'string') {
      // Check for structured text (lists, headings, etc.)
      return /^#+\s|^\*\s|^\d+\.\s|^\-\s/m.test(input);
    }
    
    if (typeof input === 'object' && input !== null) {
      return Object.keys(input).length > 0;
    }
    
    return false;
  }

  private extractKeyFields(input: any): string[] {
    if (typeof input === 'object' && input !== null) {
      return Object.keys(input).filter(key => 
        key.includes('title') || 
        key.includes('name') || 
        key.includes('content') || 
        key.includes('description') ||
        key.includes('text')
      );
    }
    
    if (typeof input === 'string') {
      // Extract potential key-value pairs from text
      const matches = input.match(/(\w+):\s*([^,\n]+)/g);
      return matches ? matches.map(match => match.split(':')[0]) : [];
    }
    
    return [];
  }

  private assessComplexity(input: any): 'low' | 'medium' | 'high' {
    const length = this.calculateContentLength(input);
    const hasStruct = this.hasStructure(input);
    const type = this.detectInputType(input);
    
    if (type === 'json' || type === 'html') return 'high';
    if (length > 1000 || hasStruct) return 'medium';
    return 'low';
  }

  private generateSuggestions(input: any): string[] {
    const suggestions: string[] = [];
    const type = this.detectInputType(input);
    const complexity = this.assessComplexity(input);
    
    if (type === 'plain_text' && complexity === 'low') {
      suggestions.push('Consider adding more structure to improve processing');
    }
    
    if (complexity === 'high') {
      suggestions.push('Input is complex - consider breaking down into smaller pieces');
    }
    
    if (type === 'json') {
      suggestions.push('JSON input detected - ready for structured processing');
    }
    
    return suggestions;
  }
}
