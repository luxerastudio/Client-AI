import OpenAI from 'openai';
import { QualityContext } from '@/domain/quality-scoring/entities/QualityScore';

export class UsefulnessScorer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async evaluate(content: string, context: QualityContext): Promise<{
    score: number;
    factors: string[];
    suggestions: string[];
  }> {
    const startTime = Date.now();
    
    try {
      // Analyze usefulness through multiple dimensions
      const practicalValue = await this.analyzePracticalValue(content, context);
      const actionability = await this.analyzeActionability(content, context);
      const problemSolving = await this.analyzeProblemSolving(content, context);
      const applicability = await this.analyzeApplicability(content, context);
      
      // Calculate overall usefulness score
      const score = this.calculateUsefulnessScore(
        practicalValue,
        actionability,
        problemSolving,
        applicability
      );
      
      // Generate factors and suggestions
      const factors = this.generateUsefulnessFactors(
        practicalValue,
        actionability,
        problemSolving,
        applicability
      );
      
      const suggestions = this.generateUsefulnessSuggestions(
        practicalValue,
        actionability,
        problemSolving,
        applicability,
        score
      );
      
      return {
        score,
        factors,
        suggestions
      };
    } catch (error) {
      // Fallback to basic analysis if AI analysis fails
      return this.fallbackEvaluation(content, context);
    }
  }

  private async analyzePracticalValue(content: string, context: QualityContext): Promise<{
    score: number;
    realWorldApplication: number;
    tangibleBenefits: number;
    immediateValue: number;
  }> {
    try {
      const prompt = this.buildPracticalValuePrompt(content, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in practical value assessment. Evaluate how practically useful the content is. Return JSON with scores (0-10) for realWorldApplication, tangibleBenefits, and immediateValue.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.1
      });

      const analysis = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(analysis);
        return {
          score: ((parsed.realWorldApplication || 5) + (parsed.tangibleBenefits || 5) + (parsed.immediateValue || 5)) / 3,
          realWorldApplication: parsed.realWorldApplication || 5,
          tangibleBenefits: parsed.tangibleBenefits || 5,
          immediateValue: parsed.immediateValue || 5
        };
      } catch {
        return {
          score: 5,
          realWorldApplication: 5,
          tangibleBenefits: 5,
          immediateValue: 5
        };
      }
    } catch (error) {
      return {
        score: 5,
        realWorldApplication: 5,
        tangibleBenefits: 5,
        immediateValue: 5
      };
    }
  }

  private async analyzeActionability(content: string, context: QualityContext): Promise<{
    score: number;
    specificSteps: number;
    implementationEase: number;
    resourceRequirements: number;
  }> {
    try {
      const prompt = this.buildActionabilityPrompt(content, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in actionability assessment. Evaluate how actionable the content is. Return JSON with scores (0-10) for specificSteps, implementationEase, and resourceRequirements (lower is better for resources).'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.1
      });

      const analysis = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(analysis);
        const resourceScore = parsed.resourceRequirements ? 10 - parsed.resourceRequirements : 5;
        return {
          score: ((parsed.specificSteps || 5) + (parsed.implementationEase || 5) + resourceScore) / 3,
          specificSteps: parsed.specificSteps || 5,
          implementationEase: parsed.implementationEase || 5,
          resourceRequirements: parsed.resourceRequirements || 5
        };
      } catch {
        return {
          score: 5,
          specificSteps: 5,
          implementationEase: 5,
          resourceRequirements: 5
        };
      }
    } catch (error) {
      return {
        score: 5,
        specificSteps: 5,
        implementationEase: 5,
        resourceRequirements: 5
      };
    }
  }

  private async analyzeProblemSolving(content: string, context: QualityContext): Promise<{
    score: number;
    problemIdentification: number;
    solutionQuality: number;
    innovationLevel: number;
  }> {
    try {
      const prompt = this.buildProblemSolvingPrompt(content, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in problem-solving assessment. Evaluate how well the content addresses problems. Return JSON with scores (0-10) for problemIdentification, solutionQuality, and innovationLevel.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.1
      });

      const analysis = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(analysis);
        return {
          score: ((parsed.problemIdentification || 5) + (parsed.solutionQuality || 5) + (parsed.innovationLevel || 5)) / 3,
          problemIdentification: parsed.problemIdentification || 5,
          solutionQuality: parsed.solutionQuality || 5,
          innovationLevel: parsed.innovationLevel || 5
        };
      } catch {
        return {
          score: 5,
          problemIdentification: 5,
          solutionQuality: 5,
          innovationLevel: 5
        };
      }
    } catch (error) {
      return {
        score: 5,
        problemIdentification: 5,
        solutionQuality: 5,
        innovationLevel: 5
      };
    }
  }

  private async analyzeApplicability(content: string, context: QualityContext): Promise<{
    score: number;
    audienceRelevance: number;
    contextFit: number;
    versatility: number;
  }> {
    try {
      const prompt = this.buildApplicabilityPrompt(content, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in applicability assessment. Evaluate how well the content applies to its intended context. Return JSON with scores (0-10) for audienceRelevance, contextFit, and versatility.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.1
      });

      const analysis = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(analysis);
        return {
          score: ((parsed.audienceRelevance || 5) + (parsed.contextFit || 5) + (parsed.versatility || 5)) / 3,
          audienceRelevance: parsed.audienceRelevance || 5,
          contextFit: parsed.contextFit || 5,
          versatility: parsed.versatility || 5
        };
      } catch {
        return {
          score: 5,
          audienceRelevance: 5,
          contextFit: 5,
          versatility: 5
        };
      }
    } catch (error) {
      return {
        score: 5,
        audienceRelevance: 5,
        contextFit: 5,
        versatility: 5
      };
    }
  }

  private buildPracticalValuePrompt(content: string, context: QualityContext): string {
    let prompt = `Analyze the practical value of this content:\n\n"${content}"\n\n`;
    
    if (context?.purpose) {
      prompt += `Purpose: ${context.purpose}\n`;
    }
    
    if (context?.targetAudience) {
      prompt += `Target Audience: ${context.targetAudience}\n`;
    }
    
    prompt += `\nEvaluate and return JSON with:
- realWorldApplication (0-10): How applicable to real-world situations
- tangibleBenefits (0-10): Tangible benefits readers can gain
- immediateValue (0-10): Value readers can get immediately`;
    
    return prompt;
  }

  private buildActionabilityPrompt(content: string, context: QualityContext): string {
    let prompt = `Analyze the actionability of this content:\n\n"${content}"\n\n`;
    
    if (context?.contentType) {
      prompt += `Content Type: ${context.contentType}\n`;
    }
    
    prompt += `\nEvaluate and return JSON with:
- specificSteps (0-10): How specific and clear the action steps are
- implementationEase (0-10): How easy it is to implement recommendations
- resourceRequirements (0-10): Resources needed (lower is better)`;
    
    return prompt;
  }

  private buildProblemSolvingPrompt(content: string, context: QualityContext): string {
    let prompt = `Analyze the problem-solving value of this content:\n\n"${content}"\n\n`;
    
    if (context?.domain) {
      prompt += `Domain: ${context.domain}\n`;
    }
    
    prompt += `\nEvaluate and return JSON with:
- problemIdentification (0-10): How well problems are identified
- solutionQuality (0-10): Quality and effectiveness of solutions
- innovationLevel (0-10): Level of innovation in approaches`;
    
    return prompt;
  }

  private buildApplicabilityPrompt(content: string, context: QualityContext): string {
    let prompt = `Analyze the applicability of this content:\n\n"${content}"\n\n`;
    
    if (context?.targetAudience) {
      prompt += `Target Audience: ${context.targetAudience}\n`;
    }
    
    if (context?.purpose) {
      prompt += `Purpose: ${context.purpose}\n`;
    }
    
    prompt += `\nEvaluate and return JSON with:
- audienceRelevance (0-10): How relevant to the target audience
- contextFit (0-10): How well it fits the intended context
- versatility (0-10): How versatile the content is`;
    
    return prompt;
  }

  private calculateUsefulnessScore(
    practicalValue: any,
    actionability: any,
    problemSolving: any,
    applicability: any
  ): number {
    const weights = {
      practical: 0.3,
      actionable: 0.25,
      problemSolving: 0.25,
      applicability: 0.2
    };
    
    const score = 
      practicalValue.score * weights.practical +
      actionability.score * weights.actionable +
      problemSolving.score * weights.problemSolving +
      applicability.score * weights.applicability;
    
    return Math.min(10, Math.max(0, score));
  }

  private generateUsefulnessFactors(
    practicalValue: any,
    actionability: any,
    problemSolving: any,
    applicability: any
  ): string[] {
    const factors: string[] = [];
    
    // Practical value factors
    if (practicalValue.score >= 8) {
      factors.push('High practical value');
    } else if (practicalValue.score < 5) {
      factors.push('Low practical value');
    }
    
    if (practicalValue.realWorldApplication >= 8) {
      factors.push('Excellent real-world application');
    } else if (practicalValue.realWorldApplication < 5) {
      factors.push('Poor real-world application');
    }
    
    // Actionability factors
    if (actionability.score >= 8) {
      factors.push('Highly actionable content');
    } else if (actionability.score < 5) {
      factors.push('Low actionability');
    }
    
    if (actionability.specificSteps >= 8) {
      factors.push('Clear specific steps provided');
    } else if (actionability.specificSteps < 5) {
      factors.push('Lacks specific action steps');
    }
    
    // Problem-solving factors
    if (problemSolving.score >= 8) {
      factors.push('Excellent problem-solving value');
    } else if (problemSolving.score < 5) {
      factors.push('Poor problem-solving value');
    }
    
    if (problemSolving.solutionQuality >= 8) {
      factors.push('High-quality solutions');
    } else if (problemSolving.solutionQuality < 5) {
      factors.push('Poor solution quality');
    }
    
    // Applicability factors
    if (applicability.score >= 8) {
      factors.push('Highly applicable content');
    } else if (applicability.score < 5) {
      factors.push('Low applicability');
    }
    
    if (applicability.audienceRelevance >= 8) {
      factors.push('Excellent audience relevance');
    } else if (applicability.audienceRelevance < 5) {
      factors.push('Poor audience relevance');
    }
    
    return factors;
  }

  private generateUsefulnessSuggestions(
    practicalValue: any,
    actionability: any,
    problemSolving: any,
    applicability: any,
    score: number
  ): string[] {
    const suggestions: string[] = [];
    
    if (score < 7) {
      // Practical value suggestions
      if (practicalValue.score < 6) {
        if (practicalValue.realWorldApplication < 6) {
          suggestions.push('Add more real-world examples and applications');
        }
        if (practicalValue.tangibleBenefits < 6) {
          suggestions.push('Highlight more tangible benefits for readers');
        }
        if (practicalValue.immediateValue < 6) {
          suggestions.push('Include more immediately applicable information');
        }
      }
      
      // Actionability suggestions
      if (actionability.score < 6) {
        if (actionability.specificSteps < 6) {
          suggestions.push('Provide more specific and actionable steps');
        }
        if (actionability.implementationEase < 6) {
          suggestions.push('Make recommendations easier to implement');
        }
        if (actionability.resourceRequirements > 7) {
          suggestions.push('Reduce resource requirements for implementation');
        }
      }
      
      // Problem-solving suggestions
      if (problemSolving.score < 6) {
        if (problemSolving.problemIdentification < 6) {
          suggestions.push('Better identify and define the problems being addressed');
        }
        if (problemSolving.solutionQuality < 6) {
          suggestions.push('Improve the quality and effectiveness of solutions');
        }
        if (problemSolving.innovationLevel < 6) {
          suggestions.push('Add more innovative approaches and solutions');
        }
      }
      
      // Applicability suggestions
      if (applicability.score < 6) {
        if (applicability.audienceRelevance < 6) {
          suggestions.push('Make content more relevant to the target audience');
        }
        if (applicability.contextFit < 6) {
          suggestions.push('Better fit the content to the intended context');
        }
        if (applicability.versatility < 6) {
          suggestions.push('Increase versatility and broader applicability');
        }
      }
    }
    
    return suggestions;
  }

  private fallbackEvaluation(content: string, context: QualityContext): {
    score: number;
    factors: string[];
    suggestions: string[];
  } {
    // Basic usefulness assessment based on content analysis
    const actionWords = ['how', 'steps', 'guide', 'tutorial', 'method', 'process', 'way to'];
    const benefitWords = ['benefit', 'advantage', 'improve', 'save', 'gain', 'achieve'];
    const problemWords = ['problem', 'solution', 'solve', 'fix', 'resolve', 'address'];
    
    const contentLower = content.toLowerCase();
    
    let score = 5; // Base score
    
    // Check for action-oriented content
    const actionCount = actionWords.filter(word => contentLower.includes(word)).length;
    if (actionCount >= 2) score += 1;
    if (actionCount >= 4) score += 1;
    
    // Check for benefits
    const benefitCount = benefitWords.filter(word => contentLower.includes(word)).length;
    if (benefitCount >= 2) score += 1;
    if (benefitCount >= 4) score += 1;
    
    // Check for problem-solving
    const problemCount = problemWords.filter(word => contentLower.includes(word)).length;
    if (problemCount >= 2) score += 1;
    if (problemCount >= 4) score += 1;
    
    score = Math.min(10, score);
    
    return {
      score,
      factors: score >= 7 ? ['Good practical value'] : ['Limited practical value'],
      suggestions: score < 7 ? ['Add more actionable steps and practical benefits'] : []
    };
  }
}
