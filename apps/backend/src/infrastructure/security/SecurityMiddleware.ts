import { FastifyRequest, FastifyReply } from 'fastify';
import { 
  SecurityConfig,
  SecurityContext
} from '@/domain/security/entities/Security';
import { ValidationService } from './ValidationService';
import { RateLimitService } from './RateLimitService';
import { AuthenticationService } from './AuthenticationService';
import { ErrorHandler } from './ErrorHandler';
import { 
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  SecurityViolationError
} from '@/domain/security/entities/Security';

// Extend FastifyRequest to include security properties
declare module 'fastify' {
  interface FastifyRequest {
    securityContext?: SecurityContext;
    user?: any;
    apiKey?: any;
  }
}

export class SecurityMiddleware {
  private validationService: ValidationService;
  private rateLimitService: RateLimitService;
  private authService: AuthenticationService;
  private errorHandler: ErrorHandler;
  private config: SecurityConfig;

  constructor(
    validationService: ValidationService,
    rateLimitService: RateLimitService,
    authService: AuthenticationService,
    errorHandler: ErrorHandler,
    config: SecurityConfig
  ) {
    this.validationService = validationService;
    this.rateLimitService = rateLimitService;
    this.authService = authService;
    this.errorHandler = errorHandler;
    this.config = config;
  }

  // Main security middleware
  createSecurityMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // 1. Apply security headers
        this.applySecurityHeaders(reply);

        // 2. Content type validation
        await this.validateContentType(request);

        // 3. Input size validation
        await this.validateInputSize(request);

        // 4. IP-based security checks
        await this.performIPSecurityChecks(request);

        // 5. Rate limiting
        await this.applyRateLimiting(request, reply);

        // 6. Authentication
        await this.performAuthentication(request);

        // 7. Request sanitization
        await this.sanitizeRequest(request);

        // 8. Add security context
        request.securityContext = await this.authService.createSecurityContext(request);

      } catch (error) {
        const report = this.errorHandler.handleError(error as Error, {
          requestId: request.id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          endpoint: request.url,
          method: request.method
        });

        reply.status(report.error.statusCode).send({
          success: false,
          error: {
            type: report.error.type,
            code: report.error.code,
            message: report.userFriendlyMessage,
            requestId: report.context.requestId
          }
        });
      }
    };
  }

  // Security headers middleware
  createSecurityHeadersMiddleware() {
    return (request: FastifyRequest, reply: FastifyReply) => {
      this.applySecurityHeaders(reply);
    };
  }

  // CORS middleware
  createCorsMiddleware() {
    return (request: FastifyRequest, reply: FastifyReply) => {
      if (!this.config.cors.enabled) {
        return;
      }

      const origin = request.headers.origin as string | undefined;
      const allowedOrigins = this.config.cors.origin;

      // Handle origin
      if (allowedOrigins === false) {
        // No CORS allowed
        if (origin) {
          reply.status(403).send('CORS policy violation');
          return;
        }
      } else if (allowedOrigins === true || allowedOrigins === '*') {
        // Allow all origins
        reply.header('Access-Control-Allow-Origin', '*');
      } else if (Array.isArray(allowedOrigins)) {
        // Check if origin is in allowed list
        if (origin && allowedOrigins.includes(origin)) {
          reply.header('Access-Control-Allow-Origin', origin);
        } else if (origin) {
          reply.status(403).send('Origin not allowed');
          return;
        }
      } else if (typeof allowedOrigins === 'string') {
        reply.header('Access-Control-Allow-Origin', allowedOrigins as string);
      }

      // Handle credentials
      if (this.config.cors.credentials) {
        reply.header('Access-Control-Allow-Credentials', 'true');
      }

      // Handle methods
      reply.header('Access-Control-Allow-Methods', 
        this.config.cors.methods.join(', ')
      );

      // Handle headers
      reply.header('Access-Control-Allow-Headers', 
        this.config.cors.allowedHeaders.join(', ')
      );

      // Handle preflight
      if (request.method === 'OPTIONS') {
        reply.status(200).send();
        return;
      }
    };
  }

  // Authentication middleware
  createAuthMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        request.securityContext = await this.authService.createSecurityContext(request);
        request.user = request.securityContext.user;
        request.apiKey = request.securityContext.apiKey;
      } catch (error) {
        throw new AuthenticationError('Authentication failed');
      }
    };
  }

  // Require authentication middleware
  createRequireAuthMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.securityContext?.isAuthenticated) {
        throw new AuthenticationError('Authentication required');
      }
    };
  }

  // Require permission middleware
  createRequirePermissionMiddleware(permission: string) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.securityContext?.isAuthenticated) {
        throw new AuthenticationError('Authentication required');
      }

      if (!request.securityContext.permissions.includes(permission)) {
        throw new AuthorizationError(`Permission '${permission}' required`);
      }
    };
  }

  // Require role middleware
  createRequireRoleMiddleware(role: string) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.securityContext?.isAuthenticated) {
        throw new AuthenticationError('Authentication required');
      }

      if (!request.securityContext.roles.includes(role)) {
        throw new AuthorizationError(`Role '${role}' required`);
      }
    };
  }

  // Rate limiting middleware
  createRateLimitMiddleware(options?: {
    keyGenerator?: (request: FastifyRequest) => string;
    skip?: (request: FastifyRequest) => boolean;
    limit?: number;
    windowMs?: number;
  }) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (options?.skip?.(request)) {
        return;
      }

      const key = options?.keyGenerator?.(request) || this.generateRateLimitKey(request);
      const limit = options?.limit || this.config.rateLimiting.maxRequests;
      const windowMs = options?.windowMs || this.config.rateLimiting.windowMs;

      try {
        const info = await this.rateLimitService.checkLimit(key, limit, windowMs);

        // Add rate limit headers
        reply.header('X-RateLimit-Limit', info.limit);
        reply.header('X-RateLimit-Remaining', info.remaining);
        reply.header('X-RateLimit-Reset', Math.ceil(info.resetTime.getTime() / 1000));

      } catch (error) {
        if (error instanceof RateLimitError) {
          // Add rate limit headers for exceeded requests
          reply.header('X-RateLimit-Limit', error.details.limit);
          reply.header('X-RateLimit-Remaining', 0);
          reply.header('X-RateLimit-Reset', Math.ceil(error.details.resetTime.getTime() / 1000));
          reply.header('Retry-After', error.details.retryAfter);
          
          throw error;
        }
        throw error;
      }
    };
  }

  // Input validation middleware
  createValidationMiddleware(schema: any, options?: {
    body?: boolean;
    query?: boolean;
    params?: boolean;
    headers?: boolean;
  }) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const validationOptions = {
        body: options?.body !== false,
        query: options?.query !== false,
        params: options?.params !== false,
        headers: options?.headers !== false
      };

      // Validate body
      if (validationOptions.body && request.body) {
        const result = this.validationService.validateSchema(schema, request.body);
        if (!result.isValid) {
          const errorMessages = result.errors.map(e => {
            const error = e as any;
            return error.message || error.code || 'Validation error';
          });
          throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
        }
        request.body = result.sanitized;
      }

      // Validate query parameters
      if (validationOptions.query && request.query) {
        const result = this.validationService.validateSchema(schema, request.query);
        if (!result.isValid) {
          const errorMessages = result.errors.map(e => {
            const error = e as any;
            return error.message || error.code || 'Validation error';
          });
          throw new Error(`Query validation failed: ${errorMessages.join(', ')}`);
        }
        request.query = result.sanitized;
      }

      // Validate path parameters
      if (validationOptions.params && request.params) {
        const result = this.validationService.validateSchema(schema, request.params);
        if (!result.isValid) {
          const errorMessages = result.errors.map(e => {
            const error = e as any;
            return error.message || error.code || 'Validation error';
          });
          throw new Error(`Params validation failed: ${errorMessages.join(', ')}`);
        }
        request.params = result.sanitized;
      }

      // Validate headers
      if (validationOptions.headers && request.headers) {
        const result = this.validationService.validateSchema(schema, request.headers);
        if (!result.isValid) {
          const errorMessages = result.errors.map(e => {
            const error = e as any;
            return error.message || error.code || 'Validation error';
          });
          throw new Error(`Headers validation failed: ${errorMessages.join(', ')}`);
        }
        request.headers = result.sanitized;
      }
    };
  }

  // Request sanitization middleware
  createSanitizationMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      await this.sanitizeRequest(request);
      await this.sanitizeResponse(reply);
    };
  }

  // IP-based security middleware
  createIPSecurityMiddleware(options?: {
    blockList?: string[];
    allowList?: string[];
    maxRequestsPerIP?: number;
    timeWindowMs?: number;
  }) {
    const blockedIPs = new Set(options?.blockList || []);
    const allowedIPs = new Set(options?.allowList || []);

    return async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = request.ip || request.connection?.remoteAddress;

      if (!ip) {
        throw new SecurityViolationError('Unable to determine client IP');
      }

      // Check block list
      if (blockedIPs.has(ip)) {
        throw new SecurityViolationError('IP address blocked');
      }

      // Check allow list (if specified)
      if (allowedIPs.size > 0 && !allowedIPs.has(ip)) {
        throw new SecurityViolationError('IP address not allowed');
      }

      // Check IP rate limiting
      if (options?.maxRequestsPerIP) {
        const key = `ip:${ip}`;
        const windowMs = options.timeWindowMs || this.config.rateLimiting.windowMs;
        
        try {
          await this.rateLimitService.checkLimit(key, options.maxRequestsPerIP, windowMs);
        } catch (error) {
          if (error instanceof RateLimitError) {
            throw new SecurityViolationError('IP rate limit exceeded');
          }
          throw error;
        }
      }
    };
  }

  // User agent validation middleware
  createUserAgentValidationMiddleware(options?: {
    blockList?: string[];
    allowList?: string[];
    requireUserAgent?: boolean;
  }) {
    const blockedUserAgents = options?.blockList?.map(pattern => new RegExp(pattern, 'i')) || [];
    const allowedUserAgents = options?.allowList?.map(pattern => new RegExp(pattern, 'i')) || [];

    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userAgent = request.headers['user-agent'] as string | undefined;

      if (options?.requireUserAgent && !userAgent) {
        throw new SecurityViolationError('User-Agent header required');
      }

      if (userAgent) {
        // Check block list
        for (const pattern of blockedUserAgents) {
          if (pattern.test(userAgent)) {
            throw new SecurityViolationError('User-Agent blocked');
          }
        }

        // Check allow list
        if (allowedUserAgents.length > 0) {
          const isAllowed = allowedUserAgents.some(pattern => pattern.test(userAgent));
          if (!isAllowed) {
            throw new SecurityViolationError('User-Agent not allowed');
          }
        }
      }
    };
  }

  // Private helper methods

  private applySecurityHeaders(reply: FastifyReply): void {
    if (!this.config.securityHeaders.enabled) {
      return;
    }

    // Hide server information
    if (this.config.securityHeaders.hidePoweredBy) {
      reply.header('X-Powered-By', '');
      reply.removeHeader('Server');
    }

    // XSS Protection
    if (this.config.securityHeaders.xssProtection) {
      reply.header('X-XSS-Protection', '1; mode=block');
    }

    // Content type options
    if (this.config.securityHeaders.noSniff) {
      reply.header('X-Content-Type-Options', 'nosniff');
    }

    // Frame protection
    if (this.config.securityHeaders.frameguard) {
      const frameguard = this.config.securityHeaders.frameguard;
      if (frameguard === 'deny') {
        reply.header('X-Frame-Options', 'DENY');
      } else if (frameguard === 'sameorigin') {
        reply.header('X-Frame-Options', 'SAMEORIGIN');
      } else if (frameguard === 'allow-from') {
        reply.header('X-Frame-Options', `ALLOW-FROM ${this.config.securityHeaders.frameguard}`);
      }
    }

    // HSTS
    if (this.config.securityHeaders.hsts.enabled) {
      const hsts = this.config.securityHeaders.hsts;
      let hstsValue = `max-age=${hsts.maxAge}`;
      
      if (hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      
      if (hsts.preload) {
        hstsValue += '; preload';
      }
      
      reply.header('Strict-Transport-Security', hstsValue);
    }

    // Content Security Policy
    if (this.config.securityHeaders.contentSecurityPolicy.enabled && this.config.securityHeaders.contentSecurityPolicy.policy) {
      reply.header('Content-Security-Policy', this.config.securityHeaders.contentSecurityPolicy.policy);
    }

    // Additional security headers
    reply.header('X-Content-Security-Policy', 'default-src \'self\'');
    reply.header('X-Download-Options', 'noopen');
    reply.header('X-Permitted-Cross-Domain-Policies', 'none');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  private async validateContentType(request: FastifyRequest): Promise<void> {
    if (!this.config.validation.enabled) {
      return;
    }

    const contentType = request.headers['content-type'];
    const result = this.validationService.validateContentType(contentType || '');
    
    if (!result.isValid) {
      throw new Error(`Invalid content type: ${result.errors.map(e => e.message).join(', ')}`);
    }
  }

  private async validateInputSize(request: FastifyRequest): Promise<void> {
    if (!this.config.validation.enabled) {
      return;
    }

    const result = this.validationService.validateInputSize({
      body: request.body,
      query: request.query,
      params: request.params,
      headers: request.headers
    });
    
    if (!result.isValid) {
      throw new Error(`Input size validation failed: ${result.errors.map(e => e.message).join(', ')}`);
    }
  }

  private async performIPSecurityChecks(request: FastifyRequest): Promise<void> {
    // Basic IP validation
    const ip = request.ip || request.connection?.remoteAddress;
    if (!ip) {
      throw new SecurityViolationError('Unable to determine client IP');
    }

    // Check for private/internal IPs if needed
    if (this.isPrivateIP(ip) && !this.isAllowedInternalIP(ip)) {
      throw new SecurityViolationError('Internal IP access not allowed');
    }
  }

  private async applyRateLimiting(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!this.config.rateLimiting.enabled) {
      return;
    }

    const key = this.generateRateLimitKey(request);
    
    try {
      const info = await this.rateLimitService.checkLimit(
        key,
        this.config.rateLimiting.maxRequests,
        this.config.rateLimiting.windowMs
      );

      // Add rate limit headers
      reply.header('X-RateLimit-Limit', info.limit);
      reply.header('X-RateLimit-Remaining', info.remaining);
      reply.header('X-RateLimit-Reset', Math.ceil(info.resetTime.getTime() / 1000));

    } catch (error) {
      if (error instanceof RateLimitError) {
        // Add rate limit headers for exceeded requests
        reply.header('X-RateLimit-Limit', error.details.limit);
        reply.header('X-RateLimit-Remaining', 0);
        reply.header('X-RateLimit-Reset', Math.ceil(error.details.resetTime.getTime() / 1000));
        reply.header('Retry-After', error.details.retryAfter);
        
        throw error;
      }
      throw error;
    }
  }

  private async performAuthentication(request: FastifyRequest): Promise<void> {
    if (!this.config.authentication.enabled) {
      return;
    }

    // Authentication is handled by the auth middleware
    // This method can be used for additional auth checks
  }

  private async sanitizeRequest(request: FastifyRequest): Promise<void> {
    if (!this.config.validation.sanitizeInput) {
      return;
    }

    // Sanitize request body
    if (request.body) {
      request.body = this.validationService.sanitizeData(request.body);
    }

    // Sanitize query parameters
    if (request.query) {
      request.query = this.validationService.sanitizeData(request.query);
    }

    // Sanitize path parameters
    if (request.params) {
      request.params = this.validationService.sanitizeData(request.params);
    }
  }

  private async sanitizeResponse(reply: FastifyReply): Promise<void> {
    if (!this.config.validation.sanitizeOutput) {
      return;
    }

    // Response sanitization would be handled in a response hook
    // This is a placeholder for future implementation
  }

  private generateRateLimitKey(request: FastifyRequest): string {
    const ip = request.ip || request.connection?.remoteAddress;
    const userId = request.user?.id;
    const apiKey = request.apiKey?.id;

    if (userId) return `user:${userId}`;
    if (apiKey) return `apikey:${apiKey}`;
    return `ip:${ip}`;
  }

  private isPrivateIP(ip: string): boolean {
    // Check for private IP ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ];

    return privateRanges.some(range => range.test(ip));
  }

  private isAllowedInternalIP(ip: string): boolean {
    // Define allowed internal IPs (if any)
    const allowedInternalIPs = [
      '127.0.0.1',
      '::1'
    ];

    return allowedInternalIPs.includes(ip);
  }
}

// Factory functions for common middleware combinations

export function createCompleteSecurityMiddleware(
  validationService: ValidationService,
  rateLimitService: RateLimitService,
  authService: AuthenticationService,
  errorHandler: ErrorHandler,
  config: SecurityConfig
) {
  const securityMiddleware = new SecurityMiddleware(
    validationService,
    rateLimitService,
    authService,
    errorHandler,
    config
  );

  return [
    securityMiddleware.createSecurityHeadersMiddleware(),
    securityMiddleware.createCorsMiddleware(),
    securityMiddleware.createRateLimitMiddleware(),
    securityMiddleware.createAuthMiddleware(),
    securityMiddleware.createSanitizationMiddleware()
  ];
}

export function createAPISecurityMiddleware(
  validationService: ValidationService,
  rateLimitService: RateLimitService,
  authService: AuthenticationService,
  errorHandler: ErrorHandler,
  config: SecurityConfig
) {
  const securityMiddleware = new SecurityMiddleware(
    validationService,
    rateLimitService,
    authService,
    errorHandler,
    config
  );

  return [
    securityMiddleware.createSecurityHeadersMiddleware(),
    securityMiddleware.createCorsMiddleware(),
    securityMiddleware.createRateLimitMiddleware(),
    securityMiddleware.createRequireAuthMiddleware(),
    securityMiddleware.createSanitizationMiddleware()
  ];
}

export function createPublicSecurityMiddleware(
  validationService: ValidationService,
  rateLimitService: RateLimitService,
  errorHandler: ErrorHandler,
  config: SecurityConfig
) {
  const securityMiddleware = new SecurityMiddleware(
    validationService,
    rateLimitService,
    null as any, // No auth for public endpoints
    errorHandler,
    config
  );

  return [
    securityMiddleware.createSecurityHeadersMiddleware(),
    securityMiddleware.createCorsMiddleware(),
    securityMiddleware.createRateLimitMiddleware({
      limit: config.rateLimiting.maxRequests / 2, // Lower limit for public endpoints
      windowMs: config.rateLimiting.windowMs
    }),
    securityMiddleware.createSanitizationMiddleware()
  ];
}
