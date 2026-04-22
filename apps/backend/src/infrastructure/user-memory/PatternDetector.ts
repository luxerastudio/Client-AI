import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { 
  IPatternDetector,
  IUserMemoryRepository
} from '@/domain/user-memory/services/IUserMemoryService';
import { 
  InteractionHistory,
  PromptHistory,
  BehaviorPattern,
  AdaptationType,
  UserPreference
} from '@/domain/user-memory/entities/UserMemory';

export class PatternDetector implements IPatternDetector {
  private openai: OpenAI;
  private repository: IUserMemoryRepository;

  constructor(apiKey: string, repository: IUserMemoryRepository) {
    this.openai = new OpenAI({ apiKey });
    this.repository = repository;
  }

  async detectPatterns(interactions: InteractionHistory[]): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];
    
    // Detect different types of patterns
    patterns.push(...await this.detectTimePatterns(interactions));
    patterns.push(...await this.detectContentTypePatterns(interactions));
    patterns.push(...await this.detectModificationPatterns(interactions));
    patterns.push(...await this.detectSatisfactionPatterns(interactions));
    patterns.push(...await this.detectWorkflowPatterns(interactions));
    
    return patterns;
  }

  async analyzePromptPatterns(prompts: PromptHistory[]): Promise<{
    frequentTopics: string[];
    commonStructures: string[];
    stylePreferences: string[];
    evolution: string[];
    complexity: string;
    intent: string;
  }> {
    if (prompts.length === 0) {
      return {
        frequentTopics: [],
        commonStructures: [],
        stylePreferences: [],
        evolution: [],
        complexity: 'unknown',
        intent: 'unknown'
      };
    }

    // Extract topics from prompts
    const topics = await this.extractTopicsFromPrompts(prompts);
    const frequentTopics = this.getMostFrequent(topics, 10);
    
    // Analyze prompt structures
    const commonStructures = await this.analyzePromptStructures(prompts);
    
    // Analyze style preferences
    const stylePreferences = await this.analyzeStylePreferences(prompts);
    
    // Analyze evolution over time
    const evolution = await this.analyzeEvolution(prompts);
    
    // Determine overall complexity and intent
    const complexity = await this.determineComplexity(prompts);
    const intent = await this.determineIntent(prompts);

    return {
      frequentTopics,
      commonStructures,
      stylePreferences,
      evolution,
      complexity,
      intent
    };
  }

  async detectAdaptationOpportunities(userId: string): Promise<{
    opportunities: Array<{
      type: AdaptationType;
      currentPattern: string;
      suggestedAdaptation: string;
      confidence: number;
      reasoning: string;
    }>;
  }> {
    const interactions = await this.repository.getInteractionHistory(userId);
    const preferences = await this.repository.getUserPreferences(userId);
    const adaptations = await this.repository.getAdaptationHistory(userId);
    
    const opportunities = [];
    
    // Analyze each adaptation type
    for (const adaptationType of Object.values(AdaptationType)) {
      const opportunity = await this.analyzeAdaptationOpportunity(
        adaptationType,
        interactions,
        preferences,
        adaptations
      );
      
      if (opportunity && opportunity.confidence > 0.6) {
        opportunities.push(opportunity);
      }
    }
    
    return { opportunities };
  }

  async analyzeBehaviorEvolution(userId: string, timeRange: {
    start: Date;
    end: Date;
  }): Promise<{
    evolution: string[];
    trends: string[];
    predictions: string[];
  }> {
    const interactions = await this.repository.getInteractionHistory(userId);
    const filteredInteractions = interactions.filter(i => 
      i.timestamp >= timeRange.start && i.timestamp <= timeRange.end
    );
    
    if (filteredInteractions.length === 0) {
      return {
        evolution: [],
        trends: [],
        predictions: []
      };
    }

    // Analyze evolution using AI
    const evolutionPrompt = this.buildEvolutionAnalysisPrompt(filteredInteractions);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in analyzing user behavior patterns and evolution. Provide detailed analysis of how user behavior has evolved over time.'
          },
          {
            role: 'user',
            content: evolutionPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content || '';
      
      // Parse the AI response
      return this.parseEvolutionResponse(content);
    } catch (error) {
      // Fallback to basic analysis
      return this.performBasicEvolutionAnalysis(filteredInteractions);
    }
  }

  async extractFeatures(content: string): Promise<{
    topics: string[];
    entities: string[];
    sentiment: string;
    complexity: string;
    style: string;
    structure: string[];
  }> {
    try {
      const analysisPrompt = `Analyze the following content and extract key features:

Content: "${content}"

Please provide a JSON response with:
- topics: array of main topics
- entities: array of named entities mentioned
- sentiment: (positive, negative, neutral, mixed)
- complexity: (simple, moderate, complex)
- style: (formal, casual, professional, creative, technical)
- structure: array of structural elements (e.g., introduction, main points, conclusion)`;

      const aiResponse = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in content analysis. Extract features accurately and return valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      });

      const responseContent = aiResponse.choices[0]?.message?.content || '{}';
      
      try {
        return JSON.parse(responseContent);
      } catch (parseError) {
        // Fallback to basic extraction
        return this.performBasicFeatureExtraction(content);
      }
    } catch (error) {
      return this.performBasicFeatureExtraction(content);
    }
  }

  // Private helper methods

  private async detectTimePatterns(interactions: InteractionHistory[]): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];
    
    // Group interactions by hour of day
    const hourlyUsage = new Map<number, number>();
    const dayOfWeekUsage = new Map<number, number>();
    
    interactions.forEach(interaction => {
      const date = interaction.timestamp;
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      
      hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + 1);
      dayOfWeekUsage.set(dayOfWeek, (dayOfWeekUsage.get(dayOfWeek) || 0) + 1);
    });
    
    // Find peak hours
    const peakHour = Array.from(hourlyUsage.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0];
    
    if (peakHour !== undefined) {
      patterns.push({
        id: uuidv4(),
        userId: interactions[0]?.userId || '',
        patternType: 'time_preference',
        pattern: {
          peakHour,
          hourlyDistribution: Object.fromEntries(hourlyUsage)
        },
        frequency: hourlyUsage.get(peakHour) || 0,
        confidence: this.calculateConfidence(new Map(Array.from(hourlyUsage.entries()).map(([k, v]) => [k.toString(), v])), interactions.length),
        lastObserved: new Date(),
        occurrences: interactions
          .filter(i => i.timestamp.getHours() === peakHour)
          .map(i => ({
            timestamp: i.timestamp,
            strength: 1.0
          })),
        adaptations: []
      });
    }
    
    return patterns;
  }

  private async detectContentTypePatterns(interactions: InteractionHistory[]): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];
    
    // Analyze content type preferences
    const contentTypeUsage = new Map<string, number>();
    
    interactions.forEach(interaction => {
      const contentType = interaction.metadata?.contentType;
      if (contentType) {
        contentTypeUsage.set(contentType, (contentTypeUsage.get(contentType) || 0) + 1);
      }
    });
    
    // Find preferred content types
    const preferredContentType = Array.from(contentTypeUsage.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0];
    
    if (preferredContentType) {
      patterns.push({
        id: uuidv4(),
        userId: interactions[0]?.userId || '',
        patternType: 'content_type_preference',
        pattern: {
          preferredContentType,
          contentTypeDistribution: Object.fromEntries(contentTypeUsage)
        },
        frequency: contentTypeUsage.get(preferredContentType) || 0,
        confidence: this.calculateConfidence(contentTypeUsage, interactions.filter(i => i.metadata?.contentType).length),
        lastObserved: new Date(),
        occurrences: interactions
          .filter(i => i.metadata?.contentType === preferredContentType)
          .map(i => ({
            timestamp: i.timestamp,
            strength: 1.0
          })),
        adaptations: []
      });
    }
    
    return patterns;
  }

  private async detectModificationPatterns(interactions: InteractionHistory[]): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];
    
    // Analyze modification patterns
    const modificationTypes = new Map<string, number>();
    
    interactions.forEach(interaction => {
      if (interaction.outcome?.modifications) {
        interaction.outcome.modifications.forEach(modification => {
          modificationTypes.set(modification, (modificationTypes.get(modification) || 0) + 1);
        });
      }
    });
    
    // Find common modifications
    const commonModification = Array.from(modificationTypes.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0];
    
    if (commonModification) {
      patterns.push({
        id: uuidv4(),
        userId: interactions[0]?.userId || '',
        patternType: 'modification_pattern',
        pattern: {
          commonModification,
          modificationDistribution: Object.fromEntries(modificationTypes)
        },
        frequency: modificationTypes.get(commonModification) || 0,
        confidence: this.calculateConfidence(modificationTypes, interactions.filter(i => i.outcome?.modifications?.length).length),
        lastObserved: new Date(),
        occurrences: interactions
          .filter(i => i.outcome?.modifications?.includes(commonModification))
          .map(i => ({
            timestamp: i.timestamp,
            strength: 1.0
          })),
        adaptations: []
      });
    }
    
    return patterns;
  }

  private async detectSatisfactionPatterns(interactions: InteractionHistory[]): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];
    
    // Analyze satisfaction patterns
    const satisfactionScores = interactions
      .filter(i => i.outcome?.satisfaction)
      .map(i => i.outcome!.satisfaction!);
    
    if (satisfactionScores.length > 0) {
      const averageSatisfaction = satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length;
      const satisfactionTrend = this.calculateTrend(satisfactionScores);
      
      patterns.push({
        id: uuidv4(),
        userId: interactions[0]?.userId || '',
        patternType: 'satisfaction_pattern',
        pattern: {
          averageSatisfaction,
          satisfactionTrend,
          scoreDistribution: this.calculateDistribution(satisfactionScores)
        },
        frequency: satisfactionScores.length,
        confidence: Math.min(satisfactionScores.length / 10, 1.0),
        lastObserved: new Date(),
        occurrences: interactions
          .filter(i => i.outcome?.satisfaction)
          .map(i => ({
            timestamp: i.timestamp,
            strength: i.outcome!.satisfaction! / 10
          })),
        adaptations: []
      });
    }
    
    return patterns;
  }

  private async detectWorkflowPatterns(interactions: InteractionHistory[]): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];
    
    // Analyze workflow type preferences
    const workflowUsage = new Map<string, number>();
    
    interactions.forEach(interaction => {
      const workflowType = interaction.metadata?.workflowType;
      if (workflowType) {
        workflowUsage.set(workflowType, (workflowUsage.get(workflowType) || 0) + 1);
      }
    });
    
    // Find preferred workflow types
    const preferredWorkflow = Array.from(workflowUsage.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0];
    
    if (preferredWorkflow) {
      patterns.push({
        id: uuidv4(),
        userId: interactions[0]?.userId || '',
        patternType: 'workflow_preference',
        pattern: {
          preferredWorkflow,
          workflowDistribution: Object.fromEntries(workflowUsage)
        },
        frequency: workflowUsage.get(preferredWorkflow) || 0,
        confidence: this.calculateConfidence(workflowUsage, interactions.filter(i => i.metadata?.workflowType).length),
        lastObserved: new Date(),
        occurrences: interactions
          .filter(i => i.metadata?.workflowType === preferredWorkflow)
          .map(i => ({
            timestamp: i.timestamp,
            strength: 1.0
          })),
        adaptations: []
      });
    }
    
    return patterns;
  }

  private async extractTopicsFromPrompts(prompts: PromptHistory[]): Promise<string[]> {
    const allTopics: string[] = [];
    
    for (const prompt of prompts) {
      if (prompt.extractedInsights?.topics) {
        allTopics.push(...prompt.extractedInsights.topics);
      }
    }
    
    return allTopics;
  }

  private getMostFrequent(items: string[], limit: number): string[] {
    const frequency = new Map<string, number>();
    
    items.forEach(item => {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    });
    
    return Array.from(frequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([item]) => item);
  }

  private async analyzePromptStructures(prompts: PromptHistory[]): Promise<string[]> {
    const structures = new Map<string, number>();
    
    prompts.forEach(prompt => {
      const structure = this.analyzePromptStructure(prompt.prompt);
      structures.set(structure, (structures.get(structure) || 0) + 1);
    });
    
    return Array.from(structures.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([structure]) => structure);
  }

  private analyzePromptStructure(prompt: string): string {
    // Simple structure analysis
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 1) {
      return 'single_sentence';
    } else if (sentences.length <= 3) {
      return 'short_paragraph';
    } else if (sentences.length <= 7) {
      return 'medium_paragraph';
    } else {
      return 'long_paragraph';
    }
  }

  private async analyzeStylePreferences(prompts: PromptHistory[]): Promise<string[]> {
    // Use AI to analyze style preferences
    const promptTexts = prompts.map(p => p.prompt).join('\n---\n');
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in writing style analysis. Identify the main style preferences from the given prompts.'
          },
          {
            role: 'user',
            content: `Analyze the writing style preferences in these prompts:\n\n${promptTexts}\n\nReturn the top 5 style preferences as a JSON array of strings.`
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '[]';
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        return this.performBasicStyleAnalysis(promptTexts);
      }
    } catch (error) {
      return this.performBasicStyleAnalysis(promptTexts);
    }
  }

  private performBasicStyleAnalysis(promptTexts: string): string[] {
    // Basic style analysis based on patterns
    const styles = [];
    
    if (promptTexts.includes('?')) styles.push('questioning');
    if (promptTexts.includes('!')) styles.push('enthusiastic');
    if (promptTexts.match(/\b(please|kindly|could you)\b/i)) styles.push('polite');
    if (promptTexts.match(/\b(urgent|asap|immediately)\b/i)) styles.push('urgent');
    if (promptTexts.match(/\b(explain|describe|detail)\b/i)) styles.push('detailed');
    
    return styles.slice(0, 5);
  }

  private async analyzeEvolution(prompts: PromptHistory[]): Promise<string[]> {
    if (prompts.length < 2) {
      return ['insufficient_data'];
    }

    // Sort prompts by timestamp
    const sortedPrompts = prompts.sort((a, b) => a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime());
    
    // Analyze evolution in thirds
    const third = Math.floor(sortedPrompts.length / 3);
    const earlyPrompts = sortedPrompts.slice(0, third);
    const middlePrompts = sortedPrompts.slice(third, 2 * third);
    const latePrompts = sortedPrompts.slice(2 * third);
    
    const evolution = [];
    
    // Compare early vs late
    const earlyComplexity = this.calculateAverageComplexity(earlyPrompts);
    const lateComplexity = this.calculateAverageComplexity(latePrompts);
    
    if (lateComplexity > earlyComplexity + 0.5) {
      evolution.push('increasing_complexity');
    } else if (lateComplexity < earlyComplexity - 0.5) {
      evolution.push('decreasing_complexity');
    }
    
    // Analyze topic evolution
    const earlyTopics = await this.extractTopicsFromPrompts(earlyPrompts);
    const lateTopics = await this.extractTopicsFromPrompts(latePrompts);
    
    const topicShift = this.calculateTopicShift(earlyTopics, lateTopics);
    if (topicShift > 0.3) {
      evolution.push('topic_evolution');
    }
    
    return evolution.length > 0 ? evolution : ['stable'];
  }

  private calculateAverageComplexity(prompts: PromptHistory[]): number {
    const complexities = prompts.map(p => this.estimateComplexity(p.prompt));
    return complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
  }

  private estimateComplexity(prompt: string): number {
    // Simple complexity estimation
    let complexity = 1;
    
    // Add complexity for longer prompts
    complexity += Math.min(prompt.length / 500, 2);
    
    // Add complexity for technical terms
    const technicalTerms = /\b(algorithm|implementation|architecture|optimization|integration|methodology|framework)\b/gi;
    const matches = prompt.match(technicalTerms);
    if (matches) {
      complexity += matches.length * 0.3;
    }
    
    // Add complexity for complex sentence structures
    const complexSentences = prompt.match(/[^.!?]*[,;][^.!?]*/g);
    if (complexSentences) {
      complexity += complexSentences.length * 0.2;
    }
    
    return Math.min(complexity, 5);
  }

  private calculateTopicShift(topics1: string[], topics2: string[]): number {
    const set1 = new Set(topics1);
    const set2 = new Set(topics2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return 1 - (intersection.size / union.size);
  }

  private async determineComplexity(prompts: PromptHistory[]): Promise<string> {
    const avgComplexity = this.calculateAverageComplexity(prompts);
    
    if (avgComplexity < 2) return 'simple';
    if (avgComplexity < 3.5) return 'moderate';
    return 'complex';
  }

  private async determineIntent(prompts: PromptHistory[]): Promise<string> {
    // Analyze common intent patterns
    const intents = new Map<string, number>();
    
    prompts.forEach(prompt => {
      const intent = this.detectIntent(prompt.prompt);
      intents.set(intent, (intents.get(intent) || 0) + 1);
    });
    
    const mostCommonIntent = Array.from(intents.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0];
    
    return mostCommonIntent || 'general';
  }

  private detectIntent(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('explain') || lowerPrompt.includes('describe')) return 'explanatory';
    if (lowerPrompt.includes('create') || lowerPrompt.includes('generate')) return 'creative';
    if (lowerPrompt.includes('analyze') || lowerPrompt.includes('evaluate')) return 'analytical';
    if (lowerPrompt.includes('help') || lowerPrompt.includes('assist')) return 'helpful';
    if (lowerPrompt.includes('compare') || lowerPrompt.includes('versus')) return 'comparative';
    if (lowerPrompt.includes('how to') || lowerPrompt.includes('steps')) return 'instructional';
    
    return 'general';
  }

  private async analyzeAdaptationOpportunity(
    adaptationType: AdaptationType,
    interactions: InteractionHistory[],
    preferences: UserPreference | null,
    adaptations: any[]
  ): Promise<{
    type: AdaptationType;
    currentPattern: string;
    suggestedAdaptation: string;
    confidence: number;
    reasoning: string;
  } | null> {
    // Analyze if there's an opportunity for this adaptation type
    const recentInteractions = interactions.slice(-10);
    const relevantAdaptations = adaptations.filter(a => a.adaptationType === adaptationType);
    
    // Check if adaptation is needed based on recent interactions
    const adaptationNeeded = await this.assessAdaptationNeed(adaptationType, recentInteractions, preferences);
    
    if (!adaptationNeeded.needed) {
      return null;
    }
    
    return {
      type: adaptationType,
      currentPattern: adaptationNeeded.currentPattern,
      suggestedAdaptation: adaptationNeeded.suggestedAdaptation,
      confidence: adaptationNeeded.confidence,
      reasoning: adaptationNeeded.reasoning
    };
  }

  private async assessAdaptationNeed(
    adaptationType: AdaptationType,
    interactions: InteractionHistory[],
    preferences: UserPreference | null
  ): Promise<{
    needed: boolean;
    currentPattern: string;
    suggestedAdaptation: string;
    confidence: number;
    reasoning: string;
  }> {
    // Implementation for assessing adaptation need
    // This is a simplified version - in practice, this would be more sophisticated
    
    switch (adaptationType) {
      case AdaptationType.TONE:
        return this.assessToneAdaptation(interactions, preferences);
      case AdaptationType.STYLE:
        return this.assessStyleAdaptation(interactions, preferences);
      case AdaptationType.LENGTH:
        return this.assessLengthAdaptation(interactions, preferences);
      default:
        return {
          needed: false,
          currentPattern: '',
          suggestedAdaptation: '',
          confidence: 0,
          reasoning: 'Not implemented'
        };
    }
  }

  private assessToneAdaptation(
    interactions: InteractionHistory[],
    preferences: UserPreference | null
  ): {
    needed: boolean;
    currentPattern: string;
    suggestedAdaptation: string;
    confidence: number;
    reasoning: string;
  } {
    // Check if user consistently modifies tone
    const toneModifications = interactions
      .filter(i => i.outcome?.modifications?.some(m => m.toLowerCase().includes('tone')))
      .length;
    
    const modificationRate = toneModifications / interactions.length;
    
    if (modificationRate > 0.3) {
      return {
        needed: true,
        currentPattern: 'frequent_tone_modifications',
        suggestedAdaptation: preferences?.preferences.tone || 'professional',
        confidence: modificationRate,
        reasoning: `User modifies tone in ${Math.round(modificationRate * 100)}% of interactions`
      };
    }
    
    return {
      needed: false,
      currentPattern: '',
      suggestedAdaptation: '',
      confidence: 0,
      reasoning: 'Low tone modification frequency'
    };
  }

  private assessStyleAdaptation(
    interactions: InteractionHistory[],
    preferences: UserPreference | null
  ): {
    needed: boolean;
    currentPattern: string;
    suggestedAdaptation: string;
    confidence: number;
    reasoning: string;
  } {
    // Similar implementation for style adaptation
    const styleModifications = interactions
      .filter(i => i.outcome?.modifications?.some(m => m.toLowerCase().includes('style')))
      .length;
    
    const modificationRate = styleModifications / interactions.length;
    
    if (modificationRate > 0.25) {
      return {
        needed: true,
        currentPattern: 'frequent_style_modifications',
        suggestedAdaptation: preferences?.preferences.style || 'professional',
        confidence: modificationRate,
        reasoning: `User modifies style in ${Math.round(modificationRate * 100)}% of interactions`
      };
    }
    
    return {
      needed: false,
      currentPattern: '',
      suggestedAdaptation: '',
      confidence: 0,
      reasoning: 'Low style modification frequency'
    };
  }

  private assessLengthAdaptation(
    interactions: InteractionHistory[],
    preferences: UserPreference | null
  ): {
    needed: boolean;
    currentPattern: string;
    suggestedAdaptation: string;
    confidence: number;
    reasoning: string;
  } {
    // Similar implementation for length adaptation
    const lengthModifications = interactions
      .filter(i => i.outcome?.modifications?.some(m => m.toLowerCase().includes('length')))
      .length;
    
    const modificationRate = lengthModifications / interactions.length;
    
    if (modificationRate > 0.2) {
      return {
        needed: true,
        currentPattern: 'frequent_length_modifications',
        suggestedAdaptation: preferences?.preferences.length || 'medium',
        confidence: modificationRate,
        reasoning: `User modifies length in ${Math.round(modificationRate * 100)}% of interactions`
      };
    }
    
    return {
      needed: false,
      currentPattern: '',
      suggestedAdaptation: '',
      confidence: 0,
      reasoning: 'Low length modification frequency'
    };
  }

  private calculateConfidence(distribution: Map<string, number>, total: number): number {
    if (total === 0) return 0;
    
    const maxCount = Math.max(...Array.from(distribution.values()));
    return Math.min(maxCount / total, 1.0);
  }

  private calculateTrend(scores: number[]): string {
    if (scores.length < 2) return 'stable';
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg + 0.5) return 'improving';
    if (secondAvg < firstAvg - 0.5) return 'declining';
    return 'stable';
  }

  private calculateDistribution(scores: number[]): Record<string, number> {
    const distribution = {
      low: 0,
      medium: 0,
      high: 0
    };
    
    scores.forEach(score => {
      if (score < 4) distribution.low++;
      else if (score < 7) distribution.medium++;
      else distribution.high++;
    });
    
    return distribution;
  }

  private buildEvolutionAnalysisPrompt(interactions: InteractionHistory[]): string {
    const interactionData = interactions.map(i => ({
      timestamp: i.timestamp.toISOString(),
      type: i.interactionType,
      outcome: i.outcome,
      metadata: i.metadata
    }));
    
    return `Analyze the evolution of user behavior based on these interactions:

${JSON.stringify(interactionData, null, 2)}

Please provide a JSON response with:
- evolution: array of observed behavioral changes
- trends: array of current trends
- predictions: array of likely future behaviors`;
  }

  private parseEvolutionResponse(content: string): {
    evolution: string[];
    trends: string[];
    predictions: string[];
  } {
    try {
      return JSON.parse(content);
    } catch (error) {
      return {
        evolution: ['data_parsing_error'],
        trends: ['data_parsing_error'],
        predictions: ['data_parsing_error']
      };
    }
  }

  private performBasicEvolutionAnalysis(interactions: InteractionHistory[]): {
    evolution: string[];
    trends: string[];
    predictions: string[];
  } {
    const evolution = [];
    const trends = [];
    const predictions = [];
    
    // Basic analysis
    if (interactions.length > 10) {
      evolution.push('active_user');
      trends.push('consistent_usage');
      predictions.push('continued_engagement');
    } else {
      evolution.push('new_user');
      trends.push('exploratory_behavior');
      predictions.push('pattern_development');
    }
    
    return { evolution, trends, predictions };
  }

  private performBasicFeatureExtraction(content: string): {
    topics: string[];
    entities: string[];
    sentiment: string;
    complexity: string;
    style: string;
    structure: string[];
  } {
    // Very basic feature extraction
    const words = content.toLowerCase().split(/\s+/);
    
    // Simple topic extraction (common words)
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const topics = words
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 5);
    
    // Simple entity extraction (capitalized words)
    const entities = content
      .match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []
      .slice(0, 3);
    
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing', 'poor'];
    
    let sentiment = 'neutral';
    const positiveCount = positiveWords.filter(word => content.toLowerCase().includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.toLowerCase().includes(word)).length;
    
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';
    
    // Simple complexity analysis
    const complexity = content.length > 500 ? 'complex' : content.length > 200 ? 'moderate' : 'simple';
    
    // Simple style analysis
    let style = 'neutral';
    if (content.includes('?')) style = 'questioning';
    else if (content.includes('!')) style = 'enthusiastic';
    else if (content.match(/\b(please|kindly)\b/i)) style = 'polite';
    
    // Simple structure analysis
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const structure = [];
    
    if (sentences.length > 0) structure.push('introduction');
    if (sentences.length > 2) structure.push('body');
    if (sentences.length > 4) structure.push('conclusion');
    
    return {
      topics,
      entities,
      sentiment,
      complexity,
      style,
      structure
    };
  }
}
