import { SecurityConfig } from '@/domain/security/entities/Security';

export interface SanitizationOptions {
  removeHTML?: boolean;
  removeScripts?: boolean;
  removeStyles?: boolean;
  removeComments?: boolean;
  normalizeWhitespace?: boolean;
  escapeHTML?: boolean;
  maxLength?: number;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  customSanitizers?: Array<(input: string) => string>;
}

export class SanitizationService {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  // Main sanitization method
  sanitize(input: any, options: SanitizationOptions = {}): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input, options);
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitize(item, options));
    }

    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeKey(key)] = this.sanitize(value, options);
      }
      return sanitized;
    }

    return input;
  }

  // String sanitization
  sanitizeString(input: string, options: SanitizationOptions = {}): string {
    let sanitized = input;

    // Apply length limit
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Remove HTML tags if specified
    if (options.removeHTML !== false) {
      sanitized = this.removeHTMLTags(sanitized, options);
    }

    // Remove scripts specifically
    if (options.removeScripts !== false) {
      sanitized = this.removeScripts(sanitized);
    }

    // Remove styles
    if (options.removeStyles !== false) {
      sanitized = this.removeStyles(sanitized);
    }

    // Remove comments
    if (options.removeComments !== false) {
      sanitized = this.removeComments(sanitized);
    }

    // Normalize whitespace
    if (options.normalizeWhitespace !== false) {
      sanitized = this.normalizeWhitespace(sanitized);
    }

    // Escape HTML if specified
    if (options.escapeHTML) {
      sanitized = this.escapeHTML(sanitized);
    }

    // Apply custom sanitizers
    if (options.customSanitizers) {
      options.customSanitizers.forEach(sanitizer => {
        sanitized = sanitizer(sanitized);
      });
    }

    // Remove dangerous characters
    sanitized = this.removeDangerousCharacters(sanitized);

    return sanitized;
  }

  // Key sanitization (for object keys)
  sanitizeKey(key: string): string {
    // Remove dangerous characters from object keys
    return key.replace(/[<>\"'&]/g, '').replace(/\s+/g, '_');
  }

  // Request sanitization
  sanitizeRequest(request: any): any {
    const sanitized = {
      ...request,
      body: request.body ? this.sanitize(request.body) : undefined,
      query: request.query ? this.sanitize(request.query) : undefined,
      params: request.params ? this.sanitize(request.params) : undefined,
      headers: this.sanitizeHeaders(request.headers)
    };

    return sanitized;
  }

  // Response sanitization
  sanitizeResponse(response: any): any {
    if (typeof response === 'string') {
      return this.sanitizeString(response, {
        removeHTML: false,
        escapeHTML: false // Don't escape HTML in responses unless explicitly requested
      });
    }

    if (response && typeof response === 'object') {
      return this.sanitize(response);
    }

    return response;
  }

  // Header sanitization
  sanitizeHeaders(headers: any): any {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(headers)) {
      // Only sanitize header values, not keys (as they're standardized)
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value, {
          removeHTML: false,
          removeScripts: true,
          removeStyles: false,
          removeComments: true,
          normalizeWhitespace: false,
          escapeHTML: false
        });
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // File sanitization
  sanitizeFileData(fileData: {
    name: string;
    type: string;
    size: number;
    content?: Buffer | string;
  }): any {
    return {
      name: this.sanitizeString(fileData.name, {
        removeHTML: true,
        removeScripts: true,
        maxLength: 255
      }),
      type: this.validateFileType(fileData.type),
      size: fileData.size,
      content: fileData.content ? this.sanitizeFileContent(fileData.content, fileData.type) : undefined
    };
  }

  // Private helper methods

  private removeHTMLTags(input: string, options: SanitizationOptions): string {
    const allowedTags = options.allowedTags || this.config.validation.allowedMimeTypes;
    
    if (allowedTags.length === 0) {
      // Remove all HTML tags
      return input.replace(/<[^>]*>/g, '');
    }

    // Remove disallowed tags
    const allowedTagsPattern = allowedTags.join('|');
    const disallowedTagsRegex = new RegExp(`<(?!\\/?(${allowedTagsPattern})\\b)[^>]*>`, 'gi');
    return input.replace(disallowedTagsRegex, '');
  }

  private removeScripts(input: string): string {
    // Remove script tags and their content
    let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gis, '');
    
    // Remove JavaScript event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]+/gi, '');
    
    // Remove JavaScript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // Remove vbscript: protocol
    sanitized = sanitized.replace(/vbscript:/gi, '');
    
    // Remove data: protocol with HTML
    sanitized = sanitized.replace(/data:\s*text\/html/gi, '');
    
    return sanitized;
  }

  private removeStyles(input: string): string {
    // Remove style tags and their content
    let sanitized = input.replace(/<style[^>]*>.*?<\/style>/gis, '');
    
    // Remove style attributes
    sanitized = sanitized.replace(/style\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/style\s*=\s*[^\s>]+/gi, '');
    
    return sanitized;
  }

  private removeComments(input: string): string {
    // Remove HTML comments
    return input.replace(/<!--.*?-->/gs, '');
  }

  private normalizeWhitespace(input: string): string {
    // Normalize multiple whitespace characters to single space
    return input.replace(/\\s+/g, ' ').trim();
  }

  private escapeHTML(input: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    };

    return input.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
  }

  private removeDangerousCharacters(input: string): string {
    // Remove control characters except for common whitespace
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  private validateFileType(fileType: string): string {
    const allowedTypes = this.config.validation.allowedMimeTypes;
    
    if (!allowedTypes.includes(fileType)) {
      throw new Error(`File type ${fileType} is not allowed`);
    }
    
    return fileType;
  }

  private sanitizeFileContent(content: Buffer | string, fileType: string): Buffer | string {
    if (Buffer.isBuffer(content)) {
      // For binary files, just validate size
      const maxSize = this.config.validation.maxPayloadSize;
      if (content.length > maxSize) {
        throw new Error(`File size exceeds maximum allowed size of ${maxSize} bytes`);
      }
      return content;
    }

    // For text files, apply content sanitization
    if (fileType.startsWith('text/') || fileType === 'application/json') {
      return this.sanitizeString(content, {
        removeHTML: true,
        removeScripts: true,
        removeStyles: true,
        removeComments: true,
        normalizeWhitespace: true,
        escapeHTML: false
      });
    }

    return content;
  }

  // Advanced sanitization methods

  // SQL injection prevention
  sanitizeSQL(input: string): string {
    // Remove common SQL injection patterns
    let sanitized = input;
    
    // Remove SQL comments
    sanitized = sanitized.replace(/--.*$/gm, '');
    sanitized = sanitized.replace(/\/\*.*?\*\//gs, '');
    
    // Remove dangerous SQL keywords
    const dangerousKeywords = [
      'DROP', 'DELETE', 'INSERT', 'UPDATE', 'CREATE', 'ALTER',
      'EXEC', 'EXECUTE', 'UNION', 'SELECT', 'FROM', 'WHERE',
      'HAVING', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET'
    ];
    
    dangerousKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });
    
    // Remove quotes and semicolons
    sanitized = sanitized.replace(/['"]/g, '');
    sanitized = sanitized.replace(/;/g, '');
    
    return sanitized.trim();
  }

  // XSS prevention
  sanitizeXSS(input: string): string {
    let sanitized = input;
    
    // Remove all event handlers
    sanitized = sanitized.replace(/on\\w+\\s*=\\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/on\\w+\\s*=\\s*[^\\s>]+/gi, '');
    
    // Remove dangerous tags
    const dangerousTags = [
      'script', 'iframe', 'object', 'embed', 'form', 'input',
      'textarea', 'select', 'button', 'link', 'meta', 'applet'
    ];
    
    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>.*?<\\/${tag}>|<${tag}[^>]*\\/?>`, 'gis');
      sanitized = sanitized.replace(regex, '');
    });
    
    // Remove dangerous attributes
    const dangerousAttrs = [
      'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset'
    ];
    
    dangerousAttrs.forEach(attr => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });
    
    return sanitized;
  }

  // NoSQL injection prevention
  sanitizeNoSQL(input: string): string {
    let sanitized = input;
    
    // Remove MongoDB operators
    const mongoOperators = [
      '$where', '$gt', '$gte', '$lt', '$lte', '$ne', '$nin',
      '$in', '$all', '$size', '$exists', '$type', '$mod',
      '$regex', '$text', '$slice', '$elemMatch', '$not',
      '$and', '$or', '$nor', '$set', '$unset', '$inc',
      '$mul', '$rename', '$min', '$max', '$currentDate',
      '$addToSet', '$push', '$pull', '$each', '$position',
      '$slice', '$sort', '$pop', '$pullAll'
    ];
    
    mongoOperators.forEach(operator => {
      const regex = new RegExp(`\\b${operator}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });
    
    // Remove curly braces and square brackets
    sanitized = sanitized.replace(/[{}\\[\\]]/g, '');
    
    return sanitized.trim();
  }

  // Path traversal prevention
  sanitizePath(input: string): string {
    // Remove path traversal sequences
    let sanitized = input;
    
    // Remove ../ and ..\\ sequences
    sanitized = sanitized.replace(/\.\.\//g, '');
    sanitized = sanitized.replace(/\.\.\\/g, '');
    
    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*]/g, '');
    
    return sanitized;
  }

  // Command injection prevention
  sanitizeCommand(input: string): string {
    let sanitized = input;
    
    // Remove command separators
    sanitized = sanitized.replace(/[;&|`$(){}\\[\\]]/g, '');
    
    // Remove dangerous commands
    const dangerousCommands = [
      'rm', 'del', 'format', 'fdisk', 'mkfs', 'chmod', 'chown',
      'sudo', 'su', 'passwd', 'crontab', 'at', 'batch',
      'wget', 'curl', 'nc', 'netcat', 'telnet', 'ssh', 'scp'
    ];
    
    dangerousCommands.forEach(command => {
      const regex = new RegExp(`\\b${command}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });
    
    return sanitized.trim();
  }

  // LDAP injection prevention
  sanitizeLDAP(input: string): string {
    let sanitized = input;
    
    // Remove LDAP special characters
    const ldapChars = ['\\', '*', '(', ')', 'NUL', '/', '<', '>', '&', '|', '=', '!', '~', '<=', '>='];
    
    ldapChars.forEach(char => {
      const regex = new RegExp(`\\${char}`, 'g');
      sanitized = sanitized.replace(regex, '');
    });
    
    return sanitized;
  }

  // XML injection prevention
  sanitizeXML(input: string): string {
    let sanitized = input;
    
    // Remove XML declarations
    sanitized = sanitized.replace(/<\\?xml[^>]*>/gi, '');
    
    // Remove DOCTYPE declarations
    sanitized = sanitized.replace(/<!DOCTYPE[^>]*>/gi, '');
    
    // Remove CDATA sections
    sanitized = sanitized.replace(/<!\\[CDATA\\[.*?\\]\\]>/gs, '');
    
    // Remove comments
    sanitized = sanitized.replace(/<!--.*?-->/gs, '');
    
    // Remove dangerous entities
    sanitized = sanitized.replace(/&[^;\\s]+;/g, '');
    
    return sanitized;
  }

  // JSON sanitization
  sanitizeJSON(input: string): string {
    try {
      // Parse and re-stringify to ensure valid JSON
      const parsed = JSON.parse(input);
      const sanitized = this.sanitize(parsed);
      return JSON.stringify(sanitized);
    } catch (error) {
      // If invalid JSON, sanitize as string
      return this.sanitizeString(input);
    }
  }

  // Email sanitization
  sanitizeEmail(input: string): string {
    let sanitized = input.trim().toLowerCase();
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>\"'&]/g, '');
    
    // Validate email format
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }
    
    return sanitized;
  }

  // URL sanitization
  sanitizeURL(input: string): string {
    let sanitized = input.trim();
    
    // Remove dangerous protocols
    const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:', 'ftp:'];
    
    dangerousProtocols.forEach(protocol => {
      if (sanitized.toLowerCase().startsWith(protocol)) {
        throw new Error(`Dangerous protocol ${protocol} not allowed`);
      }
    });
    
    // Validate URL format
    try {
      new URL(sanitized);
    } catch (error) {
      throw new Error('Invalid URL format');
    }
    
    return sanitized;
  }

  // Phone number sanitization
  sanitizePhone(input: string): string {
    // Remove all non-digit characters
    let sanitized = input.replace(/\\D/g, '');
    
    // Validate length (basic validation)
    if (sanitized.length < 10 || sanitized.length > 15) {
      throw new Error('Invalid phone number format');
    }
    
    return sanitized;
  }

  // Credit card sanitization
  sanitizeCreditCard(input: string): string {
    // Remove all non-digit characters
    let sanitized = input.replace(/\\D/g, '');
    
    // Validate credit card number using Luhn algorithm
    if (!this.validateCreditCard(sanitized)) {
      throw new Error('Invalid credit card number');
    }
    
    // Mask all but last 4 digits
    return sanitized.replace(/\\d(?=\\d{4})/g, '*');
  }

  private validateCreditCard(number: string): boolean {
    let sum = 0;
    let isEven = false;
    
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  // Batch sanitization
  sanitizeBatch(items: any[], options: SanitizationOptions = {}): any[] {
    return items.map(item => this.sanitize(item, options));
  }

  // Create custom sanitizer
  createCustomSanitizer(rules: Array<{
    pattern: RegExp;
    replacement: string;
    description?: string;
  }>): (input: string) => string {
    return (input: string) => {
      let sanitized = input;
      
      rules.forEach(rule => {
        sanitized = sanitized.replace(rule.pattern, rule.replacement);
      });
      
      return sanitized;
    };
  }

  // Validation helpers
  isValid(input: any, type: string): boolean {
    try {
      switch (type) {
        case 'email':
          this.sanitizeEmail(input);
          return true;
        case 'url':
          this.sanitizeURL(input);
          return true;
        case 'phone':
          this.sanitizePhone(input);
          return true;
        case 'creditcard':
          this.sanitizeCreditCard(input);
          return true;
        case 'json':
          this.sanitizeJSON(input);
          return true;
        case 'xml':
          this.sanitizeXML(input);
          return true;
        case 'sql':
          this.sanitizeSQL(input);
          return true;
        case 'nosql':
          this.sanitizeNoSQL(input);
          return true;
        case 'xss':
          this.sanitizeXSS(input);
          return true;
        case 'path':
          this.sanitizePath(input);
          return true;
        case 'command':
          this.sanitizeCommand(input);
          return true;
        case 'ldap':
          this.sanitizeLDAP(input);
          return true;
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  // Get sanitization statistics
  getStatistics(input: any): {
    originalSize: number;
    sanitizedSize: number;
    reduction: number;
    operations: string[];
  } {
    const originalSize = JSON.stringify(input).length;
    const sanitized = this.sanitize(input);
    const sanitizedSize = JSON.stringify(sanitized).length;
    const reduction = originalSize > 0 ? ((originalSize - sanitizedSize) / originalSize) * 100 : 0;

    return {
      originalSize,
      sanitizedSize,
      reduction,
      operations: [
        'HTML tag removal',
        'Script removal',
        'Style removal',
        'Comment removal',
        'Whitespace normalization',
        'Dangerous character removal'
      ]
    };
  }
}

// Factory functions for common sanitization scenarios

export function createHTMLSanitizer(config: SecurityConfig): SanitizationService {
  return new SanitizationService(config);
}

export function createInputSanitizer(config: SecurityConfig): SanitizationService {
  const sanitizer = new SanitizationService(config);
  
  // Return a function that applies strict input sanitization
  return {
    sanitize: (input: any) => sanitizer.sanitize(input, {
      removeHTML: true,
      removeScripts: true,
      removeStyles: true,
      removeComments: true,
      normalizeWhitespace: true,
      escapeHTML: false,
      maxLength: 1000
    })
  } as SanitizationService;
}

export function createOutputSanitizer(config: SecurityConfig): SanitizationService {
  const sanitizer = new SanitizationService(config);
  
  // Return a function that applies output sanitization
  return {
    sanitize: (input: any) => sanitizer.sanitize(input, {
      removeHTML: false,
      removeScripts: true,
      removeStyles: false,
      removeComments: true,
      normalizeWhitespace: false,
      escapeHTML: false
    })
  } as SanitizationService;
}

export function createDatabaseSanitizer(config: SecurityConfig): SanitizationService {
  const sanitizer = new SanitizationService(config);
  
  // Return a function that applies database sanitization
  return {
    sanitize: (input: any) => sanitizer.sanitize(input, {
      removeHTML: true,
      removeScripts: true,
      removeStyles: true,
      removeComments: true,
      normalizeWhitespace: true,
      escapeHTML: false,
      customSanitizers: [
        sanitizer.createCustomSanitizer([
          { pattern: /['"]/g, replacement: '', description: 'Remove quotes' },
          { pattern: /;/g, replacement: '', description: 'Remove semicolons' },
          { pattern: /--/g, replacement: '', description: 'Remove SQL comments' }
        ])
      ]
    })
  } as SanitizationService;
}
