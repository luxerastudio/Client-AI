import { 
  SecurityError,
  AuthenticationError,
  AuthorizationError,
  InputValidationError,
  RateLimitError,
  SecurityViolationError,
  ThreatDetectedError,
  SecurityErrorType,
  SecurityEventSchema,
  SecurityContext
} from '@/domain/security/entities/Security';

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  apiKeyId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface ErrorReport {
  error: SecurityError;
  context: ErrorContext;
  stackTrace?: string;
  userFriendlyMessage?: string;
  shouldNotify?: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ErrorHandler {
  private errorReports: ErrorReport[] = [];
  private errorCallbacks: Map<SecurityErrorType, ((error: SecurityError, context: ErrorContext) => void)[]> = new Map();
  private notificationCallbacks: ((report: ErrorReport) => void)[] = [];

  // Main error handling method
  handleError(error: Error, context: ErrorContext = {}): ErrorReport {
    const securityError = this.convertToSecurityError(error);
    const report = this.createErrorReport(securityError, context);
    
    // Store error report
    this.errorReports.push(report);
    
    // Trigger callbacks
    this.triggerErrorCallbacks(securityError, context);
    
    // Send notifications if needed
    if (report.shouldNotify) {
      this.sendNotifications(report);
    }
    
    // Log error
    this.logError(report);
    
    return report;
  }

  // Convert any error to SecurityError
  private convertToSecurityError(error: Error): SecurityError {
    if (error instanceof SecurityError) {
      return error;
    }

    // Convert common errors to security errors
    if (error.message.includes('Unauthorized') || error.message.includes('Authentication failed')) {
      return new AuthenticationError(error.message, { originalError: error.name });
    }

    if (error.message.includes('Forbidden') || error.message.includes('Access denied')) {
      return new AuthorizationError(error.message, { originalError: error.name });
    }

    if (error.message.includes('Validation') || error.message.includes('Invalid')) {
      return new InputValidationError(error.message, { originalError: error.name });
    }

    if (error.message.includes('Rate limit') || error.message.includes('Too many requests')) {
      return new RateLimitError(error.message, { originalError: error.name });
    }

    // Default to generic security error
    return new SecurityError(
      SecurityErrorType.SYSTEM_ERROR,
      error.message,
      'SYSTEM_ERROR',
      500,
      { originalError: error.name, stack: error.stack }
    );
  }

  // Create error report
  private createErrorReport(error: SecurityError, context: ErrorContext): ErrorReport {
    const severity = this.determineSeverity(error, context);
    const userFriendlyMessage = this.generateUserFriendlyMessage(error);
    const shouldNotify = this.shouldNotify(error, severity);

    return {
      error,
      context: {
        ...context,
        timestamp: context.timestamp || new Date()
      },
      stackTrace: error.stack,
      userFriendlyMessage,
      shouldNotify,
      severity
    };
  }

  // Determine error severity
  private determineSeverity(error: SecurityError, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors
    if (error.type === SecurityErrorType.THREAT_DETECTED ||
        error.statusCode >= 500) {
      return 'critical';
    }

    // High severity errors
    if (error.type === SecurityErrorType.SECURITY_VIOLATION ||
        error.statusCode >= 400) {
      return 'high';
    }

    // Medium severity errors
    if (error.type === SecurityErrorType.AUTHORIZATION_ERROR ||
        error.type === SecurityErrorType.RATE_LIMIT_ERROR) {
      return 'medium';
    }

    // Low severity errors
    return 'low';
  }

  // Generate user-friendly messages
  private generateUserFriendlyMessage(error: SecurityError): string {
    switch (error.type) {
      case SecurityErrorType.AUTHENTICATION_ERROR:
        return 'Authentication required. Please log in to continue.';
      
      case SecurityErrorType.AUTHORIZATION_ERROR:
        return 'You do not have permission to perform this action.';
      
      case SecurityErrorType.VALIDATION_ERROR:
        return 'The provided data is invalid. Please check your input and try again.';
      
      case SecurityErrorType.RATE_LIMIT_ERROR:
        return 'Too many requests. Please wait a moment and try again.';
      
      case SecurityErrorType.SECURITY_VIOLATION:
        return 'Security violation detected. Your request has been blocked.';
      
      case SecurityErrorType.THREAT_DETECTED:
        return 'Suspicious activity detected. Your request has been blocked for security reasons.';
      
      default:
        return 'An error occurred. Please try again later.';
    }
  }

  // Determine if error should trigger notifications
  private shouldNotify(error: SecurityError, severity: string): boolean {
    // Always notify for critical and high severity
    if (severity === 'critical' || severity === 'high') {
      return true;
    }

    // Notify for specific error types
    if (error.type === SecurityErrorType.THREAT_DETECTED ||
        error.type === SecurityErrorType.SECURITY_VIOLATION) {
      return true;
    }

    return false;
  }

  // Trigger error callbacks
  private triggerErrorCallbacks(error: SecurityError, context: ErrorContext): void {
    const callbacks = this.errorCallbacks.get(error.type) || [];
    callbacks.forEach(callback => {
      try {
        callback(error, context);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  // Send notifications
  private sendNotifications(report: ErrorReport): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(report);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  // Log error
  private logError(report: ErrorReport): void {
    const logData = {
      type: 'SECURITY_ERROR',
      error: {
        type: report.error.type,
        code: report.error.code,
        message: report.error.message,
        statusCode: report.error.statusCode
      },
      context: {
        requestId: report.context.requestId,
        userId: report.context.userId,
        ipAddress: report.context.ipAddress,
        endpoint: report.context.endpoint,
        method: report.context.method
      },
      severity: report.severity,
      timestamp: report.context.timestamp
    };

    if (report.severity === 'critical' || report.severity === 'high') {
      console.error('SECURITY ERROR:', JSON.stringify(logData, null, 2));
    } else {
      console.warn('SECURITY WARNING:', JSON.stringify(logData, null, 2));
    }
  }

  // Public API methods

  // Register error callback
  onError(errorType: SecurityErrorType, callback: (error: SecurityError, context: ErrorContext) => void): void {
    if (!this.errorCallbacks.has(errorType)) {
      this.errorCallbacks.set(errorType, []);
    }
    this.errorCallbacks.get(errorType)!.push(callback);
  }

  // Register notification callback
  onNotification(callback: (report: ErrorReport) => void): void {
    this.notificationCallbacks.push(callback);
  }

  // Get error reports
  getErrorReports(filters?: {
    errorType?: SecurityErrorType;
    severity?: string;
    userId?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
  }): ErrorReport[] {
    return this.errorReports.filter(report => {
      if (filters?.errorType && report.error.type !== filters.errorType) return false;
      if (filters?.severity && report.severity !== filters.severity) return false;
      if (filters?.userId && report.context.userId !== filters.userId) return false;
      if (filters?.ipAddress && report.context.ipAddress !== filters.ipAddress) return false;
      if (filters?.startDate && report.context.timestamp! < filters.startDate) return false;
      if (filters?.endDate && report.context.timestamp! > filters.endDate) return false;
      return true;
    });
  }

  // Get error statistics
  getErrorStats(timeRange?: { start: Date; end: Date }): {
    total: number;
    byType: Record<SecurityErrorType, number>;
    bySeverity: Record<string, number>;
    byHour: Record<string, number>;
    topEndpoints: Array<{ endpoint: string; count: number; }>;
    topIPs: Array<{ ip: string; count: number; }>;
  } {
    const reports = timeRange 
      ? this.getErrorReports({ startDate: timeRange.start, endDate: timeRange.end })
      : this.errorReports;

    const byType: Record<SecurityErrorType, number> = {} as any;
    const bySeverity: Record<string, number> = {};
    const byHour: Record<string, number> = {};
    const endpointCounts: Record<string, number> = {};
    const ipCounts: Record<string, number> = {};

    reports.forEach(report => {
      // Count by type
      byType[report.error.type] = (byType[report.error.type] || 0) + 1;

      // Count by severity
      bySeverity[report.severity] = (bySeverity[report.severity] || 0) + 1;

      // Count by hour
      if (report.context.timestamp) {
        const hour = report.context.timestamp.getHours().toString();
        byHour[hour] = (byHour[hour] || 0) + 1;
      }

      // Count by endpoint
      if (report.context.endpoint) {
        endpointCounts[report.context.endpoint] = (endpointCounts[report.context.endpoint] || 0) + 1;
      }

      // Count by IP
      if (report.context.ipAddress) {
        ipCounts[report.context.ipAddress] = (ipCounts[report.context.ipAddress] || 0) + 1;
      }
    });

    // Get top endpoints and IPs
    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: reports.length,
      byType,
      bySeverity,
      byHour,
      topEndpoints,
      topIPs
    };
  }

  // Clear old error reports
  clearOldReports(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialCount = this.errorReports.length;
    
    this.errorReports = this.errorReports.filter(
      report => report.context.timestamp! > cutoffTime
    );

    return initialCount - this.errorReports.length;
  }

  // Clear all error reports
  clearAllReports(): void {
    this.errorReports = [];
  }

  // Create security event from error
  createSecurityEvent(report: ErrorReport): any {
    return SecurityEventSchema.parse({
      type: this.mapErrorToEventType(report.error.type),
      severity: report.severity,
      userId: report.context.userId,
      apiKeyId: report.context.apiKeyId,
      ipAddress: report.context.ipAddress,
      userAgent: report.context.userAgent,
      endpoint: report.context.endpoint,
      method: report.context.method,
      statusCode: report.error.statusCode,
      details: {
        errorCode: report.error.code,
        originalMessage: report.error.message,
        userFriendlyMessage: report.userFriendlyMessage,
        metadata: report.context.metadata
      },
      timestamp: report.context.timestamp || new Date(),
      resolved: false
    });
  }

  // Map error type to security event type
  private mapErrorToEventType(errorType: SecurityErrorType): string {
    const mapping: Record<SecurityErrorType, string> = {
      [SecurityErrorType.AUTHENTICATION_ERROR]: 'LOGIN_FAILED',
      [SecurityErrorType.AUTHORIZATION_ERROR]: 'FORBIDDEN_ACCESS',
      [SecurityErrorType.VALIDATION_ERROR]: 'VALIDATION_ERROR',
      [SecurityErrorType.RATE_LIMIT_ERROR]: 'RATE_LIMIT_EXCEEDED',
      [SecurityErrorType.SECURITY_VIOLATION]: 'SECURITY_VIOLATION',
      [SecurityErrorType.THREAT_DETECTED]: 'SUSPICIOUS_ACTIVITY',
      [SecurityErrorType.POLICY_VIOLATION]: 'SECURITY_VIOLATION',
      [SecurityErrorType.SYSTEM_ERROR]: 'SYSTEM_ERROR'
    };

    return mapping[errorType] || 'SECURITY_VIOLATION';
  }
}

// Middleware for error handling
export function createErrorHandlerMiddleware(errorHandler: ErrorHandler) {
  return (error: Error, request: any, reply: any) => {
    const context: ErrorContext = {
      requestId: request.id || request.requestId,
      userId: request.user?.id,
      apiKeyId: request.apiKey?.id,
      ipAddress: request.ip || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      endpoint: request.url || request.path,
      method: request.method,
      metadata: {
        headers: request.headers,
        query: request.query,
        body: request.body
      }
    };

    const report = errorHandler.handleError(error, context);

    // Send appropriate response
    reply.status(report.error.statusCode).send({
      success: false,
      error: {
        type: report.error.type,
        code: report.error.code,
        message: report.userFriendlyMessage || report.error.message,
        requestId: report.context.requestId
      }
    });
  };
}

// Global error handler instance
export const globalErrorHandler = new ErrorHandler();

// Convenience functions
export function handleSecurityError(error: Error, context?: ErrorContext): ErrorReport {
  return globalErrorHandler.handleError(error, context);
}

export function onError(errorType: SecurityErrorType, callback: (error: SecurityError, context: ErrorContext) => void): void {
  globalErrorHandler.onError(errorType, callback);
}

export function onSecurityNotification(callback: (report: ErrorReport) => void): void {
  globalErrorHandler.onNotification(callback);
}

export function getSecurityErrorStats(timeRange?: { start: Date; end: Date }) {
  return globalErrorHandler.getErrorStats(timeRange);
}

// Error handling utilities
export function isSecurityError(error: Error): error is SecurityError {
  return error instanceof SecurityError;
}

export function createErrorContext(request: any): ErrorContext {
  return {
    requestId: request.id || request.requestId,
    userId: request.user?.id,
    apiKeyId: request.apiKey?.id,
    ipAddress: request.ip || request.connection?.remoteAddress,
    userAgent: request.headers['user-agent'],
    endpoint: request.url || request.path,
    method: request.method,
    timestamp: new Date(),
    metadata: {
      headers: request.headers,
      query: request.query,
      body: request.body
    }
  };
}

export function sanitizeErrorForLogging(error: Error): any {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    type: (error as SecurityError).type,
    code: (error as SecurityError).code,
    statusCode: (error as SecurityError).statusCode
  };
}
