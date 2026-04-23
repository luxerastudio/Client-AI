import { IStepProcessor } from '../../../domain/workflow-engine/services/IWorkflowEngine';
import { WorkflowStep, WorkflowContext, StepResult } from '../../../domain/workflow-engine/entities/Workflow';

export class BreakdownStructureProcessor implements IStepProcessor {
  canProcess(stepType: string): boolean {
    return stepType === 'breakdown_structure';
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
      // Get analysis from previous step
      const analysisResult = context.stepResults[step.dependencies[0]];
      if (!analysisResult || !analysisResult.success) {
        throw new Error('No valid analysis result from previous step');
      }

      const analysis = analysisResult.data.analysis;
      const input = analysisResult.data.processedInput;

      // Break down the structure based on analysis
      const breakdown = this.breakdownStructure(input, analysis);

      // Create structured components
      const components = this.createComponents(breakdown);

      // Store breakdown in context
      context.stepResults[step.id] = {
        success: true,
        data: {
          breakdown,
          components,
          metadata: {
            processor: 'BreakdownStructureProcessor',
            processedAt: new Date().toISOString(),
            componentCount: components.length
          }
        }
      };

      return {
        success: true,
        data: {
          breakdown,
          components,
          output: `Structure broken down into ${components.length} components`,
          metadata: {
            processor: 'BreakdownStructureProcessor',
            processedAt: new Date().toISOString(),
            componentCount: components.length
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during structure breakdown'
      };
    }
  }

  private breakdownStructure(input: any, analysis: any): any {
    const breakdown = {
      originalType: analysis.inputType,
      structure: this.identifyStructure(input),
      segments: this.createSegments(input),
      relationships: this.identifyRelationships(input),
      hierarchy: this.createHierarchy(input)
    };

    return breakdown;
  }

  private identifyStructure(input: any): any {
    if (typeof input === 'string') {
      return {
        type: 'text',
        paragraphs: input.split(/\n\n+/),
        sentences: input.split(/[.!?]+/).filter(s => s.trim()),
        words: input.split(/\s+/)
      };
    }

    if (Array.isArray(input)) {
      return {
        type: 'array',
        length: input.length,
        itemTypes: input.map(item => typeof item),
        nestedArrays: input.some(item => Array.isArray(item))
      };
    }

    if (typeof input === 'object' && input !== null) {
      return {
        type: 'object',
        keys: Object.keys(input),
        values: Object.values(input),
        nestedObjects: Object.values(input).some(val => typeof val === 'object' && val !== null)
      };
    }

    return { type: 'primitive', value: input };
  }

  private createSegments(input: any): any[] {
    const segments: any[] = [];

    if (typeof input === 'string') {
      // Split by paragraphs
      const paragraphs = input.split(/\n\n+/);
      paragraphs.forEach((para, index) => {
        segments.push({
          id: `segment_${index}`,
          type: 'paragraph',
          content: para.trim(),
          position: index,
          length: para.length
        });
      });
    } else if (Array.isArray(input)) {
      input.forEach((item, index) => {
        segments.push({
          id: `segment_${index}`,
          type: 'array_item',
          content: item,
          position: index,
          dataType: typeof item
        });
      });
    } else if (typeof input === 'object' && input !== null) {
      Object.entries(input).forEach(([key, value], index) => {
        segments.push({
          id: `segment_${index}`,
          type: 'object_property',
          key,
          content: value,
          position: index,
          dataType: typeof value
        });
      });
    }

    return segments;
  }

  private identifyRelationships(input: any): any[] {
    const relationships: any[] = [];

    if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
      const keys = Object.keys(input);
      
      // Identify potential relationships between object properties
      keys.forEach(key => {
        const value = input[key];
        
        if (typeof value === 'string') {
          // Check if value references other keys
          keys.forEach(otherKey => {
            if (otherKey !== key && value.includes(otherKey)) {
              relationships.push({
                type: 'reference',
                from: key,
                to: otherKey,
                strength: 'weak'
              });
            }
          });
        }
      });
    }

    return relationships;
  }

  private createHierarchy(input: any): any {
    const hierarchy: any = {
      root: true,
      children: [] as any[],
      depth: 0
    };

    if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
      hierarchy.children = Object.keys(input).map(key => ({
        name: key,
        type: typeof input[key],
        value: input[key],
        children: this.getChildHierarchy(input[key])
      }));
      hierarchy.depth = this.calculateDepth(input);
    } else if (Array.isArray(input)) {
      hierarchy.children = input.map((item, index) => ({
        name: `item_${index}`,
        type: typeof item as 'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function',
        value: item,
        children: this.getChildHierarchy(item)
      }));
      hierarchy.depth = this.calculateDepth(input);
    }

    return hierarchy;
  }

  private getChildHierarchy(value: any): any[] {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return Object.keys(value).map(key => ({
        name: key,
        type: typeof value[key],
        value: value[key],
        children: this.getChildHierarchy(value[key])
      }));
    } else if (Array.isArray(value)) {
      return value.map((item, index) => ({
        name: `item_${index}`,
        type: typeof item,
        value: item,
        children: this.getChildHierarchy(item)
      }));
    }
    
    return [];
  }

  private calculateDepth(obj: any, currentDepth: number = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    let maxDepth = currentDepth;
    
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        const depth = this.calculateDepth(item, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      });
    } else {
      Object.values(obj).forEach(value => {
        const depth = this.calculateDepth(value, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      });
    }

    return maxDepth;
  }

  private createComponents(breakdown: any): any[] {
    const components: any[] = [];

    // Create components based on segments
    if (breakdown.segments) {
      breakdown.segments.forEach((segment: any) => {
        components.push({
          id: segment.id,
          type: segment.type,
          content: segment.content,
          metadata: {
            position: segment.position,
            length: segment.length || 0,
            dataType: segment.dataType
          }
        });
      });
    }

    // Add structure components
    if (breakdown.structure) {
      components.push({
        id: 'structure_analysis',
        type: 'structure',
        content: breakdown.structure,
        metadata: {
          analyzedAt: new Date().toISOString()
        }
      });
    }

    return components;
  }
}
