import { logger } from '../../logging/Logger';

export interface ErrorContext {
  module: string;
  operation: string;
  userId?: string;
  requestId?: string;
  additionalData?: Record<string, any>;
}

export class AppError extends Error {
  public readonly context: ErrorContext;
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, context: ErrorContext, code: string, statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
    this.context = context;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ErrorHandler {
  static logError(context: ErrorContext, error: any): void {
    const errorInfo = {
      context,
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      name: error?.name || 'Unknown',
      code: error?.code || 'No code',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memory: process.memoryUsage(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET
      },
      ...context.additionalData
    };
    
    logger.error(`${context.module}: ${context.operation} failed`, errorInfo);
    console.error(`[${context.module}] ${context.operation} failed:`, JSON.stringify(errorInfo, null, 2));
  }

  static createError(message: string, context: ErrorContext, code: string, statusCode: number = 500): AppError {
    return new AppError(message, context, code, statusCode);
  }

  static handleServiceError(module: string, operation: string, error: any, serviceUnavailable: boolean = false): never {
    this.logError({ module, operation }, error);
    
    if (serviceUnavailable) {
      throw this.createError(
        `${module} service not available`,
        { module, operation },
        'SERVICE_UNAVAILABLE',
        503
      );
    }
    
    throw this.createError(
      `${module} operation failed`,
      { module, operation },
      'OPERATION_FAILED',
      500
    );
  }

  static handleDatabaseError(operation: string, error: any, userId?: string): never {
    this.logError(
      { 
        module: 'Database', 
        operation,
        userId,
        additionalData: { errorType: error?.code || 'UNKNOWN' }
      },
      error
    );
    
    if (error?.code === '23505') {
      throw this.createError(
        'Database connection failed',
        { module: 'Database', operation },
        'CONNECTION_FAILED',
        503
      );
    }
    
    throw this.createError(
      'Database operation failed',
      { module: 'Database', operation },
      'DATABASE_ERROR',
      500
    );
  }

  static handleValidationError(operation: string, error: any): never {
    this.logError({ module: 'Validation', operation }, error);
    
    throw this.createError(
      'Validation failed',
      { module: 'Validation', operation },
      'VALIDATION_ERROR',
      400
    );
  }

  static handleAuthenticationError(operation: string, error: any): never {
    this.logError({ module: 'Authentication', operation }, error);
    
    throw this.createError(
      'Authentication failed',
      { module: 'Authentication', operation },
      'AUTHENTICATION_ERROR',
      401
    );
  }

  static handleAuthorizationError(operation: string, userId?: string): never {
    this.logError(
      { 
        module: 'Authorization', 
        operation, 
        userId,
        additionalData: { reason: 'Insufficient permissions' }
      },
      new Error('Authorization failed')
    );
    
    throw this.createError(
      'Access denied',
      { module: 'Authorization', operation },
      'AUTHORIZATION_ERROR',
      403
    );
  }

  static handleNotFoundError(resource: string, id: string): never {
    this.logError(
      { 
        module: 'Resource', 
        operation: 'find',
        additionalData: { resource, id }
      },
      new Error(`${resource} not found`)
    );
    
    throw this.createError(
      `${resource} not found`,
      { module: 'Resource', operation: 'find' },
      'NOT_FOUND',
      404
    );
  }

  static handleRateLimitError(operation: string, limit: number): never {
    this.logError(
      { 
        module: 'RateLimit', 
        operation,
        additionalData: { limit }
      },
      new Error('Rate limit exceeded')
    );
    
    throw this.createError(
      'Rate limit exceeded',
      { module: 'RateLimit', operation },
      'RATE_LIMIT_EXCEEDED',
      429
    );
  }
}
