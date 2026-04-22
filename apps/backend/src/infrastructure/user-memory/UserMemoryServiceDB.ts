import { UserMemoryRepositoryDB, PromptHistory, InteractionHistory, MemorySummary, BehaviorPattern, ContentPreference } from '../repositories/UserMemoryRepositoryDB';

export interface MemoryContext {
  userId: string;
  sessionId?: string;
  recentInteractions: number;
  timeWindow: number; // hours
}

export interface PersonalizationResult {
  personalizedContent: string;
  context: {
    userPreferences: any;
    recentHistory: string[];
    behaviorPatterns: string[];
    adaptations: string[];
  };
  confidence: number;
  appliedPersonalizations: string[];
}

export interface MemoryInsights {
  userPreferences: any;
  patterns: BehaviorPattern[];
  trends: {
    topicTrends: string[];
    styleEvolution: string[];
    satisfactionTrend: number[];
    adaptationTrends: number[];
  };
  recommendations: string[];
  personalizationScore: number;
}

export class UserMemoryServiceDB {
  private aiEngine: any;
  private summarizationCache: Map<string, MemorySummary> = new Map();

  constructor(
    private repository: UserMemoryRepositoryDB,
    aiEngine?: any
  ) {
    this.aiEngine = aiEngine;
  }

  // Core Memory Operations
  async storePrompt(userId: string, prompt: string, options?: {
    response?: string;
    sessionId?: string;
    satisfactionScore?: number;
    tokensUsed?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const history: Omit<PromptHistory, 'id'> = {
      userId,
      prompt,
      response: options?.response,
      metadata: options?.metadata,
      sessionId: options?.sessionId,
      timestamp: new Date(),
      interactionType: 'prompt',
      satisfactionScore: options?.satisfactionScore,
      tokensUsed: options?.tokensUsed
    };

    await this.repository.addPromptHistory(history);

    // Also store as interaction
    await this.storeInteraction(userId, 'prompt', prompt, {
      response: options?.response,
      sessionId: options?.sessionId,
      satisfactionScore: options?.satisfactionScore,
      metadata: options?.metadata
    });

    // Trigger pattern detection asynchronously
    this.detectAndUpdatePatterns(userId).catch(console.error);
  }

  async storeResponse(userId: string, response: string, options?: {
    prompt?: string;
    sessionId?: string;
    satisfactionScore?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.storeInteraction(userId, 'response', response, {
      sessionId: options?.sessionId,
      satisfactionScore: options?.satisfactionScore,
      metadata: options?.metadata,
      context: { originalPrompt: options?.prompt }
    });
  }

  async storeInteraction(userId: string, interactionType: string, content: string, options?: {
    response?: string;
    sessionId?: string;
    satisfactionScore?: number;
    metadata?: Record<string, any>;
    context?: Record<string, any>;
  }): Promise<void> {
    const interaction: Omit<InteractionHistory, 'id'> = {
      userId,
      interactionType,
      content,
      response: options?.response,
      metadata: options?.metadata,
      sessionId: options?.sessionId,
      timestamp: new Date(),
      satisfactionScore: options?.satisfactionScore,
      context: options?.context
    };

    await this.repository.addInteraction(interaction);
  }

  // Memory Retrieval for AI Context
  async getContextForAI(userId: string, context?: MemoryContext): Promise<{
    userPreferences: any;
    recentHistory: string[];
    behaviorPatterns: string[];
    summary: string;
    insights: string[];
    adaptations: string[];
  }> {
    const recentCount = context?.recentInteractions || 10;
    const timeWindow = context?.timeWindow || 24; // hours

    // Get user preferences
    const preferences = await this.repository.getUserPreferences(userId);

    // Get recent interactions
    const recentHistory = await this.repository.getInteractionHistory(userId, recentCount);
    const recentPrompts = recentHistory
      .filter(i => i.interactionType === 'prompt')
      .slice(0, 5)
      .map(i => i.content);

    // Get behavior patterns
    const patterns = await this.repository.getBehaviorPatterns(userId);
    const relevantPatterns = patterns
      .filter(p => p.confidenceScore > 0.7)
      .slice(0, 5)
      .map(p => `${p.patternName}: ${p.patternData.description}`);

    // Get or generate memory summary
    const summary = await this.getMemorySummary(userId, 'recent');

    // Generate insights
    const insights = await this.generateQuickInsights(userId);

    return {
      userPreferences: preferences?.preferences || {},
      recentHistory: recentPrompts,
      behaviorPatterns: relevantPatterns,
      summary: summary.summaryText,
      insights,
      adaptations: [] // Will be populated when adaptation system is implemented
    };
  }

  // Memory Summarization
  async getMemorySummary(userId: string, summaryType: 'recent' | 'weekly' | 'monthly' | 'comprehensive'): Promise<MemorySummary> {
    const cacheKey = `${userId}-${summaryType}`;
    
    // Check cache
    const cached = this.summarizationCache.get(cacheKey);
    if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
      return cached;
    }

    // Generate new summary
    const summary = await this.generateMemorySummary(userId, summaryType);
    
    // Cache the result
    this.summarizationCache.set(cacheKey, summary);

    return summary;
  }

  private async generateMemorySummary(userId: string, summaryType: string): Promise<MemorySummary> {
    const timeWindow = this.getTimeWindowForType(summaryType);
    const cutoffDate = new Date(Date.now() - timeWindow);

    // Get relevant data
    const [interactions, prompts, patterns, stats] = await Promise.all([
      this.repository.getInteractionHistory(userId, 100),
      this.repository.getPromptHistory(userId, 100),
      this.repository.getBehaviorPatterns(userId),
      this.repository.getUserMemoryStats(userId)
    ]);

    // Filter by time window
    const recentInteractions = interactions.filter(i => i.timestamp >= cutoffDate);
    const recentPrompts = prompts.filter(p => p.timestamp >= cutoffDate);

    // Generate summary content
    let summaryText = '';
    const keyInsights: string[] = [];

    if (recentInteractions.length === 0) {
      summaryText = `No recent activity for user ${userId} in the specified time period.`;
    } else {
      // Basic stats
      summaryText = `User ${userId} has ${recentInteractions.length} interactions and ${recentPrompts.length} prompts in this period. `;
      
      // Satisfaction
      if (stats.averageSatisfaction > 0) {
        summaryText += `Average satisfaction: ${stats.averageSatisfaction.toFixed(1)}/5. `;
        keyInsights.push(`Satisfaction trend: ${stats.averageSatisfaction.toFixed(1)}/5`);
      }

      // Activity patterns
      if (stats.totalInteractions > 0) {
        summaryText += `Most active content type: ${stats.mostUsedContentType}. `;
        keyInsights.push(`Preferred content: ${stats.mostUsedContentType}`);
      }

      // Behavior patterns
      const strongPatterns = patterns.filter(p => p.confidenceScore > 0.8);
      if (strongPatterns.length > 0) {
        summaryText += `Detected ${strongPatterns.length} strong behavior patterns. `;
        keyInsights.push(...strongPatterns.map(p => p.patternName));
      }

      // Topic analysis
      const topics = this.extractTopicsFromPrompts(recentPrompts);
      if (topics.length > 0) {
        summaryText += `Main topics: ${topics.slice(0, 3).join(', ')}. `;
        keyInsights.push(`Topics: ${topics.slice(0, 3).join(', ')}`);
      }

      // AI-enhanced summary if available
      if (this.aiEngine && recentPrompts.length > 3) {
        try {
          const aiSummary = await this.generateAISummary(recentPrompts, recentInteractions);
          summaryText += ` AI Analysis: ${aiSummary}`;
        } catch (error) {
          console.warn('AI summarization failed:', error);
        }
      }
    }

    // Create summary object
    const summary: Omit<MemorySummary, 'id' | 'createdAt'> = {
      userId,
      summaryType,
      summaryText,
      timePeriod: this.getTimePeriodLabel(summaryType),
      keyInsights,
      interactionCount: recentInteractions.length,
      satisfactionAverage: stats.averageSatisfaction,
      expiresAt: new Date(Date.now() + (timeWindow / 2)) // Cache for half the time window
    };

    return await this.repository.saveMemorySummary(summary);
  }

  private async generateAISummary(prompts: PromptHistory[], interactions: InteractionHistory[]): Promise<string> {
    if (!this.aiEngine) return '';

    const promptTexts = prompts.slice(0, 10).map(p => p.prompt).join('\n');
    const interactionTexts = interactions.slice(0, 10).map(i => i.content).join('\n');

    const summaryPrompt = `
Please analyze the following user interactions and provide a concise summary of their behavior, preferences, and patterns:

Recent Prompts:
${promptTexts}

Recent Interactions:
${interactionTexts}

Focus on:
1. Communication style and preferences
2. Topic interests and patterns
3. Satisfaction indicators
4. Any notable behavioral patterns

Provide a 2-3 sentence summary that would be useful for personalizing future interactions.
`;

    try {
      const response = await this.aiEngine.generate({
        prompt: summaryPrompt,
        maxTokens: 200,
        temperature: 0.3
      });

      return response.content || '';
    } catch (error) {
      console.error('AI summarization error:', error);
      return '';
    }
  }

  // Personalization
  async personalizeContent(userId: string, content: string, context?: Record<string, any>): Promise<PersonalizationResult> {
    const memoryContext = await this.getContextForAI(userId, {
      userId,
      recentInteractions: 5,
      timeWindow: 24
    });

    const appliedPersonalizations: string[] = [];
    let personalizedContent = content;

    // Apply user preferences
    if (memoryContext.userPreferences.style) {
      personalizedContent = this.applyStylePreferences(personalizedContent, memoryContext.userPreferences.style);
      appliedPersonalizations.push('style_preferences');
    }

    // Apply recent context
    if (memoryContext.recentHistory.length > 0) {
      personalizedContent = this.applyRecentContext(personalizedContent, memoryContext.recentHistory);
      appliedPersonalizations.push('recent_context');
    }

    // Apply behavior patterns
    if (memoryContext.behaviorPatterns.length > 0) {
      personalizedContent = this.applyBehaviorPatterns(personalizedContent, memoryContext.behaviorPatterns);
      appliedPersonalizations.push('behavior_patterns');
    }

    // AI-enhanced personalization if available
    if (this.aiEngine) {
      try {
        const aiPersonalized = await this.aiPersonalizeContent(personalizedContent, memoryContext, context);
        personalizedContent = aiPersonalized.content;
        appliedPersonalizations.push('ai_enhancement');
      } catch (error) {
        console.warn('AI personalization failed:', error);
      }
    }

    return {
      personalizedContent,
      context: memoryContext,
      confidence: this.calculatePersonalizationConfidence(appliedPersonalizations),
      appliedPersonalizations
    };
  }

  private async aiPersonalizeContent(content: string, memoryContext: any, additionalContext?: Record<string, any>): Promise<{ content: string }> {
    if (!this.aiEngine) return { content };

    const personalizationPrompt = `
Please personalize the following content for a user based on their memory context:

Original Content:
${content}

User Context:
- Preferences: ${JSON.stringify(memoryContext.userPreferences)}
- Recent Topics: ${memoryContext.recentHistory.join(', ')}
- Behavior Patterns: ${memoryContext.behaviorPatterns.join(', ')}
- Summary: ${memoryContext.summary}

Additional Context: ${JSON.stringify(additionalContext || {})}

Guidelines:
1. Maintain the original message intent
2. Adapt tone and style to user preferences
3. Reference recent interactions when appropriate
4. Keep it natural and not overly personalized
5. If no personalization is needed, return the original content

Provide only the personalized content without explanations.
`;

    try {
      const response = await this.aiEngine.generate({
        prompt: personalizationPrompt,
        maxTokens: 500,
        temperature: 0.5
      });

      return { content: response.content || content };
    } catch (error) {
      console.error('AI personalization error:', error);
      return { content };
    }
  }

  // Pattern Detection
  private async detectAndUpdatePatterns(userId: string): Promise<void> {
    try {
      const recentInteractions = await this.repository.getInteractionHistory(userId, 50);
      const patterns = this.detectPatterns(recentInteractions);

      // Save detected patterns
      for (const pattern of patterns) {
        await this.repository.saveBehaviorPattern({
          userId,
          patternType: pattern.type,
          patternName: pattern.name,
          patternData: pattern.data,
          confidenceScore: pattern.confidence,
          frequency: pattern.frequency,
          lastDetected: new Date()
        });
      }
    } catch (error) {
      console.error('Pattern detection failed:', error);
    }
  }

  private detectPatterns(interactions: InteractionHistory[]): Array<{
    type: string;
    name: string;
    data: Record<string, any>;
    confidence: number;
    frequency: number;
  }> {
    const patterns: any[] = [];

    // Time patterns
    const hourCounts = interactions.reduce((acc, i) => {
      const hour = i.timestamp.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (peakHour && parseInt(peakHour[0]) >= 0) {
      patterns.push({
        type: 'temporal',
        name: 'peak_activity_time',
        data: { hour: parseInt(peakHour[0]), frequency: peakHour[1] },
        confidence: Math.min(peakHour[1] / interactions.length, 1),
        frequency: peakHour[1]
      });
    }

    // Content length patterns
    const lengths = interactions.map(i => i.content.length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    
    patterns.push({
      type: 'content',
      name: 'average_content_length',
      data: { averageLength: Math.round(avgLength), variance: this.calculateVariance(lengths) },
      confidence: 0.8,
      frequency: interactions.length
    });

    // Interaction frequency patterns
    const days = new Set(interactions.map(i => i.timestamp.toDateString())).size;
    const frequencyPerDay = interactions.length / Math.max(days, 1);

    patterns.push({
      type: 'engagement',
      name: 'interaction_frequency',
      data: { frequencyPerDay: Math.round(frequencyPerDay * 10) / 10, totalInteractions: interactions.length },
      confidence: 0.9,
      frequency: interactions.length
    });

    return patterns;
  }

  // Helper Methods
  private getTimeWindowForType(summaryType: string): number {
    const windows = {
      'recent': 24 * 60 * 60 * 1000, // 24 hours
      'weekly': 7 * 24 * 60 * 60 * 1000, // 7 days
      'monthly': 30 * 24 * 60 * 60 * 1000, // 30 days
      'comprehensive': 90 * 24 * 60 * 60 * 1000 // 90 days
    };
    return windows[summaryType as keyof typeof windows] || windows.recent;
  }

  private getTimePeriodLabel(summaryType: string): string {
    const labels = {
      'recent': 'Last 24 hours',
      'weekly': 'Last 7 days',
      'monthly': 'Last 30 days',
      'comprehensive': 'Last 90 days'
    };
    return labels[summaryType as keyof typeof labels] || 'Recent';
  }

  private extractTopicsFromPrompts(prompts: PromptHistory[]): string[] {
    const topics: string[] = [];
    prompts.forEach(p => {
      const words = p.prompt.toLowerCase().split(/\s+/);
      const keywords = words.filter(word => word.length > 4);
      topics.push(...keywords);
    });
    
    const topicCounts = topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private async generateQuickInsights(userId: string): Promise<string[]> {
    const insights: string[] = [];
    
    try {
      const stats = await this.repository.getUserMemoryStats(userId);
      
      if (stats.averageSatisfaction > 4) {
        insights.push('High user satisfaction');
      } else if (stats.averageSatisfaction < 3) {
        insights.push('Low user satisfaction - needs attention');
      }

      if (stats.totalInteractions > 100) {
        insights.push('Highly engaged user');
      } else if (stats.totalInteractions < 10) {
        insights.push('New or infrequent user');
      }

      const patterns = await this.repository.getBehaviorPatterns(userId);
      if (patterns.length > 5) {
        insights.push('Well-established behavioral patterns');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    }

    return insights;
  }

  private applyStylePreferences(content: string, style: Record<string, any>): string {
    let modified = content;

    if (style.tone === 'formal') {
      modified = modified.replace(/\b(hey|hi|hello)\b/gi, 'Greetings');
      modified = modified.replace(/\b(awesome|great|cool)\b/gi, 'excellent');
    } else if (style.tone === 'casual') {
      modified = modified.replace(/\b(furthermore|additionally|moreover)\b/gi, 'also');
      modified = modified.replace(/\b(dear|regards)\b/gi, 'hi');
    }

    if (style.verbosity === 'concise') {
      modified = modified.replace(/\b(in order to|for the purpose of)\b/gi, 'to');
      modified = modified.replace(/\b(due to the fact that)\b/gi, 'because');
    }

    return modified;
  }

  private applyRecentContext(content: string, recentHistory: string[]): string {
    // Simple context application - could be enhanced with AI
    return content;
  }

  private applyBehaviorPatterns(content: string, behaviorPatterns: string[]): string {
    // Simple pattern application - could be enhanced with AI
    return content;
  }

  private calculatePersonalizationConfidence(appliedPersonalizations: string[]): number {
    const weights = {
      'style_preferences': 0.3,
      'recent_context': 0.2,
      'behavior_patterns': 0.2,
      'ai_enhancement': 0.3
    };

    return appliedPersonalizations.reduce((confidence, personalization) => {
      return confidence + (weights[personalization as keyof typeof weights] || 0);
    }, 0);
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  // Public API Methods
  async getUserMemoryStats(userId: string): Promise<any> {
    return await this.repository.getUserMemoryStats(userId);
  }

  async getUserPreferences(userId: string): Promise<any> {
    const prefs = await this.repository.getUserPreferences(userId);
    return prefs?.preferences || {};
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    await this.repository.saveUserPreferences({ userId, preferences });
  }

  async getUserInsights(userId: string): Promise<MemoryInsights> {
    const [preferences, patterns, stats, recentPrompts] = await Promise.all([
      this.repository.getUserPreferences(userId),
      this.repository.getBehaviorPatterns(userId),
      this.repository.getUserMemoryStats(userId),
      this.repository.getPromptHistory(userId, 50)
    ]);

    const trends = await this.repository.analyzePromptTrends(userId);
    const recommendations = this.generateRecommendations(patterns, stats);
    const personalizationScore = this.calculatePersonalizationScore(patterns, stats);

    return {
      userPreferences: preferences?.preferences || {},
      patterns,
      trends: {
        topicTrends: trends.frequentTopics,
        styleEvolution: trends.evolution,
        satisfactionTrend: trends.qualityTrends,
        adaptationTrends: []
      },
      recommendations,
      personalizationScore
    };
  }

  private generateRecommendations(patterns: BehaviorPattern[], stats: any): string[] {
    const recommendations: string[] = [];

    if (stats.averageSatisfaction < 3.5) {
      recommendations.push('Consider improving response quality or adjusting interaction style');
    }

    if (stats.totalInteractions < 10) {
      recommendations.push('Encourage more frequent interactions to build better personalization');
    }

    const strongPatterns = patterns.filter(p => p.confidenceScore > 0.8);
    if (strongPatterns.length > 0) {
      recommendations.push('Leverage established behavior patterns for better personalization');
    }

    return recommendations;
  }

  private calculatePersonalizationScore(patterns: BehaviorPattern[], stats: any): number {
    let score = 0.5; // Base score

    // Pattern strength
    const avgPatternConfidence = patterns.reduce((sum, p) => sum + p.confidenceScore, 0) / Math.max(patterns.length, 1);
    score += avgPatternConfidence * 0.3;

    // Interaction frequency
    const interactionScore = Math.min(stats.totalInteractions / 50, 1);
    score += interactionScore * 0.2;

    // Satisfaction
    if (stats.averageSatisfaction > 0) {
      score += (stats.averageSatisfaction / 5) * 0.2;
    }

    return Math.min(score, 1);
  }
}
