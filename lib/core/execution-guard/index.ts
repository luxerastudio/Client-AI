/**
 * Execution Guard Layer
 * Hard enforcement of access control before any system execution
 */

import { accessControl } from '../access-control';

export interface ExecutionRequest {
  userId: string;
  action: string;
  estimatedCredits: number;
  metadata?: Record<string, any>;
}

export interface ExecutionResult {
  allowed: boolean;
  reason?: string;
  creditsRemaining?: number;
  tier?: string;
  executionId?: string;
}

export class ExecutionGuard {
  /**
   * HARD LOCK: Check access before any execution
   * If fails -> BLOCK execution immediately
   */
  async checkExecutionAccess(request: ExecutionRequest): Promise<ExecutionResult> {
    const { userId, action, estimatedCredits } = request;

    try {
      // Check if user exists and has access
      const accessCheck = await accessControl.checkAccess(userId);

      // HARD LOCK: No credits -> BLOCK
      if (!accessCheck.hasCredits) {
        return {
          allowed: false,
          reason: 'INSUFFICIENT_CREDITS',
          creditsRemaining: accessCheck.creditsRemaining,
          tier: accessCheck.tier
        };
      }

      // HARD LOCK: Rate limit exceeded -> BLOCK
      if (!accessCheck.withinLimits) {
        return {
          allowed: false,
          reason: 'RATE_LIMIT_EXCEEDED',
          creditsRemaining: accessCheck.creditsRemaining,
          tier: accessCheck.tier
        };
      }

      // HARD LOCK: Invalid tier -> BLOCK
      if (!accessCheck.allowedTier) {
        return {
          allowed: false,
          reason: 'TIER_NOT_ALLOWED',
          creditsRemaining: accessCheck.creditsRemaining,
          tier: accessCheck.tier
        };
      }

      // Check if user has enough credits for this specific action
      if (estimatedCredits > accessCheck.creditsRemaining) {
        return {
          allowed: false,
          reason: 'INSUFFICIENT_CREDITS_FOR_ACTION',
          creditsRemaining: accessCheck.creditsRemaining,
          tier: accessCheck.tier
        };
      }

      // Check tier-specific feature access
      const userAccess = await accessControl.getUserAccess(userId);
      if (!userAccess) {
        return {
          allowed: false,
          reason: 'USER_NOT_FOUND'
        };
      }

      const hasFeatureAccess = this.checkFeatureAccess(userAccess.tier, action);
      if (!hasFeatureAccess) {
        return {
          allowed: false,
          reason: 'FEATURE_NOT_ALLOWED_IN_TIER',
          creditsRemaining: accessCheck.creditsRemaining,
          tier: accessCheck.tier
        };
      }

      // Increment request counter
      const requestIncremented = await accessControl.incrementRequest(userId);
      if (!requestIncremented) {
        return {
          allowed: false,
          reason: 'REQUEST_RATE_LIMIT_EXCEEDED',
          creditsRemaining: accessCheck.creditsRemaining,
          tier: accessCheck.tier
        };
      }

      // Generate execution ID
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      return {
        allowed: true,
        creditsRemaining: accessCheck.creditsRemaining,
        tier: accessCheck.tier,
        executionId
      };

    } catch (error) {
      return {
        allowed: false,
        reason: 'SYSTEM_ERROR',
        creditsRemaining: 0,
        tier: 'UNKNOWN'
      };
    }
  }

  /**
   * Execute with hard enforcement wrapper
   * This method wraps any execution with mandatory access checks
   */
  async executeWithGuard<T>(
    request: ExecutionRequest,
    executionFunction: () => Promise<T>
  ): Promise<{
    success: boolean;
    result?: T;
    error?: string;
    creditsUsed?: number;
    executionTime?: number;
  }> {
    const startTime = Date.now();
    let creditsUsed = 0;

    try {
      // Step 1: HARD LOCK - Check access before execution
      const accessResult = await this.checkExecutionAccess(request);
      
      if (!accessResult.allowed) {
        // Log failed attempt
        await accessControl.logUsage(
          request.userId,
          request.action,
          0,
          0,
          request.metadata,
          false,
          accessResult.reason
        );

        return {
          success: false,
          error: accessResult.reason
        };
      }

      // Step 2: Increment execution counter
      const executionIncremented = await accessControl.incrementExecution(request.userId);
      if (!executionIncremented) {
        await accessControl.logUsage(
          request.userId,
          request.action,
          0,
          0,
          request.metadata,
          false,
          'EXECUTION_RATE_LIMIT_EXCEEDED'
        );

        return {
          success: false,
          error: 'EXECUTION_RATE_LIMIT_EXCEEDED'
        };
      }

      // Step 3: Deduct credits BEFORE execution
      const creditsDeducted = await accessControl.deductCredits(request.userId, request.estimatedCredits);
      if (!creditsDeducted) {
        await accessControl.logUsage(
          request.userId,
          request.action,
          0,
          0,
          request.metadata,
          false,
          'CREDIT_DEDUCTION_FAILED'
        );

        return {
          success: false,
          error: 'CREDIT_DEDUCTION_FAILED'
        };
      }

      creditsUsed = request.estimatedCredits;

      // Step 4: Execute the actual function
      const result = await executionFunction();
      const executionTime = Date.now() - startTime;

      // Step 5: Log successful execution
      await accessControl.logUsage(
        request.userId,
        request.action,
        creditsUsed,
        executionTime,
        request.metadata,
        true
      );

      return {
        success: true,
        result,
        creditsUsed,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Refund credits on failure
      if (creditsUsed > 0) {
        await accessControl.addCredits(request.userId, creditsUsed);
      }

      // Log failed execution
      await accessControl.logUsage(
        request.userId,
        request.action,
        creditsUsed,
        executionTime,
        request.metadata,
        false,
        error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        creditsUsed: 0, // Refunded
        executionTime
      };
    }
  }

  /**
   * Check if user's tier allows specific feature
   */
  private checkFeatureAccess(tier: any, action: string): boolean {
    const featureMap: Record<string, string[]> = {
      'FREE': ['lead_generation', 'basic_personalization'],
      'PRO': ['lead_generation', 'advanced_personalization', 'outreach', 'basic_analytics'],
      'UNLIMITED': ['lead_generation', 'advanced_personalization', 'outreach', 'offers', 'advanced_analytics', 'api_access']
    };

    const actionFeatureMap: Record<string, string> = {
      'generate_lead': 'lead_generation',
      'personalize_content': 'advanced_personalization',
      'send_email': 'outreach',
      'create_offer': 'offers',
      'get_analytics': 'basic_analytics',
      'advanced_analytics': 'advanced_analytics',
      'api_access': 'api_access',
      'run_acquisition_flow': 'lead_generation'
    };

    const requiredFeature = actionFeatureMap[action] || action;
    const allowedFeatures = featureMap[tier.name] || [];

    return allowedFeatures.includes(requiredFeature);
  }

  /**
   * Get user's current access status
   */
  async getUserStatus(userId: string): Promise<{
    tier: string;
    creditsRemaining: number;
    executionsThisHour: number;
    requestsThisMinute: number;
    subscriptionActive: boolean;
    canExecute: boolean;
    nextResetTime: Date;
  }> {
    const userAccess = await accessControl.getUserAccess(userId);
    if (!userAccess) {
      throw new Error('User not found');
    }

    const accessCheck = await accessControl.checkAccess(userId);

    // Calculate next reset time
    const now = new Date();
    const nextResetTime = new Date(now.getTime() + (60 - now.getMinutes()) * 60 * 1000);

    return {
      tier: userAccess.tier.name,
      creditsRemaining: userAccess.creditsRemaining,
      executionsThisHour: userAccess.executionsThisHour,
      requestsThisMinute: userAccess.requestsThisMinute,
      subscriptionActive: userAccess.subscriptionActive,
      canExecute: accessCheck.allowedTier && accessCheck.hasCredits && accessCheck.withinLimits,
      nextResetTime
    };
  }

  /**
   * Force stop all executions for a user (admin function)
   */
  async suspendUser(userId: string): Promise<boolean> {
    const userAccess = await accessControl.getUserAccess(userId);
    if (!userAccess) return false;

    userAccess.subscriptionActive = false;
    userAccess.updatedAt = new Date();

    return true;
  }

  /**
   * Resume user executions
   */
  async resumeUser(userId: string): Promise<boolean> {
    const userAccess = await accessControl.getUserAccess(userId);
    if (!userAccess) return false;

    userAccess.subscriptionActive = true;
    userAccess.updatedAt = new Date();

    return true;
  }
}

export const executionGuard = new ExecutionGuard();
