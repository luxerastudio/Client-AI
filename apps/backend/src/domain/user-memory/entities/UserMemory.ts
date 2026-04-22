import { z } from 'zod';

export enum MemoryType {
  PREFERENCE = 'preference',
  PROMPT_HISTORY = 'prompt_history',
  BEHAVIOR_PATTERN = 'behavior_pattern',
  CONTENT_PREFERENCE = 'content_preference',
  INTERACTION_HISTORY = 'interaction_history',
  ADAPTATION_DATA = 'adaptation_data'
}

export enum InteractionType {
  PROMPT = 'prompt',
  CONTENT_GENERATION = 'content_generation',
  FEEDBACK = 'feedback',
  SELECTION = 'selection',
  MODIFICATION = 'modification'
}

export enum AdaptationType {
  TONE = 'tone',
  STYLE = 'style',
  LENGTH = 'length',
  COMPLEXITY = 'complexity',
  FORMAT = 'format',
  CONTENT_TYPE = 'content_type',
  LANGUAGE = 'language'
}

export const UserPreferenceSchema = z.object({
  userId: z.string(),
  preferences: z.object({
    tone: z.string().optional(),
    style: z.string().optional(),
    length: z.string().optional(),
    complexity: z.string().optional(),
    format: z.string().optional(),
    language: z.string().default('en'),
    targetAudience: z.string().optional(),
    industry: z.string().optional(),
    contentType: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    avoidKeywords: z.array(z.string()).default([]),
    customInstructions: z.string().optional()
  }),
  behaviorPatterns: z.object({
    frequentTopics: z.array(z.string()).default([]),
    preferredStructures: z.array(z.string()).default([]),
    commonModifications: z.array(z.string()).default([]),
    feedbackPatterns: z.array(z.string()).default([])
  }),
  adaptationHistory: z.array(z.object({
    type: z.nativeEnum(AdaptationType),
    originalValue: z.string(),
    adaptedValue: z.string(),
    timestamp: z.date(),
    effectiveness: z.number().min(0).max(10),
    confidence: z.number().min(0).max(1)
  })).default([]),
  metadata: z.object({
    createdAt: z.date(),
    updatedAt: z.date(),
    lastInteraction: z.date(),
    interactionCount: z.number().default(0),
    adaptationCount: z.number().default(0),
    satisfactionScore: z.number().min(0).max(10).optional()
  })
});

export const PromptHistorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  prompt: z.string(),
  context: z.record(z.any()).optional(),
  response: z.string().optional(),
  metadata: z.object({
    timestamp: z.date(),
    contentType: z.string().optional(),
    workflowType: z.string().optional(),
    tokensUsed: z.number().optional(),
    cost: z.number().optional(),
    duration: z.number().optional(),
    qualityScore: z.number().min(0).max(10).optional(),
    userSatisfaction: z.number().min(0).max(10).optional()
  }),
  extractedInsights: z.object({
    topics: z.array(z.string()).default([]),
    entities: z.array(z.string()).default([]),
    intent: z.string().optional(),
    sentiment: z.string().optional(),
    complexity: z.string().optional(),
    requirements: z.array(z.string()).default([])
  }).optional()
});

export const BehaviorPatternSchema = z.object({
  id: z.string(),
  userId: z.string(),
  patternType: z.string(),
  pattern: z.record(z.any()),
  frequency: z.number().min(0),
  confidence: z.number().min(0).max(1),
  lastObserved: z.date(),
  occurrences: z.array(z.object({
    timestamp: z.date(),
    context: z.record(z.any()).optional(),
    strength: z.number().min(0).max(1)
  })).default([]),
  adaptations: z.array(z.object({
    adaptation: z.string(),
    effectiveness: z.number().min(0).max(10),
    timestamp: z.date()
  })).default([])
});

export const ContentPreferenceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  contentType: z.string(),
  preferences: z.object({
    structure: z.array(z.string()).default([]),
    elements: z.array(z.string()).default([]),
    avoidElements: z.array(z.string()).default([]),
    length: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      preferred: z.string().optional()
    }).optional(),
    tone: z.string().optional(),
    style: z.string().optional(),
    format: z.string().optional()
  }),
  feedback: z.array(z.object({
    rating: z.number().min(0).max(10),
    feedback: z.string(),
    timestamp: z.date(),
    aspects: z.array(z.string()).default([])
  })).default([]),
  performance: z.object({
    averageQuality: z.number().min(0).max(10),
    averageSatisfaction: z.number().min(0).max(10),
    usageCount: z.number().default(0),
    successRate: z.number().min(0).max(1)
  })
});

export const InteractionHistorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  interactionType: z.nativeEnum(InteractionType),
  data: z.record(z.any()),
  context: z.record(z.any()).optional(),
  outcome: z.object({
    success: z.boolean(),
    satisfaction: z.number().min(0).max(10).optional(),
    feedback: z.string().optional(),
    modifications: z.array(z.string()).default([])
  }).optional(),
  timestamp: z.date(),
  duration: z.number().optional(),
  metadata: z.record(z.any()).optional()
});

export const AdaptationDataSchema = z.object({
  id: z.string(),
  userId: z.string(),
  adaptationType: z.nativeEnum(AdaptationType),
  original: z.string(),
  adapted: z.string(),
  context: z.record(z.any()).optional(),
  trigger: z.string(),
  effectiveness: z.number().min(0).max(10),
  confidence: z.number().min(0).max(1),
  timestamp: z.date(),
  feedback: z.object({
    userRating: z.number().min(0).max(10).optional(),
    systemRating: z.number().min(0).max(10).optional(),
    comments: z.string().optional()
  }).optional()
});

export type UserPreference = z.infer<typeof UserPreferenceSchema>;
export type PromptHistory = z.infer<typeof PromptHistorySchema>;
export type BehaviorPattern = z.infer<typeof BehaviorPatternSchema>;
export type ContentPreference = z.infer<typeof ContentPreferenceSchema>;
export type InteractionHistory = z.infer<typeof InteractionHistorySchema>;
export type AdaptationData = z.infer<typeof AdaptationDataSchema>;

export interface IUserMemoryService {
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreference | null>;
  updateUserPreferences(userId: string, preferences: Partial<UserPreference>): Promise<void>;
  createUserPreferences(userId: string, preferences: Partial<UserPreference>): Promise<UserPreference>;
  
  // Prompt History
  addPromptHistory(history: Omit<PromptHistory, 'id'>): Promise<void>;
  getPromptHistory(userId: string, limit?: number): Promise<PromptHistory[]>;
  searchPromptHistory(userId: string, query: string): Promise<PromptHistory[]>;
  analyzePromptTrends(userId: string): Promise<{
    frequentTopics: string[];
    commonPatterns: string[];
    evolution: string[];
  }>;
  
  // Behavior Patterns
  detectBehaviorPatterns(userId: string): Promise<BehaviorPattern[]>;
  updateBehaviorPattern(patternId: string, updates: Partial<BehaviorPattern>): Promise<void>;
  getBehaviorPatterns(userId: string, patternType?: string): Promise<BehaviorPattern[]>;
  
  // Content Preferences
  getContentPreferences(userId: string, contentType?: string): Promise<ContentPreference[]>;
  updateContentPreferences(userId: string, contentType: string, preferences: Partial<ContentPreference>): Promise<void>;
  addContentFeedback(userId: string, contentType: string, feedback: {
    rating: number;
    feedback: string;
    aspects: string[];
  }): Promise<void>;
  
  // Interaction History
  addInteraction(interaction: Omit<InteractionHistory, 'id'>): Promise<void>;
  getInteractionHistory(userId: string, limit?: number): Promise<InteractionHistory[]>;
  getInteractionsByType(userId: string, interactionType: InteractionType): Promise<InteractionHistory[]>;
  
  // Adaptation Data
  addAdaptation(adaptation: Omit<AdaptationData, 'id'>): Promise<void>;
  getAdaptationHistory(userId: string): Promise<AdaptationData[]>;
  getAdaptationsByType(userId: string, adaptationType: AdaptationType): Promise<AdaptationData[]>;
  
  // Personalization
  personalizeContent(userId: string, content: string, context?: Record<string, any>): Promise<{
    personalizedContent: string;
    adaptations: string[];
    confidence: number;
  }>;
  
  adaptPrompt(userId: string, prompt: string, context?: Record<string, any>): Promise<{
    adaptedPrompt: string;
    adaptations: string[];
    confidence: number;
  }>;
  
  // Analytics and Insights
  getUserInsights(userId: string): Promise<{
    preferences: UserPreference;
    patterns: BehaviorPattern[];
    trends: {
      topicTrends: string[];
      styleEvolution: string[];
      satisfactionTrend: number[];
    };
    recommendations: string[];
  }>;
  
  getPersonalizationScore(userId: string): Promise<{
    score: number;
    factors: {
      preferenceStrength: number;
      patternConsistency: number;
      adaptationEffectiveness: number;
      userSatisfaction: number;
    };
    improvementAreas: string[];
  }>;
}

export interface IUserMemoryRepository {
  // Preferences
  savePreferences(preferences: UserPreference): Promise<void>;
  getPreferences(userId: string): Promise<UserPreference | null>;
  updatePreferences(userId: string, updates: Partial<UserPreference>): Promise<void>;
  deletePreferences(userId: string): Promise<void>;
  
  // Prompt History
  savePromptHistory(history: PromptHistory): Promise<void>;
  getPromptHistory(userId: string, limit?: number): Promise<PromptHistory[]>;
  searchPromptHistory(userId: string, query: string): Promise<PromptHistory[]>;
  deletePromptHistory(userId: string, beforeDate?: Date): Promise<void>;
  
  // Behavior Patterns
  saveBehaviorPattern(pattern: BehaviorPattern): Promise<void>;
  getBehaviorPatterns(userId: string, patternType?: string): Promise<BehaviorPattern[]>;
  updateBehaviorPattern(patternId: string, updates: Partial<BehaviorPattern>): Promise<void>;
  deleteBehaviorPattern(patternId: string): Promise<void>;
  
  // Content Preferences
  saveContentPreferences(preference: ContentPreference): Promise<void>;
  getContentPreferences(userId: string, contentType?: string): Promise<ContentPreference[]>;
  updateContentPreferences(userId: string, contentType: string, updates: Partial<ContentPreference>): Promise<void>;
  deleteContentPreferences(userId: string, contentType: string): Promise<void>;
  
  // Interaction History
  saveInteraction(interaction: InteractionHistory): Promise<void>;
  getInteractionHistory(userId: string, limit?: number): Promise<InteractionHistory[]>;
  getInteractionsByType(userId: string, interactionType: InteractionType): Promise<InteractionHistory[]>;
  deleteInteractionHistory(userId: string, beforeDate?: Date): Promise<void>;
  
  // Adaptation Data
  saveAdaptation(adaptation: AdaptationData): Promise<void>;
  getAdaptationHistory(userId: string): Promise<AdaptationData[]>;
  getAdaptationsByType(userId: string, adaptationType: AdaptationType): Promise<AdaptationData[]>;
  deleteAdaptationHistory(userId: string, beforeDate?: Date): Promise<void>;
  
  // Analytics
  getUserStats(userId: string): Promise<{
    totalInteractions: number;
    totalAdaptations: number;
    averageSatisfaction: number;
    mostUsedContentType: string;
    adaptationEffectiveness: number;
  }>;
}

export interface IPatternDetector {
  detectPatterns(interactions: InteractionHistory[]): Promise<BehaviorPattern[]>;
  analyzePromptPatterns(prompts: PromptHistory[]): Promise<{
    frequentTopics: string[];
    commonStructures: string[];
    stylePreferences: string[];
    evolution: string[];
  }>;
  detectAdaptationOpportunities(userId: string): Promise<{
    opportunities: Array<{
      type: AdaptationType;
      currentPattern: string;
      suggestedAdaptation: string;
      confidence: number;
    }>;
  }>;
}

export interface IContentPersonalizer {
  personalizeContent(
    content: string,
    preferences: UserPreference,
    patterns: BehaviorPattern[],
    context?: Record<string, any>
  ): Promise<{
    personalizedContent: string;
    adaptations: string[];
    confidence: number;
  }>;
  
  adaptPrompt(
    prompt: string,
    preferences: UserPreference,
    patterns: BehaviorPattern[],
    context?: Record<string, any>
  ): Promise<{
    adaptedPrompt: string;
    adaptations: string[];
    confidence: number;
  }>;
  
  generatePersonalizationInstructions(
    preferences: UserPreference,
    patterns: BehaviorPattern[]
  ): Promise<string>;
}

export interface IAdaptationEngine {
  shouldAdapt(userId: string, context: Record<string, any>): Promise<boolean>;
  determineAdaptationType(
    userId: string,
    content: string,
    context: Record<string, any>
  ): Promise<AdaptationType>;
  
  performAdaptation(
    userId: string,
    content: string,
    adaptationType: AdaptationType,
    context: Record<string, any>
  ): Promise<{
    adaptedContent: string;
    adaptations: string[];
    confidence: number;
  }>;
  
  evaluateAdaptation(
    userId: string,
    original: string,
    adapted: string,
    feedback?: {
      rating: number;
      comments: string;
    }
  ): Promise<{
    effectiveness: number;
    improvement: number;
    shouldPersist: boolean;
  }>;
}

export interface IMemoryAnalytics {
  generateUserReport(userId: string): Promise<{
    summary: string;
    preferences: UserPreference;
    patterns: BehaviorPattern[];
    trends: any;
    recommendations: string[];
    personalizationScore: number;
  }>;
  
  analyzePersonalizationEffectiveness(userId: string): Promise<{
    overallScore: number;
    byAdaptationType: Record<AdaptationType, number>;
    trends: {
      improvement: number[];
      satisfaction: number[];
      usage: number[];
    };
    insights: string[];
  }>;
  
  predictUserNeeds(userId: string, context: Record<string, any>): Promise<{
    likelyPreferences: Partial<UserPreference>;
    suggestedAdaptations: AdaptationType[];
    confidence: number;
  }>;
}

export interface UserMemoryConfig {
  maxPromptHistory: number;
  maxInteractionHistory: number;
  patternDetectionThreshold: number;
  adaptationConfidenceThreshold: number;
  personalizationEnabled: boolean;
  autoAdaptation: boolean;
  retentionPeriod: number; // days
}

export interface UserMemoryContext {
  userId: string;
  sessionId?: string;
  currentInteraction?: string;
  previousInteractions?: string[];
  contentType?: string;
  workflowType?: string;
  metadata?: Record<string, any>;
}

export interface PersonalizationResult {
  success: boolean;
  personalizedContent: string;
  adaptations: Array<{
    type: AdaptationType;
    original: string;
    adapted: string;
    confidence: number;
  }>;
  overallConfidence: number;
  processingTime: number;
  metadata: {
    userId: string;
    adaptationsCount: number;
    patternsUsed: string[];
    preferencesUsed: string[];
  };
}
