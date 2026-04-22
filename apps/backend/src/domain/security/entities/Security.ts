import { z } from 'zod';

// Security Configuration
export const SecurityConfigSchema = z.object({
  authentication: z.object({
    enabled: z.boolean().default(true),
    jwt: z.object({
      secret: z.string().min(32),
      expiresIn: z.string().default('1h'),
      refreshExpiresIn: z.string().default('7d'),
      algorithm: z.enum(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']).default('HS256')
    }),
    apiKeys: z.object({
      enabled: z.boolean().default(true),
      headerName: z.string().default('X-API-Key'),
      minLength: z.number().min(16).default(32)
    })
  }),
  rateLimiting: z.object({
    enabled: z.boolean().default(true),
    windowMs: z.number().default(900000), // 15 minutes
    maxRequests: z.number().default(100),
    skipSuccessfulRequests: z.boolean().default(false),
    skipFailedRequests: z.boolean().default(false),
    trustProxy: z.boolean().default(false)
  }),
  validation: z.object({
    enabled: z.boolean().default(true),
    strictMode: z.boolean().default(true),
    sanitizeInput: z.boolean().default(true),
    sanitizeOutput: z.boolean().default(false),
    maxPayloadSize: z.number().default(10485760), // 10MB
    allowedMimeTypes: z.array(z.string()).default([
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain'
    ])
  }),
  cors: z.object({
    enabled: z.boolean().default(true),
    origin: z.union([
      z.string(),
      z.array(z.string()),
      z.boolean()
    ]).default(false),
    credentials: z.boolean().default(false),
    methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    allowedHeaders: z.array(z.string()).default([
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key'
    ])
  }),
  securityHeaders: z.object({
    enabled: z.boolean().default(true),
    hidePoweredBy: z.boolean().default(true),
    xssProtection: z.boolean().default(true),
    noSniff: z.boolean().default(true),
    frameguard: z.enum(['deny', 'sameorigin', 'allow-from']).default('deny'),
    hsts: z.object({
      enabled: z.boolean().default(true),
      maxAge: z.number().default(31536000),
      includeSubDomains: z.boolean().default(false),
      preload: z.boolean().default(false)
    }),
    contentSecurityPolicy: z.object({
      enabled: z.boolean().default(false),
      policy: z.string().optional()
    })
  }),
  logging: z.object({
    enabled: z.boolean().default(true),
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    logRequests: z.boolean().default(true),
    logErrors: z.boolean().default(true),
    logSecurity: z.boolean().default(true),
    sanitizeLogs: z.boolean().default(true)
  })
});

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

// Authentication Entities
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  passwordHash: z.string().min(60), // bcrypt hash
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  isActive: z.boolean().default(true),
  isEmailVerified: z.boolean().default(false),
  lastLoginAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.any()).optional()
});

export type User = z.infer<typeof UserSchema>;

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  keyHash: z.string().min(60),
  permissions: z.array(z.string()),
  isActive: z.boolean().default(true),
  lastUsedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  createdAt: z.date(),
  usageCount: z.number().default(0),
  rateLimit: z.object({
    windowMs: z.number(),
    maxRequests: z.number()
  }).optional()
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  token: z.string(),
  refreshToken: z.string(),
  expiresAt: z.date(),
  isActive: z.boolean().default(true),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.date(),
  lastAccessAt: z.date()
});

export type Session = z.infer<typeof SessionSchema>;

// Security Events
export const SecurityEventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGOUT',
    'TOKEN_REFRESH',
    'RATE_LIMIT_EXCEEDED',
    'INVALID_API_KEY',
    'PERMISSION_DENIED',
    'SUSPICIOUS_ACTIVITY',
    'SECURITY_VIOLATION',
    'DATA_BREACH_ATTEMPT',
    'BRUTE_FORCE_ATTEMPT',
    'XSS_ATTEMPT',
    'SQL_INJECTION_ATTEMPT',
    'CSRF_ATTEMPT',
    'VALIDATION_ERROR',
    'UNAUTHORIZED_ACCESS',
    'FORBIDDEN_ACCESS',
    'MALICIOUS_REQUEST'
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  userId: z.string().uuid().optional(),
  apiKeyId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  endpoint: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().optional(),
  details: z.record(z.any()).optional(),
  timestamp: z.date(),
  resolved: z.boolean().default(false),
  resolvedAt: z.date().optional(),
  resolvedBy: z.string().optional()
});

export type SecurityEvent = z.infer<typeof SecurityEventSchema>;

// Validation Schemas
export const ValidationErrorMessageSchema = z.object({
  field: z.string(),
  code: z.string(),
  value: z.any().optional(),
  constraints: z.record(z.any()).optional()
});

export type ValidationError = z.infer<typeof ValidationErrorMessageSchema>;

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorMessageSchema),
  warnings: z.array(ValidationErrorMessageSchema),
  sanitized: z.any().optional(),
  metadata: z.record(z.any()).optional()
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Rate Limiting
export const RateLimitInfoSchema = z.object({
  limit: z.number(),
  current: z.number(),
  remaining: z.number(),
  resetTime: z.date(),
  retryAfter: z.number().optional(),
  isExceeded: z.boolean()
});

export type RateLimitInfo = z.infer<typeof RateLimitInfoSchema>;

// Security Context
export const SecurityContextSchema = z.object({
  user: UserSchema.optional(),
  apiKey: ApiKeySchema.optional(),
  session: SessionSchema.optional(),
  permissions: z.array(z.string()),
  roles: z.array(z.string()),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
  timestamp: z.date(),
  isAuthenticated: z.boolean(),
  isAuthorized: z.boolean(),
  rateLimit: RateLimitInfoSchema.optional()
});

export type SecurityContext = z.infer<typeof SecurityContextSchema>;

// Security Policies
export const SecurityPolicySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum([
    'PASSWORD_POLICY',
    'SESSION_POLICY',
    'API_KEY_POLICY',
    'RATE_LIMIT_POLICY',
    'ACCESS_POLICY',
    'DATA_POLICY',
    'VALIDATION_POLICY',
    'LOGGING_POLICY'
  ]),
  rules: z.record(z.any()),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type SecurityPolicy = z.infer<typeof SecurityPolicySchema>;

// Threat Detection
export const ThreatLevelEnum = z.enum(['low', 'medium', 'high', 'critical']);

export type ThreatLevel = z.infer<typeof ThreatLevelEnum>;

export const ThreatDetectionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'BRUTE_FORCE',
    'DDOS_ATTACK',
    'SUSPICIOUS_PATTERN',
    'ANOMALOUS_BEHAVIOR',
    'DATA_EXFILTRATION',
    'UNAUTHORIZED_ACCESS',
    'MALICIOUS_PAYLOAD',
    'RECONNAISSANCE',
    'INJECTION_ATTACK',
    'SESSION_HIJACKING'
  ]),
  level: ThreatLevelEnum,
  confidence: z.number().min(0).max(1),
  source: z.string(),
  target: z.string().optional(),
  userId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  details: z.record(z.any()),
  detectedAt: z.date(),
  isResolved: z.boolean().default(false),
  resolvedAt: z.date().optional(),
  resolution: z.string().optional()
});

export type ThreatDetection = z.infer<typeof ThreatDetectionSchema>;

// Audit Log
export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  resource: z.string(),
  resourceType: z.string(),
  userId: z.string().uuid().optional(),
  apiKeyId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  changes: z.record(z.any()).optional(),
  previousState: z.any().optional(),
  newState: z.any().optional(),
  timestamp: z.date(),
  success: z.boolean(),
  errorMessage: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  requestId: z.string().optional()
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// Security Metrics
export const SecurityMetricsSchema = z.object({
  timestamp: z.date(),
  totalRequests: z.number(),
  successfulRequests: z.number(),
  failedRequests: z.number(),
  blockedRequests: z.number(),
  rateLimitHits: z.number(),
  authenticationFailures: z.number(),
  authorizationFailures: z.number(),
  validationErrors: z.number(),
  securityEvents: z.number(),
  threatsDetected: z.number(),
  activeUsers: z.number(),
  activeSessions: z.number(),
  averageResponseTime: z.number(),
  errorRate: z.number(),
  topEndpoints: z.array(z.object({
    endpoint: z.string(),
    count: z.number(),
    avgResponseTime: z.number()
  })),
  topErrors: z.array(z.object({
    error: z.string(),
    count: z.number()
  }))
});

export type SecurityMetrics = z.infer<typeof SecurityMetricsSchema>;

// Security Interfaces
export interface ISecurityService {
  authenticate(token: string): Promise<SecurityContext>;
  authorize(context: SecurityContext, resource: string, action: string): Promise<boolean>;
  validateInput(schema: z.ZodSchema, data: any): Promise<ValidationResult>;
  sanitizeInput(data: any): Promise<any>;
  checkRateLimit(context: SecurityContext, endpoint: string): Promise<RateLimitInfo>;
  logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void>;
  detectThreats(context: SecurityContext, request: any): Promise<ThreatDetection[]>;
  auditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void>;
  getSecurityMetrics(timeRange: { start: Date; end: Date }): Promise<SecurityMetrics>;
}

export interface IAuthenticationService {
  login(email: string, password: string, context?: any): Promise<{ user: User; tokens: { access: string; refresh: string } }>;
  logout(sessionId: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<{ access: string; refresh: string }>;
  validateToken(token: string): Promise<User | null>;
  createApiKey(userId: string, name: string, permissions: string[], expiresAt?: Date): Promise<ApiKey>;
  revokeApiKey(apiKeyId: string): Promise<void>;
  validateApiKey(apiKey: string): Promise<ApiKey | null>;
  getUserSessions(userId: string): Promise<Session[]>;
  revokeSession(sessionId: string): Promise<void>;
}

export interface IAuthorizationService {
  hasPermission(user: User, permission: string): boolean;
  hasRole(user: User, role: string): boolean;
  canAccessResource(user: User, resource: string, action: string): boolean;
  getPermissions(user: User): string[];
  getRoles(user: User): string[];
}

export interface IValidationService {
  validateSchema(schema: z.ZodSchema, data: any): ValidationResult;
  sanitizeData(data: any): any;
  validateEmail(email: string): boolean;
  validatePassword(password: string, policy: SecurityPolicy): ValidationResult;
  validateApiKey(apiKey: string): ValidationResult;
  validateJWT(token: string): ValidationResult;
}

export interface IRateLimitService {
  checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitInfo>;
  resetLimit(key: string): Promise<void>;
  getUsageStats(key: string, timeRange: { start: Date; end: Date }): Promise<number>;
  setCustomLimit(key: string, limit: number, windowMs: number): Promise<void>;
}

export interface ISecurityMonitoringService {
  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void>;
  getEvents(filters?: Partial<SecurityEvent>): Promise<SecurityEvent[]>;
  detectAnomalies(context: SecurityContext, request: any): Promise<ThreatDetection[]>;
  getMetrics(timeRange: { start: Date; end: Date }): Promise<SecurityMetrics>;
  generateSecurityReport(timeRange: { start: Date; end: Date }): Promise<any>;
  alertOnThreat(threat: ThreatDetection): Promise<void>;
}

export interface IAuditService {
  logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void>;
  getAuditLogs(filters?: Partial<AuditLog>): Promise<AuditLog[]>;
  getUserActivity(userId: string, timeRange: { start: Date; end: Date }): Promise<AuditLog[]>;
  getResourceHistory(resource: string, timeRange: { start: Date; end: Date }): Promise<AuditLog[]>;
  generateComplianceReport(timeRange: { start: Date; end: Date }): Promise<any>;
}

export interface ISecurityPolicyService {
  createPolicy(policy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityPolicy>;
  updatePolicy(id: string, updates: Partial<SecurityPolicy>): Promise<SecurityPolicy>;
  deletePolicy(id: string): Promise<void>;
  getPolicy(id: string): Promise<SecurityPolicy | null>;
  getPolicies(type?: string): Promise<SecurityPolicy[]>;
  evaluatePolicy(policy: SecurityPolicy, context: any): Promise<boolean>;
}

// Security Events
export const SecurityEventTypeEnum = {
  AUTHENTICATION_SUCCESS: 'LOGIN_SUCCESS',
  AUTHENTICATION_FAILURE: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  DATA_BREACH_ATTEMPT: 'DATA_BREACH_ATTEMPT',
  BRUTE_FORCE_ATTEMPT: 'BRUTE_FORCE_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  CSRF_ATTEMPT: 'CSRF_ATTEMPT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  FORBIDDEN_ACCESS: 'FORBIDDEN_ACCESS',
  MALICIOUS_REQUEST: 'MALICIOUS_REQUEST'
} as const;

export type SecurityEventType = typeof SecurityEventTypeEnum[keyof typeof SecurityEventTypeEnum];

export const ThreatTypeEnum = {
  BRUTE_FORCE: 'BRUTE_FORCE',
  DDOS_ATTACK: 'DDOS_ATTACK',
  SUSPICIOUS_PATTERN: 'SUSPICIOUS_PATTERN',
  ANOMALOUS_BEHAVIOR: 'ANOMALOUS_BEHAVIOR',
  DATA_EXFILTRATION: 'DATA_EXFILTRATION',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  MALICIOUS_PAYLOAD: 'MALICIOUS_PAYLOAD',
  RECONNAISSANCE: 'RECONNAISSANCE',
  INJECTION_ATTACK: 'INJECTION_ATTACK',
  SESSION_HIJACKING: 'SESSION_HIJACKING'
} as const;

export type ThreatType = typeof ThreatTypeEnum[keyof typeof ThreatTypeEnum];


export const SecurityPolicyTypeEnum = {
  PASSWORD_POLICY: 'PASSWORD_POLICY',
  SESSION_POLICY: 'SESSION_POLICY',
  API_KEY_POLICY: 'API_KEY_POLICY',
  RATE_LIMIT_POLICY: 'RATE_LIMIT_POLICY',
  ACCESS_POLICY: 'ACCESS_POLICY',
  DATA_POLICY: 'DATA_POLICY',
  VALIDATION_POLICY: 'VALIDATION_POLICY',
  LOGGING_POLICY: 'LOGGING_POLICY'
} as const;

export type SecurityPolicyType = typeof SecurityPolicyTypeEnum[keyof typeof SecurityPolicyTypeEnum];

// Error Types
export enum SecurityErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  THREAT_DETECTED = 'THREAT_DETECTED',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

// Security Error
export class SecurityError extends Error {
  public readonly type: SecurityErrorType;
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    type: SecurityErrorType,
    message: string,
    code: string,
    statusCode: number = 500,
    details?: any,
    requestId?: string
  ) {
    super(message);
    this.name = 'SecurityError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    this.requestId = requestId;
  }
}

// Common Security Errors
export class AuthenticationError extends SecurityError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      SecurityErrorType.AUTHENTICATION_ERROR,
      message,
      'AUTH_FAILED',
      401,
      details,
      requestId
    );
  }
}

export class AuthorizationError extends SecurityError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      SecurityErrorType.AUTHORIZATION_ERROR,
      message,
      'AUTHZ_FAILED',
      403,
      details,
      requestId
    );
  }
}

export class InputValidationError extends SecurityError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      SecurityErrorType.VALIDATION_ERROR,
      message,
      'VALIDATION_FAILED',
      400,
      details,
      requestId
    );
  }
}

export class RateLimitError extends SecurityError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      SecurityErrorType.RATE_LIMIT_ERROR,
      message,
      'RATE_LIMIT_EXCEEDED',
      429,
      details,
      requestId
    );
  }
}

export class SecurityViolationError extends SecurityError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      SecurityErrorType.SECURITY_VIOLATION,
      message,
      'SECURITY_VIOLATION',
      403,
      details,
      requestId
    );
  }
}

export class ThreatDetectedError extends SecurityError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      SecurityErrorType.THREAT_DETECTED,
      message,
      'THREAT_DETECTED',
      403,
      details,
      requestId
    );
  }
}
