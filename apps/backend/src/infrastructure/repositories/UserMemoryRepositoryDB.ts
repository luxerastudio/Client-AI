import { DatabaseConnection } from '../database/DatabaseConnection';

export interface UserPreference {
  userId: string;
  preferences: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptHistory {
  id: string;
  userId: string;
  prompt: string;
  response?: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  timestamp: Date;
  interactionType: string;
  satisfactionScore?: number;
  tokensUsed?: number;
}

export interface BehaviorPattern {
  id: string;
  userId: string;
  patternType: string;
  patternName: string;
  patternData: Record<string, any>;
  confidenceScore: number;
  frequency: number;
  lastDetected: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentPreference {
  id: string;
  userId: string;
  contentType: string;
  preferences: Record<string, any>;
  feedbackHistory: Array<{
    rating: number;
    feedback: string;
    aspects: string[];
    timestamp: Date;
  }>;
  averageRating: number;
  totalFeedback: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractionHistory {
  id: string;
  userId: string;
  interactionType: string;
  content: string;
  response?: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  timestamp: Date;
  satisfactionScore?: number;
  context?: Record<string, any>;
}

export interface AdaptationData {
  id: string;
  userId: string;
  adaptationType: string;
  originalContent: string;
  adaptedContent: string;
  adaptationReason?: string;
  effectivenessScore: number;
  appliedAt: Date;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface MemorySummary {
  id: string;
  userId: string;
  summaryType: string;
  summaryText: string;
  timePeriod?: string;
  keyInsights: string[];
  interactionCount: number;
  satisfactionAverage: number;
  createdAt: Date;
  expiresAt?: Date;
}

export class UserMemoryRepositoryDB {
  constructor(private db: DatabaseConnection) {}

  // User Preferences
  async saveUserPreferences(preferences: Omit<UserPreference, 'createdAt' | 'updatedAt'>): Promise<UserPreference> {
    const query = `
      INSERT INTO user_preferences (user_id, preferences)
      VALUES ($1, $2)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        preferences = $2,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [preferences.userId, JSON.stringify(preferences.preferences)]);
    return this.mapToUserPreference(result);
  }

  async getUserPreferences(userId: string): Promise<UserPreference | null> {
    const query = 'SELECT * FROM user_preferences WHERE user_id = $1';
    const result = await this.db.queryOne(query, [userId]);
    return result ? this.mapToUserPreference(result) : null;
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreference>): Promise<UserPreference | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.preferences) {
      fields.push(`preferences = $${paramIndex++}`);
      values.push(JSON.stringify(updates.preferences));
    }

    if (fields.length === 0) {
      return await this.getUserPreferences(userId);
    }

    const query = `
      UPDATE user_preferences 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    values.push(userId);

    const result = await this.db.queryOne(query, values);
    return result ? this.mapToUserPreference(result) : null;
  }

  // Prompt History
  async addPromptHistory(history: Omit<PromptHistory, 'id'>): Promise<PromptHistory> {
    const query = `
      INSERT INTO prompt_history (
        user_id, prompt, response, metadata, session_id, timestamp,
        interaction_type, satisfaction_score, tokens_used
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      history.userId,
      history.prompt,
      history.response,
      JSON.stringify(history.metadata || {}),
      history.sessionId,
      history.timestamp || new Date(),
      history.interactionType,
      history.satisfactionScore,
      history.tokensUsed
    ]);
    
    return this.mapToPromptHistory(result);
  }

  async getPromptHistory(userId: string, limit: number = 50): Promise<PromptHistory[]> {
    const query = `
      SELECT * FROM prompt_history 
      WHERE user_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `;
    
    const results = await this.db.query(query, [userId, limit]);
    return results.map(this.mapToPromptHistory);
  }

  async searchPromptHistory(userId: string, query: string): Promise<PromptHistory[]> {
    const searchQuery = `
      SELECT * FROM prompt_history 
      WHERE user_id = $1 
        AND (prompt ILIKE $2 OR response ILIKE $2)
      ORDER BY timestamp DESC 
      LIMIT 20
    `;
    
    const results = await this.db.query(searchQuery, [userId, `%${query}%`]);
    return results.map(this.mapToPromptHistory);
  }

  async analyzePromptTrends(userId: string): Promise<{
    frequentTopics: string[];
    commonPatterns: string[];
    evolution: string[];
    qualityTrends: number[];
  }> {
    const recentHistory = await this.getPromptHistory(userId, 100);
    
    // Extract topics (simplified keyword extraction)
    const frequentTopics = this.extractTopics(recentHistory);
    
    // Analyze patterns
    const commonPatterns = this.analyzePatterns(recentHistory);
    
    // Track evolution
    const evolution = this.trackEvolution(recentHistory);
    
    // Quality trends
    const qualityTrends = recentHistory
      .filter(h => h.satisfactionScore)
      .map(h => h.satisfactionScore!);

    return {
      frequentTopics,
      commonPatterns,
      evolution,
      qualityTrends
    };
  }

  // Behavior Patterns
  async saveBehaviorPattern(pattern: Omit<BehaviorPattern, 'id' | 'createdAt' | 'updatedAt'>): Promise<BehaviorPattern> {
    const query = `
      INSERT INTO behavior_patterns (
        user_id, pattern_type, pattern_name, pattern_data, confidence_score,
        frequency, last_detected
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      pattern.userId,
      pattern.patternType,
      pattern.patternName,
      JSON.stringify(pattern.patternData),
      pattern.confidenceScore,
      pattern.frequency,
      pattern.lastDetected || new Date()
    ]);
    
    return this.mapToBehaviorPattern(result);
  }

  async getBehaviorPatterns(userId: string, patternType?: string): Promise<BehaviorPattern[]> {
    let query = 'SELECT * FROM behavior_patterns WHERE user_id = $1';
    const params = [userId];
    
    if (patternType) {
      query += ' AND pattern_type = $2 ORDER BY confidence_score DESC';
      params.push(patternType);
    } else {
      query += ' ORDER BY confidence_score DESC';
    }
    
    const results = await this.db.query(query, params);
    return results.map(this.mapToBehaviorPattern);
  }

  // Content Preferences
  async saveContentPreference(preference: Omit<ContentPreference, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentPreference> {
    const query = `
      INSERT INTO content_preferences (
        user_id, content_type, preferences, feedback_history,
        average_rating, total_feedback
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, content_type)
      DO UPDATE SET
        preferences = $3,
        feedback_history = $4,
        average_rating = $5,
        total_feedback = $6,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      preference.userId,
      preference.contentType,
      JSON.stringify(preference.preferences),
      JSON.stringify(preference.feedbackHistory),
      preference.averageRating,
      preference.totalFeedback
    ]);
    
    return this.mapToContentPreference(result);
  }

  async getContentPreferences(userId: string, contentType?: string): Promise<ContentPreference[]> {
    let query = 'SELECT * FROM content_preferences WHERE user_id = $1';
    const params = [userId];
    
    if (contentType) {
      query += ' AND content_type = $2';
      params.push(contentType);
    }
    
    query += ' ORDER BY average_rating DESC';
    
    const results = await this.db.query(query, params);
    return results.map(this.mapToContentPreference);
  }

  // Interaction History
  async addInteraction(interaction: Omit<InteractionHistory, 'id'>): Promise<InteractionHistory> {
    const query = `
      INSERT INTO interaction_history (
        user_id, interaction_type, content, response, metadata,
        session_id, timestamp, satisfaction_score, context
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      interaction.userId,
      interaction.interactionType,
      interaction.content,
      interaction.response,
      JSON.stringify(interaction.metadata || {}),
      interaction.sessionId,
      interaction.timestamp || new Date(),
      interaction.satisfactionScore,
      JSON.stringify(interaction.context || {})
    ]);
    
    return this.mapToInteractionHistory(result);
  }

  async getInteractionHistory(userId: string, limit: number = 50): Promise<InteractionHistory[]> {
    const query = `
      SELECT * FROM interaction_history 
      WHERE user_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `;
    
    const results = await this.db.query(query, [userId, limit]);
    return results.map(this.mapToInteractionHistory);
  }

  async getInteractionsByType(userId: string, interactionType: string): Promise<InteractionHistory[]> {
    const query = `
      SELECT * FROM interaction_history 
      WHERE user_id = $1 AND interaction_type = $2
      ORDER BY timestamp DESC
      LIMIT 50
    `;
    
    const results = await this.db.query(query, [userId, interactionType]);
    return results.map(this.mapToInteractionHistory);
  }

  // Memory Summaries
  async saveMemorySummary(summary: Omit<MemorySummary, 'id' | 'createdAt'>): Promise<MemorySummary> {
    const query = `
      INSERT INTO memory_summaries (
        user_id, summary_type, summary_text, time_period, key_insights,
        interaction_count, satisfaction_average, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      summary.userId,
      summary.summaryType,
      summary.summaryText,
      summary.timePeriod,
      JSON.stringify(summary.keyInsights),
      summary.interactionCount,
      summary.satisfactionAverage,
      summary.expiresAt
    ]);
    
    return this.mapToMemorySummary(result);
  }

  async getMemorySummaries(userId: string, summaryType?: string): Promise<MemorySummary[]> {
    let query = 'SELECT * FROM memory_summaries WHERE user_id = $1';
    const params = [userId];
    
    if (summaryType) {
      query += ' AND summary_type = $2';
      params.push(summaryType);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const results = await this.db.query(query, params);
    return results.map(this.mapToMemorySummary);
  }

  // Advanced Queries
  async getUserMemoryStats(userId: string): Promise<{
    totalInteractions: number;
    totalPrompts: number;
    averageSatisfaction: number;
    mostUsedContentType: string;
    totalPatterns: number;
    lastActivity: Date;
  }> {
    const queries = await Promise.all([
      this.db.queryOne('SELECT COUNT(*) as count FROM interaction_history WHERE user_id = $1', [userId]),
      this.db.queryOne('SELECT COUNT(*) as count FROM prompt_history WHERE user_id = $1', [userId]),
      this.db.queryOne('SELECT AVG(satisfaction_score) as avg FROM prompt_history WHERE user_id = $1 AND satisfaction_score IS NOT NULL', [userId]),
      this.db.queryOne('SELECT content_type, COUNT(*) as count FROM content_preferences WHERE user_id = $1 GROUP BY content_type ORDER BY count DESC LIMIT 1', [userId]),
      this.db.queryOne('SELECT COUNT(*) as count FROM behavior_patterns WHERE user_id = $1', [userId]),
      this.db.queryOne('SELECT MAX(timestamp) as last_activity FROM prompt_history WHERE user_id = $1', [userId])
    ]);

    return {
      totalInteractions: parseInt(queries[0].count),
      totalPrompts: parseInt(queries[1].count),
      averageSatisfaction: parseFloat(queries[2].avg) || 0,
      mostUsedContentType: queries[3].content_type || 'none',
      totalPatterns: parseInt(queries[4].count),
      lastActivity: queries[5].last_activity || new Date()
    };
  }

  // Helper methods
  private extractTopics(history: PromptHistory[]): string[] {
    const topics: string[] = [];
    history.forEach(h => {
      const words = h.prompt.toLowerCase().split(/\s+/);
      const keywords = words.filter(word => word.length > 4);
      topics.push(...keywords);
    });
    
    const topicCounts = topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic]) => topic);
  }

  private analyzePatterns(history: PromptHistory[]): string[] {
    const patterns: string[] = [];
    
    // Time patterns
    const hourCounts = history.reduce((acc, h) => {
      const hour = h.timestamp.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const peakHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (peakHour) {
      patterns.push(`Most active at ${peakHour[0]}:00`);
    }
    
    // Length patterns
    const avgLength = history.reduce((sum, h) => sum + h.prompt.length, 0) / history.length;
    patterns.push(`Average prompt length: ${Math.round(avgLength)} characters`);
    
    return patterns;
  }

  private trackEvolution(history: PromptHistory[]): string[] {
    if (history.length < 2) return [];
    
    const evolution: string[] = [];
    const recent = history.slice(0, 10);
    const older = history.slice(10, 20);
    
    if (recent.length > 0 && older.length > 0) {
      const recentAvgLength = recent.reduce((sum, h) => sum + h.prompt.length, 0) / recent.length;
      const olderAvgLength = older.reduce((sum, h) => sum + h.prompt.length, 0) / older.length;
      
      if (recentAvgLength > olderAvgLength * 1.2) {
        evolution.push('Prompts becoming more detailed');
      } else if (recentAvgLength < olderAvgLength * 0.8) {
        evolution.push('Prompts becoming more concise');
      }
    }
    
    return evolution;
  }

  // Mapping methods
  private mapToUserPreference(data: any): UserPreference {
    return {
      userId: data.user_id,
      preferences: typeof data.preferences === 'string' ? JSON.parse(data.preferences) : data.preferences,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapToPromptHistory(data: any): PromptHistory {
    return {
      id: data.id,
      userId: data.user_id,
      prompt: data.prompt,
      response: data.response,
      metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
      sessionId: data.session_id,
      timestamp: data.timestamp,
      interactionType: data.interaction_type,
      satisfactionScore: data.satisfaction_score,
      tokensUsed: data.tokens_used
    };
  }

  private mapToBehaviorPattern(data: any): BehaviorPattern {
    return {
      id: data.id,
      userId: data.user_id,
      patternType: data.pattern_type,
      patternName: data.pattern_name,
      patternData: typeof data.pattern_data === 'string' ? JSON.parse(data.pattern_data) : data.pattern_data,
      confidenceScore: data.confidence_score,
      frequency: data.frequency,
      lastDetected: data.last_detected,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapToContentPreference(data: any): ContentPreference {
    return {
      id: data.id,
      userId: data.user_id,
      contentType: data.content_type,
      preferences: typeof data.preferences === 'string' ? JSON.parse(data.preferences) : data.preferences,
      feedbackHistory: typeof data.feedback_history === 'string' ? JSON.parse(data.feedback_history) : data.feedback_history,
      averageRating: data.average_rating,
      totalFeedback: data.total_feedback,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapToInteractionHistory(data: any): InteractionHistory {
    return {
      id: data.id,
      userId: data.user_id,
      interactionType: data.interaction_type,
      content: data.content,
      response: data.response,
      metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
      sessionId: data.session_id,
      timestamp: data.timestamp,
      satisfactionScore: data.satisfaction_score,
      context: typeof data.context === 'string' ? JSON.parse(data.context) : data.context
    };
  }

  private mapToMemorySummary(data: any): MemorySummary {
    return {
      id: data.id,
      userId: data.user_id,
      summaryType: data.summary_type,
      summaryText: data.summary_text,
      timePeriod: data.time_period,
      keyInsights: typeof data.key_insights === 'string' ? JSON.parse(data.key_insights) : data.key_insights,
      interactionCount: data.interaction_count,
      satisfactionAverage: data.satisfaction_average,
      createdAt: data.created_at,
      expiresAt: data.expires_at
    };
  }
}
