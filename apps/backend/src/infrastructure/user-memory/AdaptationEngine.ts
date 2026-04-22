import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { 
  IAdaptationEngine,
  IUserMemoryRepository
} from '@/domain/user-memory/services/IUserMemoryService';
import { 
  AdaptationType,
  AdaptationData,
  UserPreference,
  BehaviorPattern,
  PersonalizationResult
} from '@/domain/user-memory/entities/UserMemory';

export class AdaptationEngine implements IAdaptationEngine {
  private openai: OpenAI;
  private repository: IUserMemoryRepository;

  constructor(apiKey: string, repository: IUserMemoryRepository) {
    this.openai = new OpenAI({ apiKey });
    this.repository = repository;
  }

  async shouldAdapt(userId: string, context: Record<string, any>): Promise<{
    shouldAdapt: boolean;
    adaptationType: AdaptationType;
    confidence: number;
    reasoning: string;
  }> {
    // Get user preferences and patterns
    const preferences = await this.repository.getUserPreferences(userId);
    const patterns = await this.repository.getBehaviorPatterns(userId);
    const adaptations = await this.repository.getAdaptationHistory(userId);

    let confidence = 0;
    const reasons = [];
    let adaptationType = AdaptationType.TONE; // Default

    // Check if user has adaptation history
    if (adaptations.length > 0) {
      const effectiveAdaptations = adaptations.filter(a => a.effectiveness > 7);
      confidence += effectiveAdaptations.length / adaptations.length * 0.4;
      reasons.push(`Previous adaptations were ${Math.round((effectiveAdaptations.length / adaptations.length) * 100)}% effective`);
    }

    // Check if user has meaningful preferences
    if (preferences) {
      const hasPreferences = Object.values(preferences.preferences).some(value => 
        value !== undefined && value !== null && value !== ''
      );
      
      if (hasPreferences) {
        confidence += 0.3;
        reasons.push('User has defined preferences');
      }
    }

    // Check if there are significant behavior patterns
    if (patterns.length > 0) {
      const strongPatterns = patterns.filter(p => p.confidence > 0.7);
      confidence += strongPatterns.length / patterns.length * 0.3;
      reasons.push(`${strongPatterns.length} strong behavior patterns detected`);
    }

    // Determine most likely adaptation type based on patterns
    if (patterns.length > 0) {
      adaptationType = this.determineMostLikelyAdaptationType(patterns);
    }

    return {
      shouldAdapt: confidence > 0.5,
      adaptationType,
      confidence,
      reasoning: reasons.join('; ')
    };
  }

  async determineAdaptationType(
    userId: string,
    content: string,
    context: Record<string, any>
  ): Promise<{
    adaptationType: AdaptationType;
    confidence: number;
    reasoning: string;
  }> {
    const patterns = await this.repository.getBehaviorPatterns(userId);
    const adaptations = await this.repository.getAdaptationsByType(userId, AdaptationType.TONE);

    // Analyze content to determine what needs adaptation
    const contentAnalysis = await this.analyzeContent(content);
    
    // Score each adaptation type
    const scores = new Map<AdaptationType, number>();
    
    for (const adaptationType of Object.values(AdaptationType)) {
      let score = 0;
      
      // Base score from content analysis
      switch (adaptationType) {
        case AdaptationType.TONE:
          score += contentAnalysis.toneMismatch ? 0.8 : 0.2;
          break;
        case AdaptationType.STYLE:
          score += contentAnalysis.styleComplexity > 0.7 ? 0.6 : 0.3;
          break;
        case AdaptationType.LENGTH:
          score += contentAnalysis.lengthInappropriate ? 0.7 : 0.2;
          break;
        case AdaptationType.COMPLEXITY:
          score += contentAnalysis.complexityMismatch ? 0.6 : 0.3;
          break;
        case AdaptationType.FORMAT:
          score += contentAnalysis.formatIssues ? 0.5 : 0.2;
          break;
        case AdaptationType.CONTENT_TYPE:
          score += contentAnalysis.contentTypeMismatch ? 0.6 : 0.2;
          break;
        case AdaptationType.LANGUAGE:
          score += contentAnalysis.languageIssues ? 0.4 : 0.1;
          break;
      }
      
      // Add pattern-based scoring
      const typePatterns = patterns.filter(p => p.patternType === `${adaptationType}_preference`);
      if (typePatterns.length > 0) {
        const avgConfidence = typePatterns.reduce((sum, p) => sum + p.confidence, 0) / typePatterns.length;
        score += avgConfidence * 0.3;
      }
      
      // Add historical success rate
      const typeAdaptations = await this.repository.getAdaptationsByType(userId, adaptationType);
      if (typeAdaptations.length > 0) {
        const avgEffectiveness = typeAdaptations.reduce((sum, a) => sum + a.effectiveness, 0) / typeAdaptations.length;
        score += (avgEffectiveness / 10) * 0.2;
      }
      
      scores.set(adaptationType, score);
    }

    // Find the highest scoring adaptation type
    let bestType = AdaptationType.TONE;
    let bestScore = 0;
    
    for (const [type, score] of scores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    return {
      adaptationType: bestType,
      confidence: Math.min(bestScore, 1.0),
      reasoning: `Based on content analysis and user patterns, ${bestType} adaptation is most suitable`
    };
  }

  async performAdaptation(
    userId: string,
    content: string,
    adaptationType: AdaptationType,
    context: Record<string, any>
  ): Promise<PersonalizationResult> {
    const startTime = Date.now();
    
    try {
      // Get user preferences for context
      const preferences = await this.repository.getUserPreferences(userId);
      const patterns = await this.repository.getBehaviorPatterns(userId);
      
      // Generate adaptation instructions
      const instructions = await this.generateAdaptationInstructions(
        adaptationType,
        content,
        preferences,
        patterns,
        context
      );
      
      // Apply adaptation using AI
      const adaptedContent = await this.applyAdaptation(
        content,
        instructions,
        adaptationType,
        preferences,
        context
      );
      
      // Save adaptation data
      const adaptationData: AdaptationData = {
        id: uuidv4(),
        userId,
        adaptationType,
        original: content,
        adapted: adaptedContent.adaptedContent,
        context,
        trigger: 'automatic_detection',
        effectiveness: adaptedContent.confidence * 10,
        confidence: adaptedContent.confidence,
        timestamp: new Date()
      };
      
      await this.repository.saveAdaptation(adaptationData);
      
      // Extract adaptations made
      const adaptations = [{
        type: adaptationType,
        original: content,
        adapted: adaptedContent.adaptedContent,
        confidence: adaptedContent.confidence
      }];

      return {
        success: true,
        personalizedContent: adaptedContent.adaptedContent,
        adaptations,
        overallConfidence: adaptedContent.confidence,
        processingTime: Date.now() - startTime,
        metadata: {
          userId,
          adaptationsCount: 1,
          patternsUsed: patterns.map(p => p.patternType),
          preferencesUsed: preferences ? Object.keys(preferences.preferences) : []
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
          userId,
          adaptationsCount: 0,
          patternsUsed: [],
          preferencesUsed: []
        }
      };
    }
  }

  async evaluateAdaptation(
    userId: string,
    original: string,
    adapted: string,
    adaptationType: AdaptationType,
    feedback?: {
      rating: number;
      comments: string;
    }
  ): Promise<{
    effectiveness: number;
    improvement: number;
    shouldPersist: boolean;
    confidence: number;
  }> {
    // Calculate similarity between original and adapted content
    const similarity = await this.calculateContentSimilarity(original, adapted);
    
    // Calculate improvement based on feedback or AI evaluation
    let improvement = 0;
    if (feedback) {
      improvement = feedback.rating / 10;
    } else {
      improvement = await this.aiEvaluateImprovement(original, adapted);
    }
    
    // Calculate effectiveness
    const effectiveness = (improvement + (1 - similarity)) / 2;
    
    // Determine if should persist
    const shouldPersist = effectiveness > 0.6 && improvement > 0.5;
    
    // Calculate confidence
    const confidence = Math.min(effectiveness, improvement);
    
    return {
      effectiveness,
      improvement,
      shouldPersist,
      confidence
    };
  }

  async getAdaptationHistory(userId: string): Promise<AdaptationData[]> {
    return await this.repository.getAdaptationHistory(userId);
  }

  async learnFromFeedback(
    userId: string,
    adaptationType: AdaptationType,
    feedback: {
      rating: number;
      comments: string;
      effectiveness: number;
    }
  ): Promise<void> {
    // Update user preferences based on feedback
    const preferences = await this.repository.getUserPreferences(userId);
    if (preferences) {
      // Add feedback to adaptation history
      const adaptationHistory = await this.repository.getAdaptationHistory(userId);
      const recentAdaptations = adaptationHistory
        .filter(a => a.adaptationType === adaptationType)
        .slice(-5); // Last 5 adaptations of this type
      
      // Update behavior patterns based on feedback
      if (feedback.effectiveness < 5) {
        // Low effectiveness - adjust preferences
        await this.adjustPreferencesForLowEffectiveness(userId, adaptationType, feedback);
      } else if (feedback.effectiveness > 8) {
        // High effectiveness - reinforce preferences
        await this.reinforcePreferencesForHighEffectiveness(userId, adaptationType, feedback);
      }
    }
  }

  // Private helper methods

  private determineMostLikelyAdaptationType(patterns: BehaviorPattern[]): AdaptationType {
    const typeCounts = new Map<AdaptationType, number>();
    
    for (const pattern of patterns) {
      if (pattern.patternType.includes('_preference')) {
        const adaptationType = this.patternTypeToAdaptationType(pattern.patternType);
        if (adaptationType) {
          typeCounts.set(adaptationType, (typeCounts.get(adaptationType) || 0) + pattern.frequency);
        }
      }
    }
    
    let bestType = AdaptationType.TONE;
    let bestCount = 0;
    
    for (const [type, count] of typeCounts.entries()) {
      if (count > bestCount) {
        bestCount = count;
        bestType = type;
      }
    }
    
    return bestType;
  }

  private patternTypeToAdaptationType(patternType: string): AdaptationType | null {
    const mapping: Record<string, AdaptationType> = {
      'tone_preference': AdaptationType.TONE,
      'style_preference': AdaptationType.STYLE,
      'length_preference': AdaptationType.LENGTH,
      'complexity_preference': AdaptationType.COMPLEXITY,
      'format_preference': AdaptationType.FORMAT,
      'content_type_preference': AdaptationType.CONTENT_TYPE,
      'language_preference': AdaptationType.LANGUAGE
    };
    
    return mapping[patternType] || null;
  }

  private async analyzeContent(content: string): Promise<{
    toneMismatch: boolean;
    styleComplexity: number;
    lengthInappropriate: boolean;
    complexityMismatch: boolean;
    formatIssues: boolean;
    contentTypeMismatch: boolean;
    languageIssues: boolean;
  }> {
    try {
      const aiResponse = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content analyzer. Analyze the given content and return a JSON response with boolean flags for various issues.'
          },
          {
            role: 'user',
            content: `Analyze this content: "${content}"

Return JSON with:
- toneMismatch: boolean
- styleComplexity: number (0-1)
- lengthInappropriate: boolean
- complexityMismatch: boolean
- formatIssues: boolean
- contentTypeMismatch: boolean
- languageIssues: boolean`
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      });

      const responseContent = aiResponse.choices[0]?.message?.content || '{}';
      
      try {
        return JSON.parse(responseContent);
      } catch (parseError) {
        return this.performBasicContentAnalysis(responseContent);
      }
    } catch (error) {
      return this.performBasicContentAnalysis(content);
    }
  }

  private performBasicContentAnalysis(content: string): {
    toneMismatch: boolean;
    styleComplexity: number;
    lengthInappropriate: boolean;
    complexityMismatch: boolean;
    formatIssues: boolean;
    contentTypeMismatch: boolean;
    languageIssues: boolean;
  } {
    // Very basic analysis
    return {
      toneMismatch: false,
      styleComplexity: Math.min(content.length / 1000, 1),
      lengthInappropriate: content.length > 2000 || content.length < 50,
      complexityMismatch: false,
      formatIssues: !content.includes('\n') && content.length > 200,
      contentTypeMismatch: false,
      languageIssues: false
    };
  }

  private async generateAdaptationInstructions(
    adaptationType: AdaptationType,
    content: string,
    preferences: UserPreference | null,
    patterns: BehaviorPattern[],
    context: Record<string, any>
  ): Promise<string> {
    const instructions = [];
    
    // Add type-specific instructions
    switch (adaptationType) {
      case AdaptationType.TONE:
        instructions.push('Adjust the tone to better match user preferences');
        if (preferences?.preferences.tone) {
          instructions.push(`Use a ${preferences.preferences.tone} tone`);
        }
        break;
      
      case AdaptationType.STYLE:
        instructions.push('Modify the writing style to suit user preferences');
        if (preferences?.preferences.style) {
          instructions.push(`Write in a ${preferences.preferences.style} style`);
        }
        break;
      
      case AdaptationType.LENGTH:
        instructions.push('Adjust the content length according to user preferences');
        if (preferences?.preferences.length) {
          instructions.push(`Keep content ${preferences.preferences.length} in length`);
        }
        break;
      
      case AdaptationType.COMPLEXITY:
        instructions.push('Adjust the complexity level to match user preferences');
        if (preferences?.preferences.complexity) {
          instructions.push(`Maintain ${preferences.preferences.complexity} complexity`);
        }
        break;
      
      case AdaptationType.FORMAT:
        instructions.push('Reformat the content according to user preferences');
        if (preferences?.preferences.format) {
          instructions.push(`Use ${preferences.preferences.format} format`);
        }
        break;
      
      case AdaptationType.CONTENT_TYPE:
        instructions.push('Adapt the content type to match user preferences');
        if (preferences?.preferences.contentType) {
          instructions.push(`Format as ${preferences.preferences.contentType}`);
        }
        break;
      
      case AdaptationType.LANGUAGE:
        instructions.push('Adjust language according to user preferences');
        if (preferences?.preferences.language) {
          instructions.push(`Write in ${preferences.preferences.language}`);
        }
        break;
    }
    
    // Add pattern-based instructions
    for (const pattern of patterns) {
      if (pattern.confidence > 0.7) {
        instructions.push(`Consider pattern: ${pattern.patternType}`);
      }
    }
    
    return instructions.join('. ');
  }

  private async applyAdaptation(
    content: string,
    instructions: string,
    adaptationType: AdaptationType,
    preferences: UserPreference | null,
    context: Record<string, any>
  ): Promise<{
    adaptedContent: string;
    confidence: number;
  }> {
    const prompt = `Please adapt the following content based on these instructions:

Original Content:
${content}

Adaptation Type: ${adaptationType}
Instructions: ${instructions}

User Preferences: ${preferences ? JSON.stringify(preferences.preferences, null, 2) : 'None'}
Context: ${context ? JSON.stringify(context) : 'None'}

Please provide the adapted content that follows the instructions while maintaining the core message and intent.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content adapter. Apply the given instructions to adapt content while maintaining quality and coherence.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      const adaptedContent = response.choices[0]?.message?.content || content;
      
      // Calculate confidence based on instruction completeness and adaptation type
      const confidence = this.calculateAdaptationConfidence(instructions, adaptationType);

      return {
        adaptedContent,
        confidence
      };
    } catch (error) {
      return {
        adaptedContent: content,
        confidence: 0
      };
    }
  }

  private calculateAdaptationConfidence(instructions: string, adaptationType: AdaptationType): number {
    let confidence = 0.5; // Base confidence
    
    // Add confidence based on instruction completeness
    if (instructions.length > 50) confidence += 0.2;
    if (instructions.includes('tone')) confidence += 0.1;
    if (instructions.includes('style')) confidence += 0.1;
    if (instructions.includes('length')) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private async calculateContentSimilarity(original: string, adapted: string): Promise<number> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at comparing text content. Calculate similarity between two texts on a scale of 0-1.'
          },
          {
            role: 'user',
            content: `Calculate similarity between these two texts:

Original: "${original}"

Adapted: "${adapted}"

Return a single number between 0 and 1 representing the similarity score.`
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '0.5';
      const score = parseFloat(content);
      
      return isNaN(score) ? 0.5 : Math.min(Math.max(score, 0), 1);
    } catch (error) {
      return this.performBasicSimilarityCalculation(original, adapted);
    }
  }

  private performBasicSimilarityCalculation(original: string, adapted: string): number {
    const originalWords = new Set(original.toLowerCase().split(/\s+/));
    const adaptedWords = new Set(adapted.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...originalWords].filter(x => adaptedWords.has(x)));
    const union = new Set([...originalWords, ...adaptedWords]);
    
    return intersection.size / union.size;
  }

  private async aiEvaluateImprovement(original: string, adapted: string): Promise<number> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at evaluating content improvements. Rate the improvement from original to adapted content on a scale of 0-10.'
          },
          {
            role: 'user',
            content: `Evaluate the improvement from original to adapted content:

Original: "${original}"

Adapted: "${adapted}"

Return a single number between 0 and 10 representing the improvement score.`
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '5';
      const score = parseFloat(content);
      
      return isNaN(score) ? 0.5 : Math.min(Math.max(score / 10, 0), 1);
    } catch (error) {
      return 0.5;
    }
  }

  private async adjustPreferencesForLowEffectiveness(
    userId: string,
    adaptationType: AdaptationType,
    feedback: {
      rating: number;
      comments: string;
      effectiveness: number;
    }
  ): Promise<void> {
    const preferences = await this.repository.getUserPreferences(userId);
    if (!preferences) return;

    // Adjust preferences based on low effectiveness
    switch (adaptationType) {
      case AdaptationType.TONE:
        // Reset or adjust tone preference
        preferences.preferences.tone = undefined;
        break;
      case AdaptationType.STYLE:
        // Reset or adjust style preference
        preferences.preferences.style = undefined;
        break;
      // Add more cases as needed
    }

    await this.repository.updateUserPreferences(userId, {
      metadata: {
        ...preferences.metadata,
        updatedAt: new Date()
      }
    });
  }

  private async reinforcePreferencesForHighEffectiveness(
    userId: string,
    adaptationType: AdaptationType,
    feedback: {
      rating: number;
      comments: string;
      effectiveness: number;
    }
  ): Promise<void> {
    const preferences = await this.repository.getUserPreferences(userId);
    if (!preferences) return;

    // Add to adaptation history as successful
    const adaptationData: AdaptationData = {
      id: uuidv4(),
      userId,
      adaptationType,
      original: '',
      adapted: '',
      context: { feedback },
      trigger: 'positive_reinforcement',
      effectiveness: feedback.effectiveness,
      confidence: feedback.rating / 10,
      timestamp: new Date(),
      feedback: {
        userRating: feedback.rating,
        systemRating: feedback.effectiveness,
        comments: feedback.comments
      }
    };

    await this.repository.saveAdaptation(adaptationData);
  }
}
