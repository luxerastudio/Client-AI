import { z } from 'zod';
import { 
  IValidationService,
  ValidationErrorMessageSchema,
  ValidationResultSchema,
  SecurityPolicySchema,
  UserSchema,
  ApiKeySchema,
  SecurityConfig,
  ValidationResult
} from '@/domain/security/entities/Security';
import { SecurityError, InputValidationError } from '@/domain/security/entities/Security';

export class ValidationService implements IValidationService {
  private config: SecurityConfig;
  private sanitizeConfig: {
    allowedTags: string[];
    allowedAttributes: Record<string, string[]>;
    allowedSchemes: string[];
  };

  constructor(config: SecurityConfig) {
    this.config = config;
    this.sanitizeConfig = {
      allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      allowedAttributes: {
        'a': ['href', 'title', 'target'],
        '*': ['class', 'id']
      },
      allowedSchemes: ['http', 'https', 'mailto', 'tel']
    };
  }

  validateSchema(schema: z.ZodSchema, data: any): ValidationResult {
    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        return ValidationResultSchema.parse({
          isValid: true,
          errors: [],
          warnings: [],
          sanitized: result.data
        });
      }

      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
        value: (issue as any).received,
        constraints: {
          expected: (issue as any).expected,
          minimum: (issue as any).minimum,
          maximum: (issue as any).maximum
        }
      }));

      return ValidationResultSchema.parse({
        isValid: false,
        errors,
        warnings: [],
        sanitized: data
      });
    } catch (error) {
      return ValidationResultSchema.parse({
        isValid: false,
        errors: [{
          field: 'unknown',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'VALIDATION_ERROR',
          value: data
        }],
        warnings: [],
        sanitized: data
      });
    }
  }

  sanitizeData(data: any): any {
    if (!this.config.validation.sanitizeInput) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }

    return data;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string, policy: z.infer<typeof SecurityPolicySchema>): ValidationResult {
    const rules = policy.rules;
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check minimum length
    if (password.length < (rules.minLength || 8)) {
      errors.push({
        field: 'password',
        message: `Password must be at least ${rules.minLength || 8} characters long`,
        code: 'PASSWORD_TOO_SHORT',
        value: password.length
      });
    }

    // Check maximum length
    if (password.length > (rules.maxLength || 128)) {
      errors.push({
        field: 'password',
        message: `Password must not exceed ${rules.maxLength || 128} characters`,
        code: 'PASSWORD_TOO_LONG',
        value: password.length
      });
    }

    // Check for uppercase letters
    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one uppercase letter',
        code: 'PASSWORD_MISSING_UPPERCASE',
        value: password
      });
    }

    // Check for lowercase letters
    if (rules.requireLowercase && !/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one lowercase letter',
        code: 'PASSWORD_MISSING_LOWERCASE',
        value: password
      });
    }

    // Check for numbers
    if (rules.requireNumbers && !/\d/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one number',
        code: 'PASSWORD_MISSING_NUMBER',
        value: password
      });
    }

    // Check for special characters
    if (rules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one special character',
        code: 'PASSWORD_MISSING_SPECIAL',
        value: password
      });
    }

    // Check for common passwords
    if (rules.checkCommonPasswords && this.isCommonPassword(password)) {
      errors.push({
        field: 'password',
        message: 'Password is too common and easily guessable',
        code: 'PASSWORD_TOO_COMMON',
        value: password
      });
    }

    // Check for personal information
    if (rules.checkPersonalInfo && this.containsPersonalInfo(password)) {
      warnings.push({
        field: 'password',
        message: 'Password may contain personal information',
        code: 'PASSWORD_CONTAINS_PERSONAL_INFO',
        value: password
      });
    }

    // Check for repeated characters
    if (rules.maxRepeatedChars && this.hasRepeatedChars(password, rules.maxRepeatedChars)) {
      errors.push({
        field: 'password',
        message: `Password cannot contain more than ${rules.maxRepeatedChars} repeated characters`,
        code: 'PASSWORD_TOO_MANY_REPEATED',
        value: password
      });
    }

    return ValidationResultSchema.parse({
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitized: password
    });
  }

  validateApiKey(apiKey: string): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check minimum length
    if (apiKey.length < this.config.authentication.apiKeys.minLength) {
      errors.push({
        field: 'apiKey',
        message: `API key must be at least ${this.config.authentication.apiKeys.minLength} characters long`,
        code: 'API_KEY_TOO_SHORT',
        value: apiKey.length
      });
    }

    // Check for valid characters (alphanumeric and some special chars)
    if (!/^[a-zA-Z0-9\-_]+$/.test(apiKey)) {
      errors.push({
        field: 'apiKey',
        message: 'API key can only contain letters, numbers, hyphens, and underscores',
        code: 'API_KEY_INVALID_CHARS',
        value: apiKey
      });
    }

    // Check for common patterns
    if (this.isCommonApiKeyPattern(apiKey)) {
      warnings.push({
        field: 'apiKey',
        message: 'API key follows a common pattern and may be less secure',
        code: 'API_KEY_COMMON_PATTERN',
        value: apiKey
      });
    }

    return ValidationResultSchema.parse({
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitized: apiKey
    });
  }

  validateJWT(token: string): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check JWT format (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      errors.push({
        field: 'jwt',
        message: 'JWT must have 3 parts separated by dots',
        code: 'JWT_INVALID_FORMAT',
        value: token
      });
    }

    try {
      // Try to decode header
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      
      // Check algorithm
      if (!header.alg) {
        errors.push({
          field: 'jwt',
          message: 'JWT header must specify algorithm',
          code: 'JWT_MISSING_ALGORITHM',
          value: header
        });
      }

      // Check for insecure algorithms
      const insecureAlgorithms = ['none', 'HS1', 'RS1'];
      if (insecureAlgorithms.includes(header.alg)) {
        errors.push({
          field: 'jwt',
          message: `JWT algorithm '${header.alg}' is not secure`,
          code: 'JWT_INSECURE_ALGORITHM',
          value: header.alg
        });
      }

    } catch (error) {
      errors.push({
        field: 'jwt',
        message: 'JWT header is not valid base64 encoded JSON',
        code: 'JWT_INVALID_HEADER',
        value: parts[0]
      });
    }

    try {
      // Try to decode payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        errors.push({
          field: 'jwt',
          message: 'JWT has expired',
          code: 'JWT_EXPIRED',
          value: new Date(payload.exp * 1000)
        });
      }

      // Check not before
      if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) {
        errors.push({
          field: 'jwt',
          message: 'JWT is not yet valid',
          code: 'JWT_NOT_YET_VALID',
          value: new Date(payload.nbf * 1000)
        });
      }

      // Check issued at
      if (payload.iat && payload.iat > Math.floor(Date.now() / 1000)) {
        warnings.push({
          field: 'jwt',
          message: 'JWT issued at time is in the future',
          code: 'JWT_FUTURE_IAT',
          value: new Date(payload.iat * 1000)
        });
      }

    } catch (error) {
      errors.push({
        field: 'jwt',
        message: 'JWT payload is not valid base64 encoded JSON',
        code: 'JWT_INVALID_PAYLOAD',
        value: parts[1]
      });
    }

    return ValidationResultSchema.parse({
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitized: token
    });
  }

  validateInputSize(data: any): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const size = JSON.stringify(data).length;
    
    if (size > this.config.validation.maxPayloadSize) {
      errors.push({
        field: 'payload',
        message: `Input size (${size} bytes) exceeds maximum allowed size (${this.config.validation.maxPayloadSize} bytes)`,
        code: 'PAYLOAD_TOO_LARGE',
        value: size
      });
    }

    if (size > this.config.validation.maxPayloadSize * 0.8) {
      warnings.push({
        field: 'payload',
        message: `Input size (${size} bytes) is close to maximum allowed size`,
        code: 'PAYLOAD_NEAR_LIMIT',
        value: size
      });
    }

    return ValidationResultSchema.parse({
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitized: data
    });
  }

  validateContentType(contentType: string): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!contentType) {
      errors.push({
        field: 'contentType',
        message: 'Content-Type header is required',
        code: 'MISSING_CONTENT_TYPE',
        value: contentType
      });
    } else if (!this.config.validation.allowedMimeTypes.includes(contentType)) {
      errors.push({
        field: 'contentType',
        message: `Content-Type '${contentType}' is not allowed`,
        code: 'INVALID_CONTENT_TYPE',
        value: contentType
      });
    }

    return ValidationResultSchema.parse({
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitized: contentType
    });
  }

  validateUserInput(input: string, context: {
    field: string;
    maxLength?: number;
    allowHtml?: boolean;
    allowSpecialChars?: boolean;
  }): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check length
    if (context.maxLength && input.length > context.maxLength) {
      errors.push({
        field: context.field,
        message: `Input exceeds maximum length of ${context.maxLength} characters`,
        code: 'INPUT_TOO_LONG',
        value: input.length
      });
    }

    // Check for HTML if not allowed
    if (!context.allowHtml && /<[^>]*>/.test(input)) {
      errors.push({
        field: context.field,
        message: 'HTML tags are not allowed in this field',
        code: 'HTML_NOT_ALLOWED',
        value: input
      });
    }

    // Check for potentially dangerous characters
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        errors.push({
          field: context.field,
          message: 'Input contains potentially dangerous content',
          code: 'DANGEROUS_CONTENT',
          value: input
        });
        break;
      }
    }

    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|\/\*|\*\/|;|'|")/
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        warnings.push({
          field: context.field,
          message: 'Input contains characters that could be used in SQL injection',
          code: 'SQL_INJECTION_RISK',
          value: input
        });
        break;
      }
    }

    return ValidationResultSchema.parse({
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitized: context.allowHtml ? input : this.sanitizeString(input)
    });
  }

  // Private helper methods

  private sanitizeString(input: string): string {
    // Basic HTML sanitization
    let sanitized = input;
    
    // Remove dangerous tags
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'link', 'meta'];
    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });
    
    // Remove dangerous attributes
    const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'];
    dangerousAttrs.forEach(attr => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });
    
    // Remove dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
    dangerousProtocols.forEach(protocol => {
      const regex = new RegExp(protocol, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  private containsPersonalInfo(password: string): boolean {
    // Check for common personal info patterns
    const patterns = [
      /\b\d{4}\b/, // 4-digit numbers (years)
      /\b\d{2}\/\d{2}\/\d{4}\b/, // Dates
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b[A-Za-z]{2}\d{4}\b/ // License plate pattern
    ];

    return patterns.some(pattern => pattern.test(password));
  }

  private hasRepeatedChars(password: string, maxRepeats: number): boolean {
    const charCounts = new Map<string, number>();
    
    for (const char of password) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
      if (charCounts.get(char)! > maxRepeats) {
        return true;
      }
    }
    
    return false;
  }

  private isCommonApiKeyPattern(apiKey: string): boolean {
    const commonPatterns = [
      /^test-/, /^dev-/, /^prod-/,
      /-test$/, /-dev$/, /-prod$/,
      /^api-/, /-api$/,
      /^key-/, /-key$/
    ];

    return commonPatterns.some(pattern => pattern.test(apiKey));
  }

  // Utility methods for common validations

  static createEmailValidator(): z.ZodString {
    return z.string().email().min(5).max(255);
  }

  static createPasswordValidator(minLength: number = 8): z.ZodString {
    return z.string()
      .min(minLength, `Password must be at least ${minLength} characters`)
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');
  }

  static createUsernameValidator(): z.ZodString {
    return z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores');
  }

  static createIdValidator(): z.ZodString {
    return z.string().uuid('Invalid ID format');
  }

  static createApiKeyValidator(): z.ZodString {
    return z.string()
      .min(32, 'API key must be at least 32 characters')
      .max(128, 'API key must not exceed 128 characters')
      .regex(/^[a-zA-Z0-9\-_]+$/, 'API key can only contain letters, numbers, hyphens, and underscores');
  }

  static createPaginationValidator(): z.ZodObject<any> {
    return z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      sort: z.string().optional(),
      order: z.enum(['asc', 'desc']).default('desc')
    });
  }

  static createDateRangeValidator() {
    return z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional()
    }).refine(
      (data) => {
        if (data.start && data.end) {
          return new Date(data.start) <= new Date(data.end);
        }
        return true;
      },
      {
        message: 'Start date must be before end date',
        path: ['start']
      }
    );
  }

  // Additional sanitization methods for security routes
  sanitizeRequest(data: any, options?: any): any {
    return this.sanitizeData(data);
  }

  sanitizeResponse(data: any, options?: any): any {
    return this.sanitizeData(data);
  }

  sanitizeStringPublic(data: string, options?: any): string {
    if (typeof data !== 'string') {
      return String(data);
    }
    
    // Use the private sanitizeString method
    return this.sanitizeString(data);
  }

  sanitizeHTML(data: string, options?: any): string {
    if (typeof data !== 'string') {
      return String(data);
    }
    
    // Basic HTML sanitization
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/javascript:/gi, '');
  }

  sanitize(data: any, options?: any): any {
    return this.sanitizeData(data);
  }
}
