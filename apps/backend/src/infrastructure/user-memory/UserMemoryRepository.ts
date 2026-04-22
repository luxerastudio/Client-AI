import { v4 as uuidv4 } from 'uuid';
import { 
  IUserMemoryRepository,
  IUserMemoryValidator
} from '@/domain/user-memory/services/IUserMemoryService';
import { 
  UserPreference, 
  PromptHistory, 
  BehaviorPattern, 
  ContentPreference, 
  InteractionHistory, 
  AdaptationData,
  MemoryType,
  InteractionType,
  AdaptationType,
  UserMemoryConfig
} from '@/domain/user-memory/entities/UserMemory';

// In-memory repository implementation (can be replaced with database implementation)
export class UserMemoryRepository implements IUserMemoryRepository {
  private preferences: Map<string, UserPreference> = new Map();
  private promptHistory: Map<string, PromptHistory[]> = new Map();
  private behaviorPatterns: Map<string, BehaviorPattern[]> = new Map();
  private contentPreferences: Map<string, Map<string, ContentPreference>> = new Map();
  private interactionHistory: Map<string, InteractionHistory[]> = new Map();
  private adaptations: Map<string, AdaptationData[]> = new Map();
  private configs: Map<string, UserMemoryConfig> = new Map();
  private validator?: IUserMemoryValidator;

  constructor(validator?: IUserMemoryValidator) {
    this.validator = validator;
  }

  // User Preferences
  async saveUserPreferences(preferences: UserPreference): Promise<void> {
    if (this.validator) {
      const validation = await this.validator.validatePreferences(preferences);
      if (!validation.valid) {
        throw new Error(`Invalid preferences: ${validation.errors.join(', ')}`);
      }
    }
    
    this.preferences.set(preferences.userId, preferences);
  }

  async getUserPreferences(userId: string): Promise<UserPreference | null> {
    return this.preferences.get(userId) || null;
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreference>): Promise<void> {
    const existing = this.preferences.get(userId);
    if (!existing) {
      throw new Error(`User preferences not found: ${userId}`);
    }

    const updated = { 
      ...existing, 
      ...updates,
      metadata: {
        ...existing.metadata,
        updatedAt: new Date()
      }
    };
    
    if (this.validator) {
      const validation = await this.validator.validatePreferences(updated);
      if (!validation.valid) {
        throw new Error(`Invalid preferences update: ${validation.errors.join(', ')}`);
      }
    }
    
    this.preferences.set(userId, updated);
  }

  async deleteUserPreferences(userId: string): Promise<void> {
    const exists = this.preferences.has(userId);
    if (!exists) {
      throw new Error(`User preferences not found: ${userId}`);
    }
    
    this.preferences.delete(userId);
  }

  // Prompt History
  async savePromptHistory(history: PromptHistory): Promise<void> {
    if (this.validator) {
      const validation = await this.validator.validatePromptHistory(history);
      if (!validation.valid) {
        throw new Error(`Invalid prompt history: ${validation.errors.join(', ')}`);
      }
    }
    
    const userHistory = this.promptHistory.get(history.userId) || [];
    userHistory.push(history);
    
    // Keep only the most recent entries (configurable limit)
    const config = await this.getUserConfig(history.userId);
    const maxHistory = config?.maxPromptHistory || 1000;
    
    if (userHistory.length > maxHistory) {
      userHistory.splice(0, userHistory.length - maxHistory);
    }
    
    this.promptHistory.set(history.userId, userHistory);
  }

  async getPromptHistory(userId: string, limit?: number): Promise<PromptHistory[]> {
    const history = this.promptHistory.get(userId) || [];
    return limit ? history.slice(-limit) : history;
  }

  async searchPromptHistory(userId: string, query: string): Promise<PromptHistory[]> {
    const history = this.promptHistory.get(userId) || [];
    const queryLower = query.toLowerCase();
    
    return history.filter(item => 
      item.prompt.toLowerCase().includes(queryLower) ||
      item.response?.toLowerCase().includes(queryLower) ||
      item.extractedInsights?.topics.some(topic => topic.toLowerCase().includes(queryLower))
    );
  }

  async deletePromptHistory(userId: string, beforeDate?: Date): Promise<void> {
    const history = this.promptHistory.get(userId) || [];
    
    if (beforeDate) {
      const filtered = history.filter(item => item.metadata.timestamp >= beforeDate);
      this.promptHistory.set(userId, filtered);
    } else {
      this.promptHistory.delete(userId);
    }
  }

  // Behavior Patterns
  async saveBehaviorPattern(pattern: BehaviorPattern): Promise<void> {
    if (this.validator) {
      const validation = await this.validator.validateBehaviorPattern(pattern);
      if (!validation.valid) {
        throw new Error(`Invalid behavior pattern: ${validation.errors.join(', ')}`);
      }
    }
    
    const userPatterns = this.behaviorPatterns.get(pattern.userId) || [];
    
    // Remove existing pattern with same ID if it exists
    const existingIndex = userPatterns.findIndex(p => p.id === pattern.id);
    if (existingIndex >= 0) {
      userPatterns[existingIndex] = pattern;
    } else {
      userPatterns.push(pattern);
    }
    
    this.behaviorPatterns.set(pattern.userId, userPatterns);
  }

  async getBehaviorPatterns(userId: string, patternType?: string): Promise<BehaviorPattern[]> {
    const patterns = this.behaviorPatterns.get(userId) || [];
    return patternType 
      ? patterns.filter(p => p.patternType === patternType)
      : patterns;
  }

  async updateBehaviorPattern(patternId: string, updates: Partial<BehaviorPattern>): Promise<void> {
    // Find the pattern across all users
    for (const [userId, patterns] of this.behaviorPatterns.entries()) {
      const index = patterns.findIndex(p => p.id === patternId);
      if (index >= 0) {
        const updated = { ...patterns[index], ...updates };
        
        if (this.validator) {
          const validation = await this.validator.validateBehaviorPattern(updated);
          if (!validation.valid) {
            throw new Error(`Invalid pattern update: ${validation.errors.join(', ')}`);
          }
        }
        
        patterns[index] = updated;
        this.behaviorPatterns.set(userId, patterns);
        return;
      }
    }
    
    throw new Error(`Behavior pattern not found: ${patternId}`);
  }

  async deleteBehaviorPattern(patternId: string): Promise<void> {
    for (const [userId, patterns] of this.behaviorPatterns.entries()) {
      const index = patterns.findIndex(p => p.id === patternId);
      if (index >= 0) {
        patterns.splice(index, 1);
        this.behaviorPatterns.set(userId, patterns);
        return;
      }
    }
    
    throw new Error(`Behavior pattern not found: ${patternId}`);
  }

  // Content Preferences
  async saveContentPreferences(preference: ContentPreference): Promise<void> {
    if (this.validator) {
      const validation = await this.validator.validateContentPreferences(preference);
      if (!validation.valid) {
        throw new Error(`Invalid content preferences: ${validation.errors.join(', ')}`);
      }
    }
    
    const userPreferences = this.contentPreferences.get(preference.userId) || new Map();
    userPreferences.set(preference.contentType, preference);
    this.contentPreferences.set(preference.userId, userPreferences);
  }

  async getContentPreferences(userId: string, contentType?: string): Promise<ContentPreference[]> {
    const userPreferences = this.contentPreferences.get(userId) || new Map();
    
    if (contentType) {
      const preference = userPreferences.get(contentType);
      return preference ? [preference] : [];
    }
    
    return Array.from(userPreferences.values());
  }

  async updateContentPreferences(userId: string, contentType: string, updates: Partial<ContentPreference>): Promise<void> {
    const userPreferences = this.contentPreferences.get(userId);
    if (!userPreferences || !userPreferences.has(contentType)) {
      throw new Error(`Content preferences not found for user: ${userId}, type: ${contentType}`);
    }

    const existing = userPreferences.get(contentType)!;
    const updated = { ...existing, ...updates };
    
    if (this.validator) {
      const validation = await this.validator.validateContentPreferences(updated);
      if (!validation.valid) {
        throw new Error(`Invalid content preferences update: ${validation.errors.join(', ')}`);
      }
    }
    
    userPreferences.set(contentType, updated);
    this.contentPreferences.set(userId, userPreferences);
  }

  async deleteContentPreferences(userId: string, contentType?: string): Promise<void> {
    const userPreferences = this.contentPreferences.get(userId);
    if (!userPreferences) {
      throw new Error(`Content preferences not found for user: ${userId}`);
    }
    
    if (contentType) {
      if (!userPreferences.has(contentType)) {
        throw new Error(`Content preferences not found for user: ${userId}, type: ${contentType}`);
      }
      userPreferences.delete(contentType);
    } else {
      this.contentPreferences.delete(userId);
    }
  }

  // Interaction History
  async saveInteraction(interaction: InteractionHistory): Promise<void> {
    if (this.validator) {
      const validation = await this.validator.validateInteraction(interaction);
      if (!validation.valid) {
        throw new Error(`Invalid interaction: ${validation.errors.join(', ')}`);
      }
    }
    
    const userInteractions = this.interactionHistory.get(interaction.userId) || [];
    userInteractions.push(interaction);
    
    // Keep only the most recent entries (configurable limit)
    const config = await this.getUserConfig(interaction.userId);
    const maxHistory = config?.maxInteractionHistory || 1000;
    
    if (userInteractions.length > maxHistory) {
      userInteractions.splice(0, userInteractions.length - maxHistory);
    }
    
    this.interactionHistory.set(interaction.userId, userInteractions);
  }

  async getInteractionHistory(userId: string, limit?: number): Promise<InteractionHistory[]> {
    const history = this.interactionHistory.get(userId) || [];
    return limit ? history.slice(-limit) : history;
  }

  async getInteractionsByType(userId: string, interactionType: InteractionType): Promise<InteractionHistory[]> {
    const history = this.interactionHistory.get(userId) || [];
    return history.filter(item => item.interactionType === interactionType);
  }

  async deleteInteractionHistory(userId: string, beforeDate?: Date): Promise<void> {
    const history = this.interactionHistory.get(userId) || [];
    
    if (beforeDate) {
      const filtered = history.filter(item => item.timestamp >= beforeDate);
      this.interactionHistory.set(userId, filtered);
    } else {
      this.interactionHistory.delete(userId);
    }
  }

  // Adaptation Data
  async saveAdaptation(adaptation: AdaptationData): Promise<void> {
    if (this.validator) {
      const validation = await this.validator.validateAdaptation(adaptation);
      if (!validation.valid) {
        throw new Error(`Invalid adaptation: ${validation.errors.join(', ')}`);
      }
    }
    
    const userAdaptations = this.adaptations.get(adaptation.userId) || [];
    userAdaptations.push(adaptation);
    
    // Keep only the most recent entries (configurable limit)
    const config = await this.getUserConfig(adaptation.userId);
    const maxHistory = config?.maxInteractionHistory || 1000;
    
    if (userAdaptations.length > maxHistory) {
      userAdaptations.splice(0, userAdaptations.length - maxHistory);
    }
    
    this.adaptations.set(adaptation.userId, userAdaptations);
  }

  async getAdaptationHistory(userId: string): Promise<AdaptationData[]> {
    return this.adaptations.get(userId) || [];
  }

  async getAdaptationsByType(userId: string, adaptationType: AdaptationType): Promise<AdaptationData[]> {
    const adaptations = this.adaptations.get(userId) || [];
    return adaptations.filter(item => item.adaptationType === adaptationType);
  }

  async deleteAdaptationHistory(userId: string, beforeDate?: Date): Promise<void> {
    const adaptations = this.adaptations.get(userId) || [];
    
    if (beforeDate) {
      const filtered = adaptations.filter(item => item.timestamp >= beforeDate);
      this.adaptations.set(userId, filtered);
    } else {
      this.adaptations.delete(userId);
    }
  }

  // Analytics and Aggregation
  async getUserStats(userId: string): Promise<{
    totalInteractions: number;
    totalAdaptations: number;
    averageSatisfaction: number;
    mostUsedContentType: string;
    adaptationEffectiveness: number;
    memorySize: number;
    lastActivity: Date;
  }> {
    const interactions = this.interactionHistory.get(userId) || [];
    const adaptations = this.adaptations.get(userId) || [];
    const contentPreferences = this.contentPreferences.get(userId) || new Map();
    
    // Calculate average satisfaction
    const satisfactionScores = interactions
      .filter(i => i.outcome?.satisfaction)
      .map(i => i.outcome!.satisfaction!);
    const averageSatisfaction = satisfactionScores.length > 0
      ? satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length
      : 0;
    
    // Calculate adaptation effectiveness
    const effectivenessScores = adaptations.map(a => a.effectiveness);
    const adaptationEffectiveness = effectivenessScores.length > 0
      ? effectivenessScores.reduce((sum, score) => sum + score, 0) / effectivenessScores.length
      : 0;
    
    // Find most used content type
    const contentTypeUsage = new Map<string, number>();
    interactions.forEach(interaction => {
      const contentType = interaction.metadata?.contentType;
      if (contentType) {
        contentTypeUsage.set(contentType, (contentTypeUsage.get(contentType) || 0) + 1);
      }
    });
    
    const mostUsedContentType = Array.from(contentTypeUsage.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '';
    
    // Calculate memory size (rough estimation)
    const memorySize = 
      interactions.length * 1000 + // ~1KB per interaction
      adaptations.length * 500 +   // ~0.5KB per adaptation
      contentPreferences.size * 300; // ~0.3KB per content preference
    
    // Find last activity
    const allTimestamps = [
      ...interactions.map(i => i.timestamp),
      ...adaptations.map(a => a.timestamp)
    ];
    const lastActivity = allTimestamps.length > 0
      ? new Date(Math.max(...allTimestamps.map(t => t.getTime())))
      : new Date(0);
    
    return {
      totalInteractions: interactions.length,
      totalAdaptations: adaptations.length,
      averageSatisfaction,
      mostUsedContentType,
      adaptationEffectiveness,
      memorySize,
      lastActivity
    };
  }

  async getSystemStats(): Promise<{
    totalUsers: number;
    totalInteractions: number;
    totalAdaptations: number;
    averageSatisfaction: number;
    mostActiveUsers: string[];
    popularContentTypes: string[];
  }> {
    const allUserIds = new Set([
      ...this.preferences.keys(),
      ...this.interactionHistory.keys()
    ]);
    
    let totalInteractions = 0;
    let totalSatisfaction = 0;
    let satisfactionCount = 0;
    const userActivity = new Map<string, number>();
    const contentTypeUsage = new Map<string, number>();
    
    for (const userId of allUserIds) {
      const interactions = this.interactionHistory.get(userId) || [];
      totalInteractions += interactions.length;
      userActivity.set(userId, interactions.length);
      
      interactions.forEach(interaction => {
        if (interaction.outcome?.satisfaction) {
          totalSatisfaction += interaction.outcome.satisfaction;
          satisfactionCount++;
        }
        
        const contentType = interaction.metadata?.contentType;
        if (contentType) {
          contentTypeUsage.set(contentType, (contentTypeUsage.get(contentType) || 0) + 1);
        }
      });
    }
    
    const averageSatisfaction = satisfactionCount > 0
      ? totalSatisfaction / satisfactionCount
      : 0;
    
    const mostActiveUsers = Array.from(userActivity.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId]) => userId);
    
    const popularContentTypes = Array.from(contentTypeUsage.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([contentType]) => contentType);
    
    return {
      totalUsers: allUserIds.size,
      totalInteractions,
      totalAdaptations: Array.from(this.adaptations.values()).reduce((sum, adaptations) => sum + adaptations.length, 0),
      averageSatisfaction,
      mostActiveUsers,
      popularContentTypes
    };
  }

  // Search Operations
  async searchUsers(criteria: {
    preferences?: Partial<UserPreference>;
    patterns?: string[];
    activityRange?: {
      start: Date;
      end: Date;
    };
  }): Promise<string[]> {
    const matchingUsers: string[] = [];
    
    for (const userId of this.preferences.keys()) {
      let matches = true;
      
      // Check preferences
      if (criteria.preferences) {
        const userPrefs = this.preferences.get(userId);
        if (!userPrefs) {
          matches = false;
        } else {
          for (const [key, value] of Object.entries(criteria.preferences)) {
            if (userPrefs.preferences[key as keyof typeof userPrefs.preferences] !== value) {
              matches = false;
              break;
            }
          }
        }
      }
      
      // Check patterns
      if (matches && criteria.patterns && criteria.patterns.length > 0) {
        const userPatterns = this.behaviorPatterns.get(userId) || [];
        const userPatternTypes = userPatterns.map(p => p.patternType);
        matches = criteria.patterns.some(pattern => userPatternTypes.includes(pattern));
      }
      
      // Check activity range
      if (matches && criteria.activityRange) {
        const interactions = this.interactionHistory.get(userId) || [];
        const userActivity = interactions.some(i => 
          i.timestamp >= criteria.activityRange!.start && i.timestamp <= criteria.activityRange!.end
        );
        matches = userActivity;
      }
      
      if (matches) {
        matchingUsers.push(userId);
      }
    }
    
    return matchingUsers;
  }

  async findSimilarUsers(userId: string, limit?: number): Promise<string[]> {
    const targetPrefs = this.preferences.get(userId);
    if (!targetPrefs) {
      return [];
    }
    
    const similarities = new Map<string, number>();
    
    for (const [otherUserId, otherPrefs] of this.preferences.entries()) {
      if (otherUserId === userId) continue;
      
      let similarity = 0;
      let factors = 0;
      
      // Compare preferences
      for (const key of Object.keys(targetPrefs.preferences)) {
        const targetValue = targetPrefs.preferences[key as keyof typeof targetPrefs.preferences];
        const otherValue = otherPrefs.preferences[key as keyof typeof otherPrefs.preferences];
        
        if (targetValue === otherValue) {
          similarity += 1;
        }
        factors++;
      }
      
      // Compare behavior patterns
      const targetPatterns = this.behaviorPatterns.get(userId) || [];
      const otherPatterns = this.behaviorPatterns.get(otherUserId) || [];
      
      const targetPatternTypes = new Set(targetPatterns.map(p => p.patternType));
      const otherPatternTypes = new Set(otherPatterns.map(p => p.patternType));
      
      const intersection = new Set([...targetPatternTypes].filter(x => otherPatternTypes.has(x)));
      const union = new Set([...targetPatternTypes, ...otherPatternTypes]);
      
      if (union.size > 0) {
        similarity += (intersection.size / union.size) * 2;
        factors += 2;
      }
      
      if (factors > 0) {
        similarities.set(otherUserId, similarity / factors);
      }
    }
    
    return Array.from(similarities.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit || 10)
      .map(([userId]) => userId);
  }

  // Configuration Management
  async saveUserConfig(userId: string, config: UserMemoryConfig): Promise<void> {
    this.configs.set(userId, config);
  }

  async getUserConfig(userId: string): Promise<UserMemoryConfig | null> {
    return this.configs.get(userId) || null;
  }

  // Cleanup Operations
  async cleanupOldMemory(userId: string, olderThanDays: number): Promise<{
    deletedItems: number;
    freedSpace: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let deletedItems = 0;
    let freedSpace = 0;
    
    // Cleanup prompt history
    const promptHistory = this.promptHistory.get(userId) || [];
    const originalPromptCount = promptHistory.length;
    const filteredPromptHistory = promptHistory.filter(item => item.metadata.timestamp >= cutoffDate);
    this.promptHistory.set(userId, filteredPromptHistory);
    deletedItems += originalPromptCount - filteredPromptHistory.length;
    freedSpace += (originalPromptCount - filteredPromptHistory.length) * 1000;
    
    // Cleanup interaction history
    const interactions = this.interactionHistory.get(userId) || [];
    const originalInteractionCount = interactions.length;
    const filteredInteractions = interactions.filter(item => item.timestamp >= cutoffDate);
    this.interactionHistory.set(userId, filteredInteractions);
    deletedItems += originalInteractionCount - filteredInteractions.length;
    freedSpace += (originalInteractionCount - filteredInteractions.length) * 1000;
    
    // Cleanup adaptations
    const adaptations = this.adaptations.get(userId) || [];
    const originalAdaptationCount = adaptations.length;
    const filteredAdaptations = adaptations.filter(item => item.timestamp >= cutoffDate);
    this.adaptations.set(userId, filteredAdaptations);
    deletedItems += originalAdaptationCount - filteredAdaptations.length;
    freedSpace += (originalAdaptationCount - filteredAdaptations.length) * 500;
    
    return { deletedItems, freedSpace };
  }

  // Batch Operations
  async batchSave(data: {
    preferences?: UserPreference[];
    promptHistory?: PromptHistory[];
    patterns?: BehaviorPattern[];
    contentPreferences?: ContentPreference[];
    interactions?: InteractionHistory[];
    adaptations?: AdaptationData[];
  }): Promise<void> {
    if (data.preferences) {
      for (const preferences of data.preferences) {
        await this.saveUserPreferences(preferences);
      }
    }
    
    if (data.promptHistory) {
      for (const history of data.promptHistory) {
        await this.savePromptHistory(history);
      }
    }
    
    if (data.patterns) {
      for (const pattern of data.patterns) {
        await this.saveBehaviorPattern(pattern);
      }
    }
    
    if (data.contentPreferences) {
      for (const preference of data.contentPreferences) {
        await this.saveContentPreferences(preference);
      }
    }
    
    if (data.interactions) {
      for (const interaction of data.interactions) {
        await this.saveInteraction(interaction);
      }
    }
    
    if (data.adaptations) {
      for (const adaptation of data.adaptations) {
        await this.saveAdaptation(adaptation);
      }
    }
  }
}
