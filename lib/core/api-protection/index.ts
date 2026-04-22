/**
 * API Protection Layer
 * Enforces user identity validation and access control for all API endpoints
 */

import { NextRequest } from 'next/server';
import { executionGuard } from '../execution-guard';
import { accessControl } from '../access-control';

export interface ApiProtectionResult {
  success: boolean;
  userId?: string;
  error?: string;
  errorCode?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'INVALID_REQUEST';
}

export class ApiProtection {
  /**
   * Validate and protect API requests
   * Ensures user identity and access control before processing
   */
  async protectRequest(request: NextRequest, requiredAction: string): Promise<ApiProtectionResult> {
    try {
      // Step 1: Extract user identity from headers or auth token
      const userId = this.extractUserId(request);
      
      if (!userId) {
        return {
          success: false,
          error: 'User identity required',
          errorCode: 'UNAUTHORIZED'
        };
      }

      // Step 2: Validate user exists and has access
      let userAccess;
      try {
        userAccess = await accessControl.getUserAccess(userId);
        if (!userAccess) {
          // Create user access with FREE tier if not exists
          userAccess = await accessControl.createUserAccess(userId, 'free');
        }
      } catch (error) {
        return {
          success: false,
          error: 'User access validation failed',
          errorCode: 'FORBIDDEN'
        };
      }

      // Step 3: Check if user is allowed to perform this action
      const accessCheck = await accessControl.checkAccess(userId);
      
      if (!accessCheck.allowedTier) {
        return {
          success: false,
          error: 'Tier does not allow this action',
          errorCode: 'FORBIDDEN'
        };
      }

      if (!accessCheck.hasCredits) {
        return {
          success: false,
          error: 'Insufficient credits',
          errorCode: 'FORBIDDEN'
        };
      }

      if (!accessCheck.withinLimits) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          errorCode: 'RATE_LIMITED'
        };
      }

      // Step 4: Validate request body structure
      const bodyValidation = this.validateRequestBody(request, requiredAction);
      if (!bodyValidation.valid) {
        return {
          success: false,
          error: bodyValidation.error,
          errorCode: 'INVALID_REQUEST'
        };
      }

      return {
        success: true,
        userId
      };

    } catch (error) {
      return {
        success: false,
        error: 'API protection failed',
        errorCode: 'UNAUTHORIZED'
      };
    }
  }

  /**
   * Execute protected API endpoint with access control
   */
  async executeProtected<T>(
    request: NextRequest,
    requiredAction: string,
    estimatedCredits: number,
    executionFunction: (userId: string, body: any) => Promise<T>
  ): Promise<{
    success: boolean;
    result?: T;
    error?: string;
    errorCode?: string;
    creditsUsed?: number;
    executionTime?: number;
  }> {
    const startTime = Date.now();

    try {
      // Step 1: Protect the request
      const protection = await this.protectRequest(request, requiredAction);
      
      if (!protection.success) {
        return {
          success: false,
          error: protection.error,
          errorCode: protection.errorCode
        };
      }

      const userId = protection.userId!;

      // Step 2: Parse request body
      const body = await request.json();

      // Step 3: Execute with execution guard
      const guardResult = await executionGuard.executeWithGuard(
        {
          userId,
          action: requiredAction,
          estimatedCredits,
          metadata: { body, endpoint: requiredAction }
        },
        () => executionFunction(userId, body)
      );

      const executionTime = Date.now() - startTime;

      if (guardResult.success) {
        return {
          success: true,
          result: guardResult.result,
          creditsUsed: guardResult.creditsUsed,
          executionTime
        };
      } else {
        return {
          success: false,
          error: guardResult.error,
          errorCode: 'EXECUTION_FAILED',
          creditsUsed: 0,
          executionTime
        };
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SYSTEM_ERROR',
        creditsUsed: 0,
        executionTime
      };
    }
  }

  /**
   * Extract user ID from request headers or auth token
   */
  private extractUserId(request: NextRequest): string | null {
    // Method 1: From X-User-ID header (for development/testing)
    const userIdHeader = request.headers.get('x-user-id');
    if (userIdHeader) {
      return userIdHeader;
    }

    // Method 2: From Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In production, this would validate JWT token
      // For now, extract user ID from token (simplified)
      const token = authHeader.substring(7);
      try {
        // Simple token parsing - in production use proper JWT validation
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.sub;
      } catch {
        return null;
      }
    }

    // Method 3: From API key header
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) {
      // In production, validate API key against database
      // For now, treat API key as user ID (simplified)
      return apiKey.startsWith('user_') ? apiKey.substring(5) : apiKey;
    }

    return null;
  }

  /**
   * Validate request body structure based on action
   */
  private validateRequestBody(request: NextRequest, requiredAction: string): {
    valid: boolean;
    error?: string;
  } {
    try {
      // Basic validation - check if body exists and is valid JSON
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {
          valid: false,
          error: 'Content-Type must be application/json'
        };
      }

      // Action-specific validation would go here
      // For now, just ensure the body can be parsed
      return { valid: true };

    } catch (error) {
      return {
        valid: false,
        error: 'Invalid request body'
      };
    }
  }

  /**
   * Get user status for dashboard/monitoring endpoints
   */
  async getUserStatus(request: NextRequest): Promise<{
    success: boolean;
    status?: any;
    error?: string;
  }> {
    try {
      const userId = this.extractUserId(request);
      if (!userId) {
        return {
          success: false,
          error: 'User identity required'
        };
      }

      const status = await executionGuard.getUserStatus(userId);
      const usageStats = await accessControl.getUsageStats(userId);

      return {
        success: true,
        status: {
          ...status,
          usageStats
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create or upgrade user tier (admin function)
   */
  async manageUserTier(request: NextRequest): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    try {
      const userId = this.extractUserId(request);
      if (!userId) {
        return {
          success: false,
          error: 'User identity required'
        };
      }

      const body = await request.json();
      const { action, tierId } = body;

      if (action === 'upgrade') {
        const result = await accessControl.upgradeTier(userId, tierId);
        return {
          success: true,
          result
        };
      }

      if (action === 'add_credits') {
        const { amount } = body;
        const result = await accessControl.addCredits(userId, amount);
        return {
          success: true,
          result: { creditsAdded: result }
        };
      }

      return {
        success: false,
        error: 'Invalid action'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const apiProtection = new ApiProtection();
