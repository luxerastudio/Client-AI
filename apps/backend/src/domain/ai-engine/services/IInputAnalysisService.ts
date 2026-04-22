import { AnalysisResult } from '../entities/AIWorkflow';

export interface IInputAnalysisService {
  analyzeIntent(input: string | Record<string, any>): Promise<string>;
  extractEntities(input: string | Record<string, any>): Promise<Array<{ text: string; type: string; confidence: number }>>;
  analyzeSentiment(input: string): Promise<'positive' | 'negative' | 'neutral'>;
  assessComplexity(input: string | Record<string, any>): Promise<'low' | 'medium' | 'high'>;
  suggestApproach(analysis: Partial<AnalysisResult>): Promise<string>;
  performFullAnalysis(input: string | Record<string, any>): Promise<AnalysisResult>;
}

export interface IPromptStructuringService {
  createPromptTemplate(analysis: AnalysisResult, config: Record<string, any>): Promise<{
    systemPrompt: string;
    userPromptTemplate: string;
    variables: Array<{ name: string; type: string; required: boolean }>;
  }>;
  optimizePrompt(prompt: string, target: string): Promise<string>;
  validatePrompt(prompt: string): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }>;
  contextualizePrompt(prompt: string, context: Record<string, any>): Promise<string>;
}

export interface IAIGenerationService {
  generate(request: {
    prompt: string;
    config: Record<string, any>;
    context?: Record<string, any>;
  }): Promise<{
    content: string;
    tokens: { prompt: number; completion: number; total: number };
    model: string;
    processingTime: number;
    cost: number;
  }>;
  batchGenerate(requests: Array<{
    prompt: string;
    config: Record<string, any>;
    context?: Record<string, any>;
  }>): Promise<Array<{
    content: string;
    tokens: { prompt: number; completion: number; total: number };
    model: string;
    processingTime: number;
    cost: number;
  }>>;
  estimateTokens(text: string): Promise<number>;
  estimateCost(tokens: number, model: string): Promise<number>;
}

export interface IOutputRefinementService {
  refineContent(content: string, rules: Array<{
    type: 'formatting' | 'content' | 'style' | 'validation';
    config: Record<string, any>;
  }>): Promise<{
    refinedContent: string;
    appliedRules: string[];
    qualityScore: number;
    suggestions: string[];
  }>;
  validateOutput(content: string, schema: Record<string, any>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  calculateQuality(content: string, criteria: Record<string, any>): Promise<number>;
  applyFormatting(content: string, format: string): Promise<string>;
}

export interface IAIWorkflowEngine {
  executeWorkflow(workflow: any, input: Record<string, any>): Promise<{
    executionId: string;
    output: Record<string, any>;
    stepResults: Record<string, any>;
    metrics: {
      totalTokens: number;
      processingTime: number;
      cost: number;
    };
  }>;
  validateWorkflow(workflow: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  getExecutionStatus(executionId: string): Promise<{
    status: string;
    currentStep?: string;
    progress: number;
    error?: string;
  }>;
  cancelExecution(executionId: string): Promise<void>;
}
