import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { 
  IContentPersonalizer,
  IUserMemoryRepository
} from '@/domain/user-memory/services/IUserMemoryService';
import { 
  UserPreference, 
  BehaviorPattern, 
  AdaptationType,
  PersonalizationResult
} from '@/domain/user-memory/entities/UserMemory';

export class ContentPersonalizer implements IContentPersonalizer {
  private openai: OpenAI;
  private repository: IUserMemoryRepository;

  constructor(apiKey: string, repository: IUserMemoryRepository) {
    this.openai = new OpenAI({ apiKey });
    this.repository = repository;
  }

  async personalizeContent(
    content: string,
    preferences: UserPreference,
    patterns: BehaviorPattern[],
    context?: Record<string, any>
  ): Promise<PersonalizationResult> {
    const startTime = Date.now();
    
    try {
      // Determine if personalization should be applied
      const shouldPersonalize = await this.shouldPersonalize(preferences.userId, context);
      
      if (!shouldPersonalize.shouldPersonalize) {
        return {
          success: true,
          personalizedContent: content,
          adaptations: [],
          overallConfidence: 0,
          processingTime: Date.now() - startTime,
          metadata: {
            userId: preferences.userId,
            adaptationsCount: 0,
            patternsUsed: [],
            preferencesUsed: []
          }
        };
      }

      // Generate personalization instructions
      const instructions = await this.generatePersonalizationInstructions(preferences, patterns);
      
      // Apply personalization using AI
      const personalizedContent = await this.applyPersonalization(
        content,
        instructions,
        preferences,
        patterns,
        context
      );

      // Extract adaptations made
      const adaptations = await this.extractAdaptations(content, personalizedContent.personalizedContent);

      return {
        success: true,
        personalizedContent: personalizedContent.personalizedContent,
        adaptations,
        overallConfidence: personalizedContent.confidence,
        processingTime: Date.now() - startTime,
        metadata: {
          userId: preferences.userId,
          adaptationsCount: adaptations.length,
          patternsUsed: patterns.map(p => p.patternType),
          preferencesUsed: this.getUsedPreferences(preferences)
        }
      };
    } catch (error) {
      return {
        success: false,
        personalizedContent: content,
        adaptations: [],
        overallConfidence: 0,
        processingTime: Date.now() - startTime,
        metadata: {
          userId: preferences.userId,
          adaptationsCount: 0,
          patternsUsed: [],
          preferencesUsed: []
        }
      };
    }
  }

  async adaptPrompt(
    prompt: string,
    preferences: UserPreference,
    patterns: BehaviorPattern[],
    context?: Record<string, any>
  ): Promise<PersonalizationResult> {
    const startTime = Date.now();
    
    try {
      // Analyze the original prompt
      const promptAnalysis = await this.analyzePrompt(prompt);
      
      // Determine adaptations needed
      const adaptationsNeeded = await this.determinePromptAdaptations(
        promptAnalysis,
        preferences,
        patterns,
        context
      );

      if (adaptationsNeeded.adaptations.length === 0) {
        return {
          success: true,
          personalizedContent: prompt,
          adaptations: [],
          overallConfidence: 0,
          processingTime: Date.now() - startTime,
          metadata: {
            userId: preferences.userId,
            adaptationsCount: 0,
            patternsUsed: [],
            preferencesUsed: []
          }
        };
      }

      // Apply adaptations
      const adaptedPrompt = await this.applyPromptAdaptations(
        prompt,
        adaptationsNeeded,
        preferences,
        patterns,
        context
      );

      // Extract adaptations made
      const adaptations = await this.extractAdaptations(prompt, adaptedPrompt.adaptedPrompt);

      return {
        success: true,
        personalizedContent: adaptedPrompt.adaptedPrompt,
        adaptations,
        overallConfidence: adaptedPrompt.confidence,
        processingTime: Date.now() - startTime,
        metadata: {
          userId: preferences.userId,
          adaptationsCount: adaptations.length,
          patternsUsed: patterns.map(p => p.patternType),
          preferencesUsed: this.getUsedPreferences(preferences)
        }
      };
    } catch (error) {
      return {
        success: false,
        personalizedContent: prompt,
        adaptations: [],
        overallConfidence: 0,
        processingTime: Date.now() - startTime,
        metadata: {
          userId: preferences.userId,
          adaptationsCount: 0,
          patternsUsed: [],
          preferencesUsed: []
        }
      };
    }
  }

  async generatePersonalizationInstructions(
    preferences: UserPreference,
    patterns: BehaviorPattern[]
  ): Promise<string> {
    const instructions = [];

    // Add preference-based instructions
    if (preferences.preferences.tone) {
      instructions.push(`Use a ${preferences.preferences.tone} tone`);
    }

    if (preferences.preferences.style) {
      instructions.push(`Write in a ${preferences.preferences.style} style`);
    }

    if (preferences.preferences.length) {
      instructions.push(`Keep content ${preferences.preferences.length} in length`);
    }

    if (preferences.preferences.complexity) {
      instructions.push(`Maintain ${preferences.preferences.complexity} complexity`);
    }

    if (preferences.preferences.targetAudience) {
      instructions.push(`Target audience: ${preferences.preferences.targetAudience}`);
    }

    if (preferences.preferences.keywords && preferences.preferences.keywords.length > 0) {
      instructions.push(`Include keywords: ${preferences.preferences.keywords.join(', ')}`);
    }

    if (preferences.preferences.avoidKeywords && preferences.preferences.avoidKeywords.length > 0) {
      instructions.push(`Avoid keywords: ${preferences.preferences.avoidKeywords.join(', ')}`);
    }

    if (preferences.preferences.customInstructions) {
      instructions.push(preferences.preferences.customInstructions);
    }

    // Add pattern-based instructions
    for (const pattern of patterns) {
      switch (pattern.patternType) {
        case 'time_preference':
          if (pattern.pattern.peakHour) {
            instructions.push(`Consider time-based preferences (peak hour: ${pattern.pattern.peakHour})`);
          }
          break;
        case 'content_type_preference':
          if (pattern.pattern.preferredContentType) {
            instructions.push(`Format for ${pattern.pattern.preferredContentType}`);
          }
          break;
        case 'modification_pattern':
          if (pattern.pattern.commonModification) {
            instructions.push(`Address common modification: ${pattern.pattern.commonModification}`);
          }
          break;
        case 'satisfaction_pattern':
          if (pattern.pattern.averageSatisfaction && pattern.pattern.averageSatisfaction < 7) {
            instructions.push('Focus on improving quality and satisfaction');
          }
          break;
      }
    }

    return instructions.join('. ');
  }

  async shouldPersonalize(
    userId: string,
    context?: Record<string, any>
  ): Promise<{
    shouldPersonalize: boolean;
    confidence: number;
    reasoning: string;
  }> {
    let confidence = 0;
    const reasons = [];

    // Get user preferences and patterns
    const userPreferences = await this.repository.getUserPreferences(userId);
    const userPatterns = await this.repository.getBehaviorPatterns(userId);

    // Check if user has meaningful preferences
    if (userPreferences) {
      const hasPreferences = Object.values(userPreferences.preferences).some(value => 
        value !== undefined && value !== null && value !== ''
      );
      
      if (hasPreferences) {
        confidence += 0.4;
        reasons.push('User has defined preferences');
      }
    }

    // Check if there are significant behavior patterns
    const hasSignificantPatterns = userPatterns.some((p: BehaviorPattern) => p.confidence > 0.7);
    
    if (hasSignificantPatterns) {
      confidence += 0.3;
      reasons.push('Strong behavior patterns detected');
    }

    // Check interaction frequency
    const stats = await this.repository.getUserStats(userId);
    if (stats.totalInteractions > 10) {
      confidence += 0.2;
      reasons.push('Sufficient interaction history');
    }

    // Check adaptation effectiveness
    if (stats.adaptationEffectiveness > 7) {
      confidence += 0.1;
      reasons.push('Previous adaptations were effective');
    }

    return {
      shouldPersonalize: confidence > 0.5,
      confidence,
      reasoning: reasons.join(', ')
    };
  }

  async evaluatePersonalization(
    original: string,
    personalized: string,
    feedback?: {
      rating: number;
      comments: string;
    }
  ): Promise<{
    effectiveness: number;
    improvement: number;
    shouldPersist: boolean;
    adaptations: Array<{
      type: AdaptationType;
      success: boolean;
      impact: number;
    }>;
  }> {
    // Compare original and personalized content
    const comparison = await this.compareContent(original, personalized);
    
    // Calculate effectiveness
    let effectiveness = 0.5; // Base effectiveness
    
    if (feedback) {
      effectiveness = feedback.rating / 10;
    } else {
      // Use AI to evaluate effectiveness
      effectiveness = await this.aiEvaluateEffectiveness(original, personalized);
    }

    // Calculate improvement
    const improvement = comparison.similarity > 0.8 ? 0 : (1 - comparison.similarity) * effectiveness;

    // Determine if should persist
    const shouldPersist = effectiveness > 0.6 && improvement > 0.1;

    // Analyze individual adaptations
    const adaptations = await this.analyzeAdaptations(original, personalized);

    return {
      effectiveness,
      improvement,
      shouldPersist,
      adaptations
    };
  }

  // Private helper methods

  private async applyPersonalization(
    content: string,
    instructions: string,
    preferences: UserPreference,
    patterns: BehaviorPattern[],
    context?: Record<string, any>
  ): Promise<{
    personalizedContent: string;
    confidence: number;
  }> {
    const prompt = `Please personalize the following content based on these instructions:

Original Content:
${content}

Personalization Instructions:
${instructions}

Context: ${context ? JSON.stringify(context) : 'None'}

Please provide the personalized content that follows the instructions while maintaining the core message and intent.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content personalizer. Apply the given instructions to personalize content while maintaining quality and coherence.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      const personalizedContent = response.choices[0]?.message?.content || content;
      
      // Calculate confidence based on instructions completeness
      const confidence = this.calculatePersonalizationConfidence(instructions, patterns);

      return {
        personalizedContent,
        confidence
      };
    } catch (error) {
      return {
        personalizedContent: content,
        confidence: 0
      };
    }
  }

  private async analyzePrompt(prompt: string): Promise<{
    intent: string;
    complexity: string;
    tone: string;
    structure: string;
    keywords: string[];
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in prompt analysis. Analyze the given prompt and return a JSON response.'
          },
          {
            role: 'user',
            content: `Analyze this prompt: "${prompt}"

Return JSON with:
- intent: main purpose of the prompt
- complexity: simple/moderate/complex
- tone: detected tone
- structure: prompt structure
- keywords: array of key keywords`
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        return this.performBasicPromptAnalysis(prompt);
      }
    } catch (error) {
      return this.performBasicPromptAnalysis(prompt);
    }
  }

  private performBasicPromptAnalysis(prompt: string): {
    intent: string;
    complexity: string;
    tone: string;
    structure: string;
    keywords: string[];
  } {
    const lowerPrompt = prompt.toLowerCase();
    
    // Intent detection
    let intent = 'general';
    if (lowerPrompt.includes('create') || lowerPrompt.includes('generate')) intent = 'creative';
    else if (lowerPrompt.includes('explain') || lowerPrompt.includes('describe')) intent = 'explanatory';
    else if (lowerPrompt.includes('analyze') || lowerPrompt.includes('evaluate')) intent = 'analytical';
    
    // Complexity detection
    const complexity = prompt.length > 200 ? 'complex' : prompt.length > 100 ? 'moderate' : 'simple';
    
    // Tone detection
    let tone = 'neutral';
    if (lowerPrompt.includes('please') || lowerPrompt.includes('kindly')) tone = 'polite';
    else if (lowerPrompt.includes('urgent') || lowerPrompt.includes('asap')) tone = 'urgent';
    
    // Structure detection
    const structure = prompt.includes('?') ? 'question' : 'statement';
    
    // Keywords extraction
    const words = lowerPrompt.split(/\s+/);
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const keywords = words
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 5);

    return { intent, complexity, tone, structure, keywords };
  }

  private async determinePromptAdaptations(
    analysis: any,
    preferences: UserPreference,
    patterns: BehaviorPattern[],
    context?: Record<string, any>
  ): Promise<{
    adaptations: string[];
    confidence: number;
  }> {
    const adaptations = [];
    let confidence = 0;

    // Check tone adaptation
    if (preferences.preferences.tone && analysis.tone !== preferences.preferences.tone) {
      adaptations.push(`Adjust tone from ${analysis.tone} to ${preferences.preferences.tone}`);
      confidence += 0.3;
    }

    // Check complexity adaptation
    if (preferences.preferences.complexity && analysis.complexity !== preferences.preferences.complexity) {
      adaptations.push(`Adjust complexity from ${analysis.complexity} to ${preferences.preferences.complexity}`);
      confidence += 0.2;
    }

    // Check keyword inclusion
    if (preferences.preferences.keywords && preferences.preferences.keywords.length > 0) {
      const missingKeywords = preferences.preferences.keywords.filter(keyword => 
        !analysis.keywords.includes(keyword.toLowerCase())
      );
      if (missingKeywords.length > 0) {
        adaptations.push(`Include keywords: ${missingKeywords.join(', ')}`);
        confidence += 0.2;
      }
    }

    // Check pattern-based adaptations
    for (const pattern of patterns) {
      if (pattern.patternType === 'modification_pattern' && pattern.confidence > 0.7) {
        adaptations.push(`Address pattern: ${pattern.pattern.commonModification}`);
        confidence += 0.1;
      }
    }

    return {
      adaptations,
      confidence: Math.min(confidence, 1.0)
    };
  }

  private async applyPromptAdaptations(
    originalPrompt: string,
    adaptationsNeeded: any,
    preferences: UserPreference,
    patterns: BehaviorPattern[],
    context?: Record<string, any>
  ): Promise<{
    adaptedPrompt: string;
    confidence: number;
  }> {
    const adaptationPrompt = `Please adapt the following prompt based on these adaptations:

Original Prompt:
${originalPrompt}

Required Adaptations:
${adaptationsNeeded.adaptations.join('. ')}

User Preferences:
${JSON.stringify(preferences.preferences, null, 2)}

Context: ${context ? JSON.stringify(context) : 'None'}

Please provide the adapted prompt that incorporates all the adaptations while maintaining the original intent.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert prompt adapter. Apply the given adaptations to improve the prompt while maintaining its core purpose.'
          },
          {
            role: 'user',
            content: adaptationPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const adaptedPrompt = response.choices[0]?.message?.content || originalPrompt;

      return {
        adaptedPrompt,
        confidence: adaptationsNeeded.confidence
      };
    } catch (error) {
      return {
        adaptedPrompt: originalPrompt,
        confidence: 0
      };
    }
  }

  private async extractAdaptations(original: string, personalized: string): Promise<Array<{
    type: AdaptationType;
    original: string;
    adapted: string;
    confidence: number;
  }>> {
    const adaptations = [];

    // Use AI to identify specific adaptations
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at identifying content adaptations. Compare two texts and identify specific changes made.'
          },
          {
            role: 'user',
            content: `Compare these two texts and identify the adaptations made:

Original: "${original}"

Personalized: "${personalized}"

Return a JSON array of adaptations with:
- type: (tone, style, length, complexity, format, content_type, language)
- original: original text segment
- adapted: adapted text segment
- confidence: 0-1`
          }
        ],
        max_tokens: 800,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '[]';
      
      try {
        const parsedAdaptations = JSON.parse(content);
        return parsedAdaptations.map((adaptation: any) => ({
          type: adaptation.type as AdaptationType,
          original: adaptation.original,
          adapted: adaptation.adapted,
          confidence: adaptation.confidence || 0.5
        }));
      } catch (parseError) {
        return this.performBasicAdaptationExtraction(original, personalized);
      }
    } catch (error) {
      return this.performBasicAdaptationExtraction(original, personalized);
    }
  }

  private performBasicAdaptationExtraction(original: string, personalized: string): Array<{
    type: AdaptationType;
    original: string;
    adapted: string;
    confidence: number;
  }> {
    const adaptations = [];

    // Simple length adaptation detection
    if (Math.abs(original.length - personalized.length) > original.length * 0.2) {
      adaptations.push({
        type: AdaptationType.LENGTH,
        original: original.substring(0, 50) + '...',
        adapted: personalized.substring(0, 50) + '...',
        confidence: 0.6
      });
    }

    // Simple tone adaptation detection (basic)
    const originalWords = original.toLowerCase().split(/\s+/);
    const personalizedWords = personalized.toLowerCase().split(/\s+/);
    
    const toneWords = {
      formal: ['formal', 'professional', 'respectfully', 'sincerely'],
      casual: ['casual', 'informal', 'friendly', 'relaxed'],
      enthusiastic: ['excited', 'amazing', 'fantastic', 'wonderful']
    };

    for (const [tone, words] of Object.entries(toneWords)) {
      const originalCount = words.filter(word => originalWords.includes(word)).length;
      const personalizedCount = words.filter(word => personalizedWords.includes(word)).length;
      
      if (Math.abs(originalCount - personalizedCount) > 1) {
        adaptations.push({
          type: AdaptationType.TONE,
          original: original.substring(0, 30) + '...',
          adapted: personalized.substring(0, 30) + '...',
          confidence: 0.5
        });
        break;
      }
    }

    return adaptations;
  }

  private getUsedPreferences(preferences: UserPreference): string[] {
    const used = [];
    
    for (const [key, value] of Object.entries(preferences.preferences)) {
      if (value !== undefined && value !== null && value !== '') {
        used.push(key);
      }
    }
    
    return used;
  }

  private calculatePersonalizationConfidence(instructions: string, patterns: BehaviorPattern[]): number {
    let confidence = 0.5; // Base confidence
    
    // Add confidence based on instruction completeness
    if (instructions.length > 50) confidence += 0.2;
    if (instructions.includes('tone')) confidence += 0.1;
    if (instructions.includes('style')) confidence += 0.1;
    if (instructions.includes('audience')) confidence += 0.1;
    
    // Add confidence based on pattern strength
    const avgPatternConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    confidence += avgPatternConfidence * 0.2;
    
    return Math.min(confidence, 1.0);
  }

  private async compareContent(original: string, personalized: string): Promise<{
    similarity: number;
    differences: string[];
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at comparing text content. Analyze similarities and differences between two texts.'
          },
          {
            role: 'user',
            content: `Compare these two texts:

Original: "${original}"

Personalized: "${personalized}"

Return JSON with:
- similarity: 0-1 similarity score
- differences: array of key differences`
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '{"similarity": 0.5, "differences": []}';
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        return this.performBasicContentComparison(original, personalized);
      }
    } catch (error) {
      return this.performBasicContentComparison(original, personalized);
    }
  }

  private performBasicContentComparison(original: string, personalized: string): {
    similarity: number;
    differences: string[];
  } {
    // Simple similarity calculation based on word overlap
    const originalWords = new Set(original.toLowerCase().split(/\s+/));
    const personalizedWords = new Set(personalized.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...originalWords].filter(x => personalizedWords.has(x)));
    const union = new Set([...originalWords, ...personalizedWords]);
    
    const similarity = intersection.size / union.size;
    
    const differences = [];
    if (Math.abs(original.length - personalized.length) > original.length * 0.2) {
      differences.push('Length changed significantly');
    }
    
    return { similarity, differences };
  }

  private async aiEvaluateEffectiveness(original: string, personalized: string): Promise<number> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at evaluating content personalization. Rate the effectiveness of personalization on a scale of 0-10.'
          },
          {
            role: 'user',
            content: `Evaluate the effectiveness of this personalization:

Original: "${original}"

Personalized: "${personalized}"

Return a single number between 0 and 10 representing the effectiveness score.`
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '5';
      const score = parseFloat(content);
      
      return isNaN(score) ? 0.5 : score / 10;
    } catch (error) {
      return 0.5;
    }
  }

  private async analyzeAdaptations(original: string, personalized: string): Promise<Array<{
    type: AdaptationType;
    success: boolean;
    impact: number;
  }>> {
    const adaptations = await this.extractAdaptations(original, personalized);
    
    return adaptations.map(adaptation => ({
      type: adaptation.type,
      success: adaptation.confidence > 0.5,
      impact: adaptation.confidence
    }));
  }
}
