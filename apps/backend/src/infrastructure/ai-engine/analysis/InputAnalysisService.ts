import OpenAI from 'openai';
import { IInputAnalysisService } from '@/domain/ai-engine/services/IInputAnalysisService';
import { AnalysisResult } from '@/domain/ai-engine/entities/AIWorkflow';

export class InputAnalysisService implements IInputAnalysisService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeIntent(input: string | Record<string, any>): Promise<string> {
    const inputText = typeof input === 'string' ? input : JSON.stringify(input);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an intent analysis expert. Analyze the user input and determine the primary intent in one sentence.'
        },
        {
          role: 'user',
          content: `Analyze the intent of this input: "${inputText}"`
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content?.trim() || 'Unknown intent';
  }

  async extractEntities(input: string | Record<string, any>): Promise<Array<{ text: string; type: string; confidence: number }>> {
    const inputText = typeof input === 'string' ? input : JSON.stringify(input);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Extract key entities from the input. Return as JSON array with format: [{"text": "entity", "type": "PERSON|ORGANIZATION|LOCATION|CONCEPT|OTHER", "confidence": 0.95}]'
        },
        {
          role: 'user',
          content: `Extract entities from: "${inputText}"`
        }
      ],
      max_tokens: 300,
      temperature: 0.1
    });

    try {
      const content = response.choices[0]?.message?.content || '[]';
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async analyzeSentiment(input: string): Promise<'positive' | 'negative' | 'neutral'> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Analyze the sentiment of the input. Respond with exactly one word: positive, negative, or neutral.'
        },
        {
          role: 'user',
          content: input
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    });

    const sentiment = response.choices[0]?.message?.content?.trim().toLowerCase();
    return sentiment === 'positive' || sentiment === 'negative' || sentiment === 'neutral' 
      ? sentiment 
      : 'neutral';
  }

  async assessComplexity(input: string | Record<string, any>): Promise<'low' | 'medium' | 'high'> {
    const inputText = typeof input === 'string' ? input : JSON.stringify(input);
    const wordCount = inputText.split(/\s+/).length;
    const hasMultipleConcepts = inputText.includes(',') || inputText.includes('and') || inputText.includes('also');
    
    // Simple heuristic-based assessment
    if (wordCount < 20 && !hasMultipleConcepts) {
      return 'low';
    } else if (wordCount < 100 && hasMultipleConcepts) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  async suggestApproach(analysis: Partial<AnalysisResult>): Promise<string> {
    const prompt = `
      Based on this analysis:
      - Intent: ${analysis.intent || 'Unknown'}
      - Complexity: ${analysis.complexity || 'medium'}
      - Sentiment: ${analysis.sentiment || 'neutral'}
      
      Suggest the best approach for processing this input in one sentence.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an AI processing strategist. Suggest the optimal approach for processing different types of input.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.5
    });

    return response.choices[0]?.message?.content?.trim() || 'Use standard processing approach';
  }

  async performFullAnalysis(input: string | Record<string, any>): Promise<AnalysisResult> {
    const inputText = typeof input === 'string' ? input : JSON.stringify(input);
    
    const [intent, entities, sentiment, complexity, suggestedApproach] = await Promise.all([
      this.analyzeIntent(input),
      this.extractEntities(input),
      this.analyzeSentiment(inputText),
      this.assessComplexity(input),
      this.suggestApproach({
        intent: await this.analyzeIntent(input),
        complexity: await this.assessComplexity(input),
        sentiment: await this.analyzeSentiment(inputText)
      })
    ]);

    return {
      intent,
      entities,
      sentiment,
      complexity,
      suggestedApproach,
      metadata: {
        inputLength: inputText.length,
        wordCount: inputText.split(/\s+/).length,
        processedAt: new Date().toISOString()
      }
    };
  }
}
