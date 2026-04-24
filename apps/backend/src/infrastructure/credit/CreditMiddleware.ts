import { FastifyRequest, FastifyReply } from 'fastify';
import { ICreditService } from '../../domain/credit/entities/Credit';

// Extend FastifyRequest to include user context
interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    role?: string;
    roles?: string[];
  };
  securityContext?: {
    user?: {
      id: string;
      role?: string;
      roles?: string[];
    };
  };
}

export interface CreditMiddlewareOptions {
  creditCost?: number;
  operation?: string;
  bypassForAdmin?: boolean;
  trackUsage?: boolean;
  customValidation?: (userId: string, cost: number) => Promise<boolean>;
}

export function createCreditMiddleware(
  creditService: ICreditService,
  defaultOptions: CreditMiddlewareOptions = {}
) {
  return async (request: AuthenticatedRequest, reply: FastifyReply, options?: CreditMiddlewareOptions) => {
    const finalOptions = { ...defaultOptions, ...options };
    
    // Skip credit check if credit system is disabled
    if (!creditService.getConfig().enabled) {
      return; // Continue to next middleware
    }

    // Get user ID from request (should be set by auth middleware)
    const userId = request.user?.id || request.securityContext?.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: {
          message: 'Authentication required for credit validation',
          code: 'AUTH_REQUIRED'
        }
      });
    }

    // Check for admin bypass
    if (finalOptions.bypassForAdmin) {
      const user = request.user || request.securityContext?.user;
      if (user && (user.role === 'admin' || (user as any).roles?.includes('admin'))) {
        return; // Skip credit check for admins
      }
    }

    // Determine credit cost
    let creditCost = finalOptions.creditCost || 1;
    
    // Custom cost calculation based on request
    if (!creditCost && request.body) {
      creditCost = calculateCreditCost(request);
    }

    // Custom validation if provided
    if (finalOptions.customValidation) {
      const isValid = await finalOptions.customValidation(userId, creditCost);
      if (!isValid) {
        return reply.status(402).send({
          success: false,
          error: {
            message: 'Custom credit validation failed',
            code: 'CUSTOM_VALIDATION_FAILED'
          }
        });
      }
    }

    // Check if user has sufficient credits
    const hasSufficient = await creditService.hasSufficientCredits(userId, creditCost);
    if (!hasSufficient) {
      const balance = await creditService.getBalance(userId);
      return reply.status(402).send({
        success: false,
        error: {
          message: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          details: {
            required: creditCost,
            available: balance,
            shortage: creditCost - balance
          }
        }
      });
    }

    // Add credit info to request for later use
    request.creditInfo = {
      userId,
      cost: creditCost,
      operation: finalOptions.operation || `${request.method} ${request.url}`,
      validatedAt: new Date()
    };

    // Continue to next middleware
  };
}

export function createCreditTrackingMiddleware(creditService: ICreditService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // This middleware should run after the request is processed
    // It tracks actual usage and deducts credits
    
    const creditInfo = request.creditInfo;
    if (!creditInfo) {
      return; // No credit info, skip tracking
    }

    const startTime = request.startTime || Date.now();
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    try {
      // Deduct credits
      const result = await creditService.validateAndSpend(
        creditInfo.userId,
        creditInfo.cost,
        creditInfo.operation,
        {
          endpoint: request.url,
          method: request.method,
          requestId: request.id,
          processingTime,
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip || request.connection?.remoteAddress
        }
      );

      if (!result.success) {
        // This shouldn't happen if the pre-validation worked, but handle it gracefully
        console.error('Credit deduction failed after validation:', result.error);
      }

      // Track usage
      if (request.body || request.query) {
        await creditService.trackUsage(creditInfo.userId, {
          userId: creditInfo.userId,
          apiEndpoint: request.url,
          operation: creditInfo.operation,
          creditsSpent: creditInfo.cost,
          processingTime,
          metadata: extractRequestMetadata(request),
          ipAddress: request.ip || request.connection?.remoteAddress,
          userAgent: request.headers['user-agent'],
          requestId: request.id,
          status: result.success ? 'completed' : 'failed'
        });
      }

    } catch (error) {
      console.error('Error in credit tracking middleware:', error);
      // Don't fail the request, just log the error
    }
  };
}

// Helper functions
function calculateCreditCost(request: FastifyRequest): number {
  // Default cost based on endpoint and request characteristics
  const url = request.url;
  const method = request.method;
  
  // AI generation endpoints typically cost more
  if (url.includes('/ai/') || url.includes('/generator/')) {
    const body = request.body as any;
    
    // Cost based on token count or complexity
    if (body?.maxTokens) {
      return Math.ceil((body.maxTokens || 1000) / 100); // 1 credit per 100 tokens
    }
    
    if (body?.prompt) {
      const promptLength = body.prompt.length;
      return Math.ceil(promptLength / 1000); // 1 credit per 1000 characters
    }
    
    return 10; // Default cost for AI operations
  }
  
  // Other API endpoints
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    return 1; // 1 credit for write operations
  }
  
  return 0; // Free for read operations
}

function extractRequestMetadata(request: FastifyRequest): Record<string, any> {
  const metadata: Record<string, any> = {
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    contentType: request.headers['content-type']
  };

  // Add relevant request body data (sanitize sensitive info)
  if (request.body) {
    const body = request.body as any;
    metadata.requestSize = JSON.stringify(body).length;
    
    // Add non-sensitive fields
    if (body.model) metadata.model = body.model;
    if (body.maxTokens) metadata.maxTokens = body.maxTokens;
    if (body.temperature) metadata.temperature = body.temperature;
    
    // Add prompt length without storing the actual prompt
    if (body.prompt) {
      metadata.promptLength = body.prompt.length;
    }
  }

  return metadata;
}

// Factory functions for common use cases
export function createAICreditMiddleware(creditService: ICreditService) {
  return createCreditMiddleware(creditService, {
    creditCost: 10, // Default cost for AI operations
    operation: 'ai_generation',
    trackUsage: true
  });
}

export function createAPIEndpointCreditMiddleware(creditService: ICreditService, cost: number = 1) {
  return createCreditMiddleware(creditService, {
    creditCost: cost,
    operation: 'api_call',
    trackUsage: true
  });
}

export function createFreeEndpointMiddleware() {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    // No credit check for free endpoints
    request.creditInfo = {
      userId: request.user?.id || request.securityContext?.user?.id || 'anonymous',
      cost: 0,
      operation: 'free_endpoint',
      validatedAt: new Date()
    };
  };
}

// Type extensions
declare module 'fastify' {
  interface FastifyRequest {
    creditInfo?: {
      userId: string;
      cost: number;
      operation: string;
      validatedAt: Date;
    };
    startTime?: number;
  }
}

// Middleware for adding request start time
export function addRequestStartTime() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    request.startTime = Date.now();
  };
}
