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
  UserMemoryConfig,
  UserMemoryContext,
  PersonalizationResult
} from '../entities/UserMemory';

export interface IUserMemoryService {
  // User Preferences Management
  getUserPreferences(userId: string): Promise<UserPreference | null>;
  updateUserPreferences(userId: string, preferences: Partial<UserPreference>): Promise<void>;
  createUserPreferences(userId: string, preferences: Partial<UserPreference>): Promise<UserPreference>;
  deleteUserPreferences(userId: string): Promise<void>;
  
  // Prompt History Management
  addPromptHistory(history: Omit<PromptHistory, 'id'>): Promise<void>;
  getPromptHistory(userId: string, limit?: number): Promise<PromptHistory[]>;
  searchPromptHistory(userId: string, query: string): Promise<PromptHistory[]>;
  analyzePromptTrends(userId: string): Promise<{
    frequentTopics: string[];
    commonPatterns: string[];
    evolution: string[];
    qualityTrends: number[];
  }>;
  deletePromptHistory(userId: string, beforeDate?: Date): Promise<void>;
  
  // Behavior Pattern Detection
  detectBehaviorPatterns(userId: string): Promise<BehaviorPattern[]>;
  updateBehaviorPattern(patternId: string, updates: Partial<BehaviorPattern>): Promise<void>;
  getBehaviorPatterns(userId: string, patternType?: string): Promise<BehaviorPattern[]>;
  deleteBehaviorPattern(patternId: string): Promise<void>;
  
  // Content Preferences
  getContentPreferences(userId: string, contentType?: string): Promise<ContentPreference[]>;
  updateContentPreferences(userId: string, contentType: string, preferences: Partial<ContentPreference>): Promise<void>;
  addContentFeedback(userId: string, contentType: string, feedback: {
    rating: number;
    feedback: string;
    aspects: string[];
  }): Promise<void>;
  deleteContentPreferences(userId: string, contentType?: string): Promise<void>;
  
  // Interaction History
  addInteraction(interaction: Omit<InteractionHistory, 'id'>): Promise<void>;
  getInteractionHistory(userId: string, limit?: number): Promise<InteractionHistory[]>;
  getInteractionsByType(userId: string, interactionType: InteractionType): Promise<InteractionHistory[]>;
  deleteInteractionHistory(userId: string, beforeDate?: Date): Promise<void>;
  
  // Adaptation Data
  addAdaptation(adaptation: Omit<AdaptationData, 'id'>): Promise<void>;
  getAdaptationHistory(userId: string): Promise<AdaptationData[]>;
  getAdaptationsByType(userId: string, adaptationType: AdaptationType): Promise<AdaptationData[]>;
  deleteAdaptationHistory(userId: string, beforeDate?: Date): Promise<void>;
  
  // Personalization Core
  personalizeContent(userId: string, content: string, context?: Record<string, any>): Promise<PersonalizationResult>;
  adaptPrompt(userId: string, prompt: string, context?: Record<string, any>): Promise<PersonalizationResult>;
  shouldPersonalize(userId: string, context?: Record<string, any>): Promise<boolean>;
  
  // Advanced Analytics
  getUserInsights(userId: string): Promise<{
    preferences: UserPreference;
    patterns: BehaviorPattern[];
    trends: {
      topicTrends: string[];
      styleEvolution: string[];
      satisfactionTrend: number[];
      adaptationTrends: number[];
    };
    recommendations: string[];
    personalizationScore: number;
  }>;
  
  getPersonalizationScore(userId: string): Promise<{
    score: number;
    factors: {
      preferenceStrength: number;
      patternConsistency: number;
      adaptationEffectiveness: number;
      userSatisfaction: number;
      interactionFrequency: number;
    };
    improvementAreas: string[];
  }>;
  
  // Memory Management
  getUserMemoryStats(userId: string): Promise<{
    totalInteractions: number;
    totalAdaptations: number;
    averageSatisfaction: number;
    mostUsedContentType: string;
    adaptationEffectiveness: number;
    memorySize: number;
    lastActivity: Date;
  }>;
  
  cleanupOldMemory(userId: string, olderThanDays?: number): Promise<{
    deletedItems: number;
    freedSpace: number;
  }>;
  
  // Configuration
  updateConfig(userId: string, config: Partial<UserMemoryConfig>): Promise<void>;
  getConfig(userId: string): Promise<UserMemoryConfig>;

  // Initialization
  initialize(config: UserMemoryConfig): Promise<void>;
  
  // Batch Operations
  batchUpdatePreferences(updates: Array<{
    userId: string;
    preferences: Partial<UserPreference>;
  }>): Promise<void>;
  
  batchAddInteractions(interactions: Omit<InteractionHistory, 'id'>[]): Promise<void>;
  
  // Search and Discovery
  searchUsers(criteria: {
    preferences?: Partial<UserPreference>;
    patterns?: string[];
    activityRange?: {
      start: Date;
      end: Date;
    };
  }): Promise<string[]>;
  
  findSimilarUsers(userId: string, limit?: number): Promise<string[]>;
  
  // Export/Import
  exportUserData(userId: string): Promise<{
    preferences: UserPreference;
    promptHistory: PromptHistory[];
    patterns: BehaviorPattern[];
    contentPreferences: ContentPreference[];
    interactions: InteractionHistory[];
    adaptations: AdaptationData[];
  }>;
  
  importUserData(userId: string, data: {
    preferences?: UserPreference;
    promptHistory?: PromptHistory[];
    patterns?: BehaviorPattern[];
    contentPreferences?: ContentPreference[];
    interactions?: InteractionHistory[];
    adaptations?: AdaptationData[];
  }): Promise<void>;
}

export interface IUserMemoryRepository {
  // Core CRUD Operations
  saveUserPreferences(preferences: UserPreference): Promise<void>;
  getUserPreferences(userId: string): Promise<UserPreference | null>;
  updateUserPreferences(userId: string, updates: Partial<UserPreference>): Promise<void>;
  deleteUserPreferences(userId: string): Promise<void>;
  
  savePromptHistory(history: PromptHistory): Promise<void>;
  getPromptHistory(userId: string, limit?: number): Promise<PromptHistory[]>;
  searchPromptHistory(userId: string, query: string): Promise<PromptHistory[]>;
  deletePromptHistory(userId: string, beforeDate?: Date): Promise<void>;
  
  saveBehaviorPattern(pattern: BehaviorPattern): Promise<void>;
  getBehaviorPatterns(userId: string, patternType?: string): Promise<BehaviorPattern[]>;
  updateBehaviorPattern(patternId: string, updates: Partial<BehaviorPattern>): Promise<void>;
  deleteBehaviorPattern(patternId: string): Promise<void>;
  
  saveContentPreferences(preference: ContentPreference): Promise<void>;
  getContentPreferences(userId: string, contentType?: string): Promise<ContentPreference[]>;
  updateContentPreferences(userId: string, contentType: string, updates: Partial<ContentPreference>): Promise<void>;
  deleteContentPreferences(userId: string, contentType?: string): Promise<void>;
  
  saveInteraction(interaction: InteractionHistory): Promise<void>;
  getInteractionHistory(userId: string, limit?: number): Promise<InteractionHistory[]>;
  getInteractionsByType(userId: string, interactionType: InteractionType): Promise<InteractionHistory[]>;
  deleteInteractionHistory(userId: string, beforeDate?: Date): Promise<void>;
  
  saveAdaptation(adaptation: AdaptationData): Promise<void>;
  getAdaptationHistory(userId: string): Promise<AdaptationData[]>;
  getAdaptationsByType(userId: string, adaptationType: AdaptationType): Promise<AdaptationData[]>;
  deleteAdaptationHistory(userId: string, beforeDate?: Date): Promise<void>;
  
  // Analytics and Aggregation
  getUserStats(userId: string): Promise<{
    totalInteractions: number;
    totalAdaptations: number;
    averageSatisfaction: number;
    mostUsedContentType: string;
    adaptationEffectiveness: number;
    memorySize: number;
    lastActivity: Date;
  }>;
  
  getSystemStats(): Promise<{
    totalUsers: number;
    totalInteractions: number;
    totalAdaptations: number;
    averageSatisfaction: number;
    mostActiveUsers: string[];
    popularContentTypes: string[];
  }>;
  
  // Search Operations
  searchUsers(criteria: {
    preferences?: Partial<UserPreference>;
    patterns?: string[];
    activityRange?: {
      start: Date;
      end: Date;
    };
  }): Promise<string[]>;
  
  findSimilarUsers(userId: string, limit?: number): Promise<string[]>;
  
  // Configuration Management
  saveUserConfig(userId: string, config: UserMemoryConfig): Promise<void>;
  getUserConfig(userId: string): Promise<UserMemoryConfig | null>;
  
  // Cleanup Operations
  cleanupOldMemory(userId: string, olderThanDays: number): Promise<{
    deletedItems: number;
    freedSpace: number;
  }>;
  
  // Batch Operations
  batchSave(data: {
    preferences?: UserPreference[];
    promptHistory?: PromptHistory[];
    patterns?: BehaviorPattern[];
    contentPreferences?: ContentPreference[];
    interactions?: InteractionHistory[];
    adaptations?: AdaptationData[];
  }): Promise<void>;
}

export interface IPatternDetector {
  detectPatterns(interactions: InteractionHistory[]): Promise<BehaviorPattern[]>;
  analyzePromptPatterns(prompts: PromptHistory[]): Promise<{
    frequentTopics: string[];
    commonStructures: string[];
    stylePreferences: string[];
    evolution: string[];
    complexity: string;
    intent: string;
  }>;
  detectAdaptationOpportunities(userId: string): Promise<{
    opportunities: Array<{
      type: AdaptationType;
      currentPattern: string;
      suggestedAdaptation: string;
      confidence: number;
      reasoning: string;
    }>;
  }>;
  
  analyzeBehaviorEvolution(userId: string, timeRange: {
    start: Date;
    end: Date;
  }): Promise<{
    evolution: string[];
    trends: string[];
    predictions: string[];
  }>;
  
  extractFeatures(content: string): Promise<{
    topics: string[];
    entities: string[];
    sentiment: string;
    complexity: string;
    style: string;
    structure: string[];
  }>;
}

export interface IContentPersonalizer {
  personalizeContent(
    content: string,
    preferences: UserPreference,
    patterns: BehaviorPattern[],
    context?: Record<string, any>
  ): Promise<PersonalizationResult>;
  
  adaptPrompt(
    prompt: string,
    preferences: UserPreference,
    patterns: BehaviorPattern[],
    context?: Record<string, any>
  ): Promise<PersonalizationResult>;
  
  generatePersonalizationInstructions(
    preferences: UserPreference,
    patterns: BehaviorPattern[]
  ): Promise<string>;
  
  shouldPersonalize(userId: string, context?: Record<string, any>): Promise<{
    shouldPersonalize: boolean;
    confidence: number;
    reasoning: string;
  }>;
  
  evaluatePersonalization(
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
  }>;
}

export interface IAdaptationEngine {
  shouldAdapt(userId: string, context: Record<string, any>): Promise<{
    shouldAdapt: boolean;
    adaptationType: AdaptationType;
    confidence: number;
    reasoning: string;
  }>;
  
  determineAdaptationType(
    userId: string,
    content: string,
    context: Record<string, any>
  ): Promise<{
    adaptationType: AdaptationType;
    confidence: number;
    reasoning: string;
  }>;
  
  performAdaptation(
    userId: string,
    content: string,
    adaptationType: AdaptationType,
    context: Record<string, any>
  ): Promise<PersonalizationResult>;
  
  evaluateAdaptation(
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
  }>;
  
  getAdaptationHistory(userId: string): Promise<AdaptationData[]>;
  
  learnFromFeedback(
    userId: string,
    adaptationType: AdaptationType,
    feedback: {
      rating: number;
      comments: string;
      effectiveness: number;
    }
  ): Promise<void>;
}

export interface IMemoryAnalytics {
  generateUserReport(userId: string): Promise<{
    summary: string;
    preferences: UserPreference;
    patterns: BehaviorPattern[];
    trends: {
      topicTrends: string[];
      styleEvolution: string[];
      satisfactionTrend: number[];
      adaptationTrends: number[];
      usagePatterns: string[];
    };
    recommendations: string[];
    personalizationScore: number;
    insights: string[];
  }>;
  
  analyzePersonalizationEffectiveness(userId: string): Promise<{
    overallScore: number;
    byAdaptationType: Record<AdaptationType, number>;
    trends: {
      improvement: number[];
      satisfaction: number[];
      usage: number[];
      effectiveness: number[];
    };
    insights: string[];
    recommendations: string[];
  }>;
  
  predictUserNeeds(userId: string, context: Record<string, any>): Promise<{
    likelyPreferences: Partial<UserPreference>;
    suggestedAdaptations: AdaptationType[];
    confidence: number;
    reasoning: string;
  }>;
  
  generateSystemReport(): Promise<{
    summary: string;
    userStats: {
      totalUsers: number;
      activeUsers: number;
      averageSatisfaction: number;
      averagePersonalizationScore: number;
    };
    popularAdaptations: Record<AdaptationType, number>;
    contentTrends: string[];
    systemHealth: {
      performance: number;
      accuracy: number;
      userSatisfaction: number;
    };
    recommendations: string[];
  }>;
  
  compareUsers(userIds: string[]): Promise<{
    similarities: Record<string, number>;
    differences: Record<string, string>;
    recommendations: string[];
  }>;
}

export interface IUserMemoryCache {
  // Caching Operations
  cachePreferences(userId: string, preferences: UserPreference, ttl?: number): Promise<void>;
  getCachedPreferences(userId: string): Promise<UserPreference | null>;
  invalidatePreferences(userId: string): Promise<void>;
  
  cachePatterns(userId: string, patterns: BehaviorPattern[], ttl?: number): Promise<void>;
  getCachedPatterns(userId: string): Promise<BehaviorPattern[] | null>;
  invalidatePatterns(userId: string): Promise<void>;
  
  cachePersonalizationResult(
    key: string, 
    result: PersonalizationResult, 
    ttl?: number
  ): Promise<void>;
  getCachedPersonalizationResult(key: string): Promise<PersonalizationResult | null>;
  invalidatePersonalizationResult(key: string): Promise<void>;
  
  // Cache Management
  clearCache(): Promise<void>;
  getCacheStats(): Promise<{
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage: number;
  }>;
  
  // Cache Warming
  warmCache(userId: string): Promise<void>;
  warmSystemCache(): Promise<void>;
}

export interface IUserMemoryValidator {
  validatePreferences(preferences: UserPreference): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  validatePromptHistory(history: PromptHistory): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  validateBehaviorPattern(pattern: BehaviorPattern): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  validateContentPreferences(preference: ContentPreference): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  validateInteraction(interaction: InteractionHistory): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  validateAdaptation(adaptation: AdaptationData): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
}

export interface IUserMemoryNotifier {
  // Event Notifications
  onPreferencesUpdated(callback: (userId: string, preferences: UserPreference) => void): void;
  onPatternDetected(callback: (userId: string, pattern: BehaviorPattern) => void): void;
  onAdaptationPerformed(callback: (userId: string, adaptation: AdaptationData) => void): void;
  onInteractionAdded(callback: (userId: string, interaction: InteractionHistory) => void): void;
  
  // Notification Methods
  notifyPreferencesUpdated(userId: string, preferences: UserPreference): void;
  notifyPatternDetected(userId: string, pattern: BehaviorPattern): void;
  notifyAdaptationPerformed(userId: string, adaptation: AdaptationData): void;
  notifyInteractionAdded(userId: string, interaction: InteractionHistory): void;
  
  // Batch Notifications
  notifyBatchUpdates(updates: Array<{
    type: 'preferences' | 'patterns' | 'adaptations' | 'interactions';
    userId: string;
    data: any;
  }>): void;
}

export interface IUserMemoryMetrics {
  // Performance Metrics
  recordPersonalizationTime(userId: string, duration: number): void;
  recordAdaptationTime(userId: string, adaptationType: AdaptationType, duration: number): void;
  recordPatternDetectionTime(userId: string, duration: number): void;
  
  // Success Metrics
  recordPersonalizationSuccess(userId: string, success: boolean, score: number): void;
  recordAdaptationSuccess(userId: string, adaptationType: AdaptationType, effectiveness: number): void;
  recordUserSatisfaction(userId: string, rating: number): void;
  
  // Usage Metrics
  recordFeatureUsage(userId: string, feature: string, context?: Record<string, any>): void;
  recordContentTypeUsage(userId: string, contentType: string): void;
  recordAdaptationTypeUsage(userId: string, adaptationType: AdaptationType): void;
  
  // Analytics
  getMetrics(userId: string): Promise<{
    personalizationMetrics: {
      averageTime: number;
      successRate: number;
      averageScore: number;
      usageCount: number;
    };
    adaptationMetrics: Record<AdaptationType, {
      averageTime: number;
      effectiveness: number;
      usageCount: number;
    }>;
    behaviorMetrics: {
      patternDetectionTime: number;
      patternsDetected: number;
      adaptationRate: number;
    };
  }>;
  
  getSystemMetrics(): Promise<{
    overallMetrics: {
      totalUsers: number;
      totalPersonalizations: number;
      totalAdaptations: number;
      averageSatisfaction: number;
    };
    performanceMetrics: {
      averagePersonalizationTime: number;
      averageAdaptationTime: number;
      systemResponseTime: number;
    };
    featureMetrics: Record<string, {
      usage: number;
      successRate: number;
      averageScore: number;
    }>;
  }>;
}
