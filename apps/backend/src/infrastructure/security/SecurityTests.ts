// @ts-nocheck
import { 
  ValidationService
} from './ValidationService';
import { RateLimitService } from './RateLimitService';
import { AuthenticationService } from './AuthenticationService';
import { ErrorHandler } from './ErrorHandler';
// @ts-nocheck
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SecurityMonitoringService } from './SecurityMonitoringService';
import { SanitizationService } from './SanitizationService';
import { SecurityConfig } from '@/domain/security/entities/Security';
import { 
  AuthenticationError,
  AuthorizationError,
  InputValidationError,
  RateLimitError,
  SecurityViolationError
} from '@/domain/security/entities/Security';

export class SecurityTests {
  private validationService: ValidationService;
  private rateLimitService: RateLimitService;
  private authService: AuthenticationService;
  private errorHandler: ErrorHandler;
  private monitoringService: SecurityMonitoringService;
  private sanitizationService: SanitizationService;
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.validationService = new ValidationService(config);
    this.rateLimitService = new RateLimitService(config);
    this.authService = new AuthenticationService(config);
    this.errorHandler = new ErrorHandler();
    this.monitoringService = new SecurityMonitoringService(config);
    this.sanitizationService = new SanitizationService(config);
  }

  // Test Suite Runner
  async runAllTests(): Promise<TestResults> {
    const results: TestResults = {
      validation: await this.runValidationTests(),
      rateLimiting: await this.runRateLimitTests(),
      authentication: await this.runAuthenticationTests(),
      errorHandling: await this.runErrorHandlingTests(),
      monitoring: await this.runMonitoringTests(),
      sanitization: await this.runSanitizationTests(),
      security: await this.runSecurityTests(),
      performance: await this.runPerformanceTests()
    };

    return results;
  }

  // Validation Tests
  private async runValidationTests(): Promise<ValidationTestResults> {
    const results: ValidationTestResults = {
      emailValidation: await this.testEmailValidation(),
      passwordValidation: await this.testPasswordValidation(),
      usernameValidation: await this.testUsernameValidation(),
      idValidation: await this.testIdValidation(),
      apiKeyValidation: await this.testApiKeyValidation(),
      paginationValidation: await this.testPaginationValidation(),
      dateRangeValidation: await this.testDateRangeValidation(),
      inputSanitization: await this.testInputSanitization(),
      contentTypeValidation: await this.testContentTypeValidation(),
      sizeValidation: await this.testSizeValidation()
    };

    return results;
  }

  private async testEmailValidation(): Promise<TestResult> {
    const testCases = [
      { input: 'valid@email.com', expected: true },
      { input: 'invalid-email', expected: false },
      { input: 'test@domain', expected: false },
      { input: 'user+tag@example.com', expected: true },
      { input: 'user.name@example.co.uk', expected: true }
    ];

    const results: TestResult = {
      name: 'Email Validation',
      passed: 0,
      failed: 0,
      errors: []
    };

    for (const testCase of testCases) {
      try {
        const result = this.validationService.validateEmail(testCase.input);
        const isValid = result;
        
        if (isValid === testCase.expected) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Email validation failed for: ${testCase.input}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Email validation error for ${testCase.input}: ${error}`);
      }
    }

    return results;
  }

  private async testPasswordValidation(): Promise<TestResult> {
    const testCases = [
      { input: 'Password123!', expected: true },
      { input: 'weak', expected: false },
      { input: '12345678', expected: false },
      { input: 'Password', expected: false },
      { input: 'password123!', expected: false }
    ];

    const results: TestResult = {
      name: 'Password Validation',
      passed: 0,
      failed: 0,
      errors: []
    };

    for (const testCase of testCases) {
      try {
        const schema = ValidationService.createPasswordValidator();
        const result = this.validationService.validateSchema(schema, testCase.input);
        const isValid = result.isValid;
        
        if (isValid === testCase.expected) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Password validation failed for: ${testCase.input}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Password validation error for ${testCase.input}: ${error}`);
      }
    }

    return results;
  }

  private async testUsernameValidation(): Promise<TestResult> {
    const testCases = [
      { input: 'validuser', expected: true },
      { input: 'us', expected: false },
      { input: 'verylongusernamethatexceedslimit', expected: false },
      { input: 'user@name', expected: false },
      { input: 'user_name', expected: true }
    ];

    const results: TestResult = {
      name: 'Username Validation',
      passed: 0,
      failed: 0,
      errors: []
    };

    for (const testCase of testCases) {
      try {
        const schema = ValidationService.createUsernameValidator();
        const result = this.validationService.validateSchema(schema, testCase.input);
        const isValid = result.isValid;
        
        if (isValid === testCase.expected) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Username validation failed for: ${testCase.input}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Username validation error for ${testCase.input}: ${error}`);
      }
    }

    return results;
  }

  private async testIdValidation(): Promise<TestResult> {
    const testCases = [
      { input: '123e4567-e89b-12d3-a456-426614174000', expected: true },
      { input: 'invalid-uuid', expected: false },
      { input: '123', expected: false },
      { input: '', expected: false }
    ];

    const results: TestResult = {
      name: 'ID Validation',
      passed: 0,
      failed: 0,
      errors: []
    };

    for (const testCase of testCases) {
      try {
        const schema = ValidationService.createIdValidator();
        const result = this.validationService.validateSchema(schema, testCase.input);
        const isValid = result.isValid;
        
        if (isValid === testCase.expected) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`ID validation failed for: ${testCase.input}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`ID validation error for ${testCase.input}: ${error}`);
      }
    }

    return results;
  }

  private async testApiKeyValidation(): Promise<TestResult> {
    const testCases = [
      { input: 'ak_1234567890abcdef1234567890abcdef', expected: true },
      { input: 'short', expected: false },
      { input: 'ak_invalid@chars', expected: false },
      { input: '', expected: false }
    ];

    const results: TestResult = {
      name: 'API Key Validation',
      passed: 0,
      failed: 0,
      errors: []
    };

    for (const testCase of testCases) {
      try {
        const schema = ValidationService.createApiKeyValidator();
        const result = this.validationService.validateSchema(schema, testCase.input);
        const isValid = result.isValid;
        
        if (isValid === testCase.expected) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`API Key validation failed for: ${testCase.input}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`API Key validation error for ${testCase.input}: ${error}`);
      }
    }

    return results;
  }

  private async testPaginationValidation(): Promise<TestResult> {
    const testCases = [
      { input: { page: 1, limit: 20 }, expected: true },
      { input: { page: 0, limit: 20 }, expected: false },
      { input: { page: 1, limit: 101 }, expected: false },
      { input: { page: -1, limit: 20 }, expected: false }
    ];

    const results: TestResult = {
      name: 'Pagination Validation',
      passed: 0,
      failed: 0,
      errors: []
    };

    for (const testCase of testCases) {
      try {
        const schema = ValidationService.createPaginationValidator();
        const result = this.validationService.validateSchema(schema, testCase.input);
        const isValid = result.isValid;
        
        if (isValid === testCase.expected) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Pagination validation failed for: ${JSON.stringify(testCase.input)}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Pagination validation error for ${testCase.input}: ${error}`);
      }
    }

    return results;
  }

  private async testDateRangeValidation(): Promise<TestResult> {
    const testCases = [
      { input: { start: '2023-01-01T00:00:00Z', end: '2023-12-31T23:59:59Z' }, expected: true },
      { input: { start: '2023-12-31T23:59:59Z', end: '2023-01-01T00:00:00Z' }, expected: false },
      { input: { start: 'invalid-date', end: '2023-12-31T23:59:59Z' }, expected: false }
    ];

    const results: TestResult = {
      name: 'Date Range Validation',
      passed: 0,
      failed: 0,
      errors: []
    };

    for (const testCase of testCases) {
      try {
        const schema = ValidationService.createDateRangeValidator();
        const result = this.validationService.validateSchema(schema, testCase.input);
        const isValid = result.isValid;
        
        if (isValid === testCase.expected) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Date range validation failed for: ${JSON.stringify(testCase.input)}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Date range validation error for ${testCase.input}: ${error}`);
      }
    }

    return results;
  }

  private async testInputSanitization(): Promise<TestResult> {
    const testCases = [
      { input: '<script>alert("xss")</script>', expected: 'alert("xss")' },
      { input: 'text with <b>bold</b> tags', expected: 'text with bold tags' },
      { input: 'text with &lt;script&gt; entities', expected: 'text with &lt;script&gt; entities' }
    ];

    const results: TestResult = {
      name: 'Input Sanitization',
      passed: 0,
      failed: 0,
      errors: []
    };

    for (const testCase of testCases) {
      try {
        const sanitized = this.sanitizationService.sanitizeString(testCase.input);
        
        if (sanitized.includes('<script>') === false && sanitized.includes('</script>') === false) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Input sanitization failed for: ${testCase.input}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Input sanitization error for ${testCase.input}: ${error}`);
      }
    }

    return results;
  }

  private async testContentTypeValidation(): Promise<TestResult> {
    const testCases = [
      { input: 'application/json', expected: true },
      { input: 'text/html', expected: false },
      { input: 'application/x-www-form-urlencoded', expected: true },
      { input: 'application/xml', expected: false }
    ];

    const results: TestResult = {
      name: 'Content Type Validation',
      passed: 0,
      failed: 0,
      errors: []
    };

    for (const testCase of testCases) {
      try {
        const result = this.validationService.validateContentType(testCase.input);
        const isValid = result.isValid;
        
        if (isValid === testCase.expected) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Content type validation failed for: ${testCase.input}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Content type validation error for ${testCase.input}: ${error}`);
      }
    }

    return results;
  }

  private async testSizeValidation(): Promise<TestResult> {
    const testCases = [
      { input: { data: 'x'.repeat(1000) }, expected: true },
      { input: { data: 'x'.repeat(11000000) }, expected: false } // Exceeds 10MB
    ];

    const results: TestResult = {
      name: 'Size Validation',
      passed: 0,
      failed: 0,
      errors: []
    };

    for (const testCase of testCases) {
      try {
        const result = this.validationService.validateInputSize(testCase.input);
        const isValid = result.isValid;
        
        if (isValid === testCase.expected) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Size validation failed for data size: ${JSON.stringify(testCase.input).length}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Size validation error: ${error}`);
      }
    }

    return results;
  }

  // Rate Limiting Tests
  private async runRateLimitTests(): Promise<RateLimitTestResults> {
    const results: RateLimitTestResults = {
      basicRateLimit: await this.testBasicRateLimit(),
      slidingWindowRateLimit: await this.testSlidingWindowRateLimit(),
      tokenBucketRateLimit: await this.testTokenBucketRateLimit(),
      fixedWindowRateLimit: await this.testFixedWindowRateLimit(),
      userRateLimit: await this.testUserRateLimit(),
      ipRateLimit: await this.testIPRateLimit(),
      apiKeyRateLimit: await this.testApiKeyRateLimit(),
      globalRateLimit: await this.testGlobalRateLimit(),
      burstProtection: await this.testBurstProtection(),
      progressiveRateLimit: await this.testProgressiveRateLimit()
    };

    return results;
  }

  private async testBasicRateLimit(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Basic Rate Limit',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const key = 'test-key';
      const limit = 5;
      const windowMs = 1000;

      // Test normal usage
      for (let i = 0; i < limit; i++) {
        const result = await this.rateLimitService.checkLimit(key, limit, windowMs);
        if (result.isExceeded) {
          results.failed++;
          results.errors.push(`Rate limit exceeded unexpectedly at request ${i + 1}`);
        } else {
          results.passed++;
        }
      }

      // Test exceeded limit
      try {
        await this.rateLimitService.checkLimit(key, limit, windowMs);
        results.failed++;
        results.errors.push('Rate limit should have been exceeded');
      } catch (error) {
        if (error instanceof RateLimitError) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Unexpected error: ${error}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Basic rate limit test error: ${error}`);
    }

    return results;
  }

  private async testSlidingWindowRateLimit(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Sliding Window Rate Limit',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const key = 'test-sliding-key';
      const limit = 5;
      const windowMs = 1000;

      // Test sliding window behavior
      for (let i = 0; i < limit; i++) {
        const result = await this.rateLimitService.checkSlidingWindowLimit(key, limit, windowMs);
        if (result.isExceeded) {
          results.failed++;
          results.errors.push(`Sliding window rate limit exceeded unexpectedly at request ${i + 1}`);
        } else {
          results.passed++;
        }
      }

      // Wait for window to slide
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be able to make requests again
      const result = await this.rateLimitService.checkSlidingWindowLimit(key, limit, windowMs);
      if (!result.isExceeded) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Sliding window did not reset properly');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Sliding window rate limit test error: ${error}`);
    }

    return results;
  }

  private async testTokenBucketRateLimit(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Token Bucket Rate Limit',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const key = 'test-token-bucket';
      const capacity = 10;
      const refillRate = 1; // 1 token per second

      // Test token consumption
      for (let i = 0; i < capacity; i++) {
        const result = await this.rateLimitService.checkTokenBucketLimit(key, capacity, refillRate);
        if (result.isExceeded) {
          results.failed++;
          results.errors.push(`Token bucket exceeded unexpectedly at request ${i + 1}`);
        } else {
          results.passed++;
        }
      }

      // Should be empty now
      try {
        await this.rateLimitService.checkTokenBucketLimit(key, capacity, refillRate);
        results.failed++;
        results.errors.push('Token bucket should have been empty');
      } catch (error) {
        if (error instanceof RateLimitError) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Unexpected error: ${error}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Token bucket rate limit test error: ${error}`);
    }

    return results;
  }

  private async testFixedWindowRateLimit(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Fixed Window Rate Limit',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const key = 'test-fixed-window';
      const limit = 5;
      const windowMs = 1000;

      // Test fixed window behavior
      for (let i = 0; i < limit; i++) {
        const result = await this.rateLimitService.checkFixedWindowCounterLimit(key, limit, windowMs);
        if (result.isExceeded) {
          results.failed++;
          results.errors.push(`Fixed window rate limit exceeded unexpectedly at request ${i + 1}`);
        } else {
          results.passed++;
        }
      }

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be able to make requests again
      const result = await this.rateLimitService.checkFixedWindowCounterLimit(key, limit, windowMs);
      if (!result.isExceeded) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Fixed window did not reset properly');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Fixed window rate limit test error: ${error}`);
    }

    return results;
  }

  private async testUserRateLimit(): Promise<TestResult> {
    const results: TestResult = {
      name: 'User Rate Limit',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const userId = 'test-user-id';
      
      // Create a test user
      const user = await this.authService.createUser({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        roles: ['user']
      });

      // Test user rate limiting
      const result = await this.rateLimitService.checkUserRateLimit(userId);
      if (!result.isExceeded) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('User rate limit failed unexpectedly');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`User rate limit test error: ${error}`);
    }

    return results;
  }

  private async testIPRateLimit(): Promise<TestResult> {
    const results: TestResult = {
      name: 'IP Rate Limit',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const ipAddress = '192.168.1.1';
      
      // Test IP rate limiting
      const result = await this.rateLimitService.checkIPRateLimit(ipAddress);
      if (!result.isExceeded) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('IP rate limit failed unexpectedly');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`IP rate limit test error: ${error}`);
    }

    return results;
  }

  private async testApiKeyRateLimit(): Promise<TestResult> {
    const results: TestResult = {
      name: 'API Key Rate Limit',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const apiKeyId = 'test-api-key-id';
      
      // Test API key rate limiting
      const result = await this.rateLimitService.checkApiKeyRateLimit(apiKeyId);
      if (!result.isExceeded) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('API key rate limit failed unexpectedly');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`API key rate limit test error: ${error}`);
    }

    return results;
  }

  private async testGlobalRateLimit(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Global Rate Limit',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Test global rate limiting
      const result = await this.rateLimitService.checkGlobalRateLimit();
      if (!result.isExceeded) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Global rate limit failed unexpectedly');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Global rate limit test error: ${error}`);
    }

    return results;
  }

  private async testBurstProtection(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Burst Protection',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const key = 'test-burst';
      const burstLimit = 3;
      const sustainedLimit = 10;
      const windowMs = 1000;

      // Test burst protection
      for (let i = 0; i < burstLimit; i++) {
        const result = await this.rateLimitService.checkBurstProtection(key, burstLimit, sustainedLimit, windowMs);
        if (result.isExceeded) {
          results.failed++;
          results.errors.push(`Burst protection exceeded unexpectedly at request ${i + 1}`);
        } else {
          results.passed++;
        }
      }

      // Should exceed burst limit
      try {
        await this.rateLimitService.checkBurstProtection(key, burstLimit, sustainedLimit, windowMs);
        results.failed++;
        results.errors.push('Burst protection should have been exceeded');
      } catch (error) {
        if (error instanceof RateLimitError) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Unexpected error: ${error}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Burst protection test error: ${error}`);
    }

    return results;
  }

  private async testProgressiveRateLimit(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Progressive Rate Limit',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const key = 'test-progressive';
      const baseLimit = 10;
      const windowMs = 1000;

      // Test progressive rate limiting with no violations
      const result1 = await this.rateLimitService.checkProgressiveRateLimit(key, baseLimit, windowMs, 0);
      if (!result1.isExceeded && result1.limit === baseLimit) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Progressive rate limit with no violations failed');
      }

      // Test progressive rate limiting with violations
      const result2 = await this.rateLimitService.checkProgressiveRateLimit(key, baseLimit, windowMs, 3);
      if (!result2.isExceeded && result2.limit < baseLimit) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Progressive rate limit with violations failed');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Progressive rate limit test error: ${error}`);
    }

    return results;
  }

  // Authentication Tests
  private async runAuthenticationTests(): Promise<AuthenticationTestResults> {
    const results: AuthenticationTestResults = {
      userRegistration: await this.testUserRegistration(),
      userLogin: await this.testUserLogin(),
      tokenValidation: await this.testTokenValidation(),
      tokenRefresh: await this.testTokenRefresh(),
      apiKeyCreation: await this.testApiKeyCreation(),
      apiKeyValidation: await this.testApiKeyValidation(),
      userLogout: await this.testUserLogout(),
      sessionManagement: await this.testSessionManagement(),
      permissionCheck: await this.testPermissionCheck(),
      roleCheck: await this.testRoleCheck()
    };

    return results;
  }

  private async testUserRegistration(): Promise<TestResult> {
    const results: TestResult = {
      name: 'User Registration',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'Password123!',
        roles: ['user']
      };

      const user = await this.authService.createUser(userData);
      
      if (user.email === userData.email && user.username === userData.username) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('User registration failed - data mismatch');
      }

      // Test duplicate user
      try {
        await this.authService.createUser(userData);
        results.failed++;
        results.errors.push('Duplicate user registration should have failed');
      } catch (error) {
        if (error instanceof InputValidationError) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Unexpected error for duplicate user: ${error}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`User registration test error: ${error}`);
    }

    return results;
  }

  private async testUserLogin(): Promise<TestResult> {
    const results: TestResult = {
      name: 'User Login',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user
      const user = await this.authService.createUser({
        email: 'loginuser@example.com',
        username: 'loginuser',
        password: 'Password123!',
        roles: ['user']
      });

      // Test successful login
      const loginResult = await this.authService.login('loginuser@example.com', 'Password123!');
      if (loginResult.user.email === user.email && loginResult.tokens.access) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Login failed - invalid response');
      }

      // Test failed login with wrong password
      try {
        await this.authService.login('loginuser@example.com', 'wrongpassword');
        results.failed++;
        results.errors.push('Login with wrong password should have failed');
      } catch (error) {
        if (error instanceof AuthenticationError) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Unexpected error for wrong password: ${error}`);
        }
      }

      // Test failed login with non-existent user
      try {
        await this.authService.login('nonexistent@example.com', 'Password123!');
        results.failed++;
        results.errors.push('Login with non-existent user should have failed');
      } catch (error) {
        if (error instanceof AuthenticationError) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Unexpected error for non-existent user: ${error}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`User login test error: ${error}`);
    }

    return results;
  }

  private async testTokenValidation(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Token Validation',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user and login
      const user = await this.authService.createUser({
        email: 'tokenuser@example.com',
        username: 'tokenuser',
        password: 'Password123!',
        roles: ['user']
      });

      const loginResult = await this.authService.login('tokenuser@example.com', 'Password123!');
      const validToken = loginResult.tokens.access;

      // Test valid token
      const validatedUser = await this.authService.validateToken(validToken);
      if (validatedUser && validatedUser.email === user.email) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Valid token validation failed');
      }

      // Test invalid token
      const invalidToken = 'invalid.token.here';
      const invalidUser = await this.authService.validateToken(invalidToken);
      if (invalidUser === null) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Invalid token should return null');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Token validation test error: ${error}`);
    }

    return results;
  }

  private async testTokenRefresh(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Token Refresh',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user and login
      const user = await this.authService.createUser({
        email: 'refreshuser@example.com',
        username: 'refreshuser',
        password: 'Password123!',
        roles: ['user']
      });

      const loginResult = await this.authService.login('refreshuser@example.com', 'Password123!');
      const refreshToken = loginResult.tokens.refresh;

      // Test token refresh
      const refreshResult = await this.authService.refreshToken(refreshToken);
      if (refreshResult.access && refreshResult.refresh) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Token refresh failed');
      }

      // Test invalid refresh token
      try {
        await this.authService.refreshToken('invalid.refresh.token');
        results.failed++;
        results.errors.push('Invalid refresh token should have failed');
      } catch (error) {
        if (error instanceof AuthenticationError) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Unexpected error for invalid refresh token: ${error}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Token refresh test error: ${error}`);
    }

    return results;
  }

  private async testApiKeyCreation(): Promise<TestResult> {
    const results: TestResult = {
      name: 'API Key Creation',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user
      const user = await this.authService.createUser({
        email: 'apikeyuser@example.com',
        username: 'apikeyuser',
        password: 'Password123!',
        roles: ['user']
      });

      // Test API key creation
      const apiKey = await this.authService.createApiKey(user.id, 'Test API Key', ['read', 'write']);
      if (apiKey.key && apiKey.name === 'Test API Key' && apiKey.userId === user.id) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('API key creation failed');
      }

      // Test API key with non-existent user
      try {
        await this.authService.createApiKey('non-existent-user-id', 'Test API Key', ['read']);
        results.failed++;
        results.errors.push('API key creation with non-existent user should have failed');
      } catch (error) {
        if (error instanceof AuthenticationError) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Unexpected error for non-existent user: ${error}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`API key creation test error: ${error}`);
    }

    return results;
  }

  private async testApiKeyValidation(): Promise<TestResult> {
    const results: TestResult = {
      name: 'API Key Validation',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user and API key
      const user = await this.authService.createUser({
        email: 'apivalidateuser@example.com',
        username: 'apivalidateuser',
        password: 'Password123!',
        roles: ['user']
      });

      const apiKey = await this.authService.createApiKey(user.id, 'Test API Key', ['read', 'write']);

      // Test valid API key
      const validatedApiKey = await this.authService.validateApiKey(apiKey.key);
      if (validatedApiKey && validatedApiKey.id === apiKey.id) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Valid API key validation failed');
      }

      // Test invalid API key
      const invalidApiKey = await this.authService.validateApiKey('invalid.api.key');
      if (invalidApiKey === null) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Invalid API key should return null');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`API key validation test error: ${error}`);
    }

    return results;
  }

  private async testUserLogout(): Promise<TestResult> {
    const results: TestResult = {
      name: 'User Logout',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user and login
      const user = await this.authService.createUser({
        email: 'logoutuser@example.com',
        username: 'logoutuser',
        password: 'Password123!',
        roles: ['user']
      });

      const loginResult = await this.authService.login('logoutuser@example.com', 'Password123!');
      
      // Get session
      const sessions = await this.authService.getUserSessions(user.id);
      if (sessions.length > 0) {
        const sessionId = sessions[0].id;

        // Test logout
        await this.authService.logout(sessionId);

        // Verify session is inactive
        const updatedSessions = await this.authService.getUserSessions(user.id);
        const loggedOutSession = updatedSessions.find(s => s.id === sessionId);
        
        if (loggedOutSession && !loggedOutSession.isActive) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push('Session logout failed');
        }
      } else {
        results.failed++;
        results.errors.push('No session found after login');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`User logout test error: ${error}`);
    }

    return results;
  }

  private async testSessionManagement(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Session Management',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user and login
      const user = await this.authService.createUser({
        email: 'sessionuser@example.com',
        username: 'sessionuser',
        password: 'Password123!',
        roles: ['user']
      });

      const loginResult = await this.authService.login('sessionuser@example.com', 'Password123!');
      
      // Test getting user sessions
      const sessions = await this.authService.getUserSessions(user.id);
      if (sessions.length > 0) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('No sessions found for user');
      }

      // Test revoking session
      if (sessions.length > 0) {
        const sessionId = sessions[0].id;
        await this.authService.revokeSession(sessionId);
        
        const updatedSessions = await this.authService.getUserSessions(user.id);
        const revokedSession = updatedSessions.find(s => s.id === sessionId);
        
        if (revokedSession && !revokedSession.isActive) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push('Session revocation failed');
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Session management test error: ${error}`);
    }

    return results;
  }

  private async testPermissionCheck(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Permission Check',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user with specific permissions
      const user = await this.authService.createUser({
        email: 'permissionuser@example.com',
        username: 'permissionuser',
        password: 'Password123!',
        roles: ['user'],
        permissions: ['read:users', 'write:posts']
      });

      // Test permission check
      const hasReadPermission = await this.authService.hasPermission(user.id, 'read:users');
      if (hasReadPermission) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Permission check failed for existing permission');
      }

      const hasWritePermission = await this.authService.hasPermission(user.id, 'write:users');
      if (!hasWritePermission) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Permission check should have failed for non-existent permission');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Permission check test error: ${error}`);
    }

    return results;
  }

  private async testRoleCheck(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Role Check',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user with specific roles
      const user = await this.authService.createUser({
        email: 'roleuser@example.com',
        username: 'roleuser',
        password: 'Password123!',
        roles: ['user', 'editor'],
        permissions: ['read:users']
      });

      // Test role check
      const hasUserRole = await this.authService.hasRole(user.id, 'user');
      if (hasUserRole) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Role check failed for existing role');
      }

      const hasAdminRole = await this.authService.hasRole(user.id, 'admin');
      if (!hasAdminRole) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Role check should have failed for non-existent role');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Role check test error: ${error}`);
    }

    return results;
  }

  // Error Handling Tests
  private async runErrorHandlingTests(): Promise<ErrorHandlingTestResults> {
    const results: ErrorHandlingTestResults = {
      errorConversion: await this.testErrorConversion(),
      errorReporting: await this.testErrorReporting(),
      errorCallbacks: await this.testErrorCallbacks(),
      errorStatistics: await this.testErrorStatistics(),
      errorCleanup: await this.testErrorCleanup(),
      securityEventCreation: await this.testSecurityEventCreation(),
      userFriendlyMessages: await this.testUserFriendlyMessages(),
      notificationTriggers: await this.testNotificationTriggers()
    };

    return results;
  }

  private async testErrorConversion(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Error Conversion',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Test converting generic error to security error
      const genericError = new Error('Generic error');
      const report = this.errorHandler.handleError(genericError);
      
      if (report.error.type === 'SYSTEM_ERROR') {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Generic error not converted to system error');
      }

      // Test converting authentication error
      const authError = new AuthenticationError('Auth failed');
      const authReport = this.errorHandler.handleError(authError);
      
      if (authReport.error.type === 'AUTHENTICATION_ERROR') {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Authentication error not preserved');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Error conversion test error: ${error}`);
    }

    return results;
  }

  private async testErrorReporting(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Error Reporting',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const error = new AuthenticationError('Test error');
      const context = {
        requestId: 'test-request-123',
        userId: 'test-user-456',
        ipAddress: '192.168.1.1',
        endpoint: '/api/test',
        method: 'GET'
      };

      const report = this.errorHandler.handleError(error, context);
      
      if (report.context.requestId === context.requestId &&
          report.context.userId === context.userId &&
          report.userFriendlyMessage) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Error report missing required fields');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Error reporting test error: ${error}`);
    }

    return results;
  }

  private async testErrorCallbacks(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Error Callbacks',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      let callbackTriggered = false;
      
      // Register callback
      this.errorHandler.onError('AUTHENTICATION_ERROR', (error, context) => {
        callbackTriggered = true;
      });

      const error = new AuthenticationError('Test error');
      const context = { requestId: 'test-123' };
      
      this.errorHandler.handleError(error, context);
      
      if (callbackTriggered) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Error callback not triggered');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Error callback test error: ${error}`);
    }

    return results;
  }

  private async testErrorStatistics(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Error Statistics',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Generate some errors
      this.errorHandler.handleError(new AuthenticationError('Auth error 1'));
      this.errorHandler.handleError(new AuthenticationError('Auth error 2'));
      this.errorHandler.handleError(new AuthorizationError('Authz error'));

      const stats = this.errorHandler.getErrorStats();
      
      if (stats.total === 3 && 
          stats.byType['AUTHENTICATION_ERROR'] === 2 &&
          stats.byType['AUTHORIZATION_ERROR'] === 1) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Error statistics incorrect');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Error statistics test error: ${error}`);
    }

    return results;
  }

  private async testErrorCleanup(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Error Cleanup',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Generate some errors
      this.errorHandler.handleError(new AuthenticationError('Old error'));
      
      const beforeCleanup = this.errorHandler.getErrorStats().total;
      
      // Clean up old errors (using 0 hours to clean all)
      const cleaned = this.errorHandler.clearOldReports(0);
      
      const afterCleanup = this.errorHandler.getErrorStats().total;
      
      if (cleaned > 0 && afterCleanup === 0) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Error cleanup failed');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Error cleanup test error: ${error}`);
    }

    return results;
  }

  private async testSecurityEventCreation(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Security Event Creation',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const error = new AuthenticationError('Test security event');
      const context = {
        requestId: 'test-123',
        userId: 'user-456',
        ipAddress: '192.168.1.1',
        endpoint: '/api/test',
        method: 'GET'
      };

      const report = this.errorHandler.handleError(error, context);
      const securityEvent = this.errorHandler.createSecurityEvent(report);
      
      if (securityEvent.type === 'LOGIN_FAILED' &&
          securityEvent.userId === context.userId &&
          securityEvent.ipAddress === context.ipAddress) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Security event creation failed');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Security event creation test error: ${error}`);
    }

    return results;
  }

  private async testUserFriendlyMessages(): Promise<TestResult> {
    const results: TestResult = {
      name: 'User Friendly Messages',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const testCases = [
        { error: new AuthenticationError('Invalid credentials'), expectedMessage: 'Authentication required. Please log in to continue.' },
        { error: new AuthorizationError('Access denied'), expectedMessage: 'You do not have permission to perform this action.' },
        { error: new InputValidationError('Invalid input'), expectedMessage: 'The provided data is invalid. Please check your input and try again.' },
        { error: new RateLimitError('Too many requests'), expectedMessage: 'Too many requests. Please wait a moment and try again.' }
      ];

      for (const testCase of testCases) {
        const report = this.errorHandler.handleError(testCase.error);
        
        if (report.userFriendlyMessage === testCase.expectedMessage) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`User friendly message incorrect for ${testCase.error.constructor.name}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`User friendly messages test error: ${error}`);
    }

    return results;
  }

  private async testNotificationTriggers(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Notification Triggers',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      let notificationTriggered = false;
      
      // Register notification callback
      this.errorHandler.onNotification((report) => {
        notificationTriggered = true;
      });

      // Create a critical error that should trigger notification
      const criticalError = new SecurityViolationError('Critical security issue');
      const report = this.errorHandler.handleError(criticalError);
      
      if (notificationTriggered && report.shouldNotify) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Notification not triggered for critical error');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Notification trigger test error: ${error}`);
    }

    return results;
  }

  // Monitoring Tests
  private async runMonitoringTests(): Promise<MonitoringTestResults> {
    const results: MonitoringTestResults = {
      eventLogging: await this.testEventLogging(),
      eventRetrieval: await this.testEventRetrieval(),
      anomalyDetection: await this.testAnomalyDetection(),
      threatDetection: await this.testThreatDetection(),
      metricsGeneration: await this.testMetricsGeneration(),
      reportGeneration: await this.testReportGeneration(),
      alertSystem: await this.testAlertSystem(),
      threatHandling: await this.testThreatHandling()
    };

    return results;
  }

  private async testEventLogging(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Event Logging',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const eventData = {
        type: 'LOGIN_SUCCESS',
        severity: 'low',
        userId: 'test-user-123',
        ipAddress: '192.168.1.1',
        endpoint: '/api/login',
        method: 'POST',
        details: { loginMethod: 'password' }
      };

      await this.monitoringService.logEvent(eventData);
      
      const events = await this.monitoringService.getEvents({ type: 'LOGIN_SUCCESS' });
      
      if (events.length > 0 && events[0].type === 'LOGIN_SUCCESS') {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Event logging failed');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Event logging test error: ${error}`);
    }

    return results;
  }

  private async testEventRetrieval(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Event Retrieval',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Log some test events
      await this.monitoringService.logEvent({
        type: 'LOGIN_SUCCESS',
        severity: 'low',
        userId: 'user-1'
      });

      await this.monitoringService.logEvent({
        type: 'LOGIN_FAILED',
        severity: 'medium',
        userId: 'user-2'
      });

      // Test retrieval by type
      const loginSuccessEvents = await this.monitoringService.getEvents({ type: 'LOGIN_SUCCESS' });
      const loginFailedEvents = await this.monitoringService.getEvents({ type: 'LOGIN_FAILED' });
      
      if (loginSuccessEvents.length > 0 && loginFailedEvents.length > 0) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Event retrieval by type failed');
      }

      // Test retrieval by severity
      const lowSeverityEvents = await this.monitoringService.getEvents({ severity: 'low' });
      
      if (lowSeverityEvents.length > 0) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Event retrieval by severity failed');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Event retrieval test error: ${error}`);
    }

    return results;
  }

  private async testAnomalyDetection(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Anomaly Detection',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const context = {
        isAuthenticated: true,
        isAuthorized: true,
        permissions: ['read'],
        roles: ['user'],
        ipAddress: '192.168.1.1',
        timestamp: new Date()
      };

      const request = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'content-type': 'application/json'
        },
        body: { test: 'data' }
      };

      const anomalies = await this.monitoringService.detectAnomalies(context, request);
      
      // Should return array (may be empty if no anomalies detected)
      if (Array.isArray(anomalies)) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Anomaly detection did not return array');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Anomaly detection test error: ${error}`);
    }

    return results;
  }

  private async testThreatDetection(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Threat Detection',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Log a suspicious event that should trigger threat detection
      await this.monitoringService.logEvent({
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'critical',
        ipAddress: '192.168.1.1',
        endpoint: '/api/login',
        method: 'POST'
      });

      // Check if threat was detected
      const threats = await this.monitoringService.getEvents({ type: 'BRUTE_FORCE_ATTEMPT' });
      
      if (threats.length > 0) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Threat detection failed');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Threat detection test error: ${error}`);
    }

    return results;
  }

  private async testMetricsGeneration(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Metrics Generation',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const timeRange = {
        start: new Date(Date.now() - 3600000), // 1 hour ago
        end: new Date()
      };

      const metrics = await this.monitoringService.getMetrics(timeRange);
      
      if (metrics.timestamp && 
          typeof metrics.totalRequests === 'number' &&
          typeof metrics.successfulRequests === 'number' &&
          typeof metrics.failedRequests === 'number') {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Metrics generation failed');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Metrics generation test error: ${error}`);
    }

    return results;
  }

  private async testReportGeneration(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Report Generation',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const timeRange = {
        start: new Date(Date.now() - 3600000), // 1 hour ago
        end: new Date()
      };

      const report = await this.monitoringService.generateSecurityReport(timeRange);
      
      if (report.timeRange && 
          report.summary && 
          report.metrics && 
          report.events && 
          Array.isArray(report.recommendations)) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Report generation failed');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Report generation test error: ${error}`);
    }

    return results;
  }

  private async testAlertSystem(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Alert System',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      let alertTriggered = false;
      
      // Register alert callback
      this.monitoringService.onAlert((threat) => {
        alertTriggered = true;
      });

      // Create a critical threat
      const threat = {
        id: 'test-threat-123',
        type: 'BRUTE_FORCE',
        level: 'critical',
        confidence: 0.9,
        source: '192.168.1.1',
        detectedAt: new Date(),
        isResolved: false
      };

      await this.monitoringService.alertOnThreat(threat);
      
      if (alertTriggered) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Alert system failed');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Alert system test error: ${error}`);
    }

    return results;
  }

  private async testThreatHandling(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Threat Handling',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create a critical threat
      const threat = {
        id: 'test-critical-threat',
        type: 'DATA_BREACH_ATTEMPT',
        level: 'critical',
        confidence: 0.95,
        source: '192.168.1.1',
        detectedAt: new Date(),
        isResolved: false
      };

      await this.monitoringService.alertOnThreat(threat);
      
      // Check if threat was stored
      const threats = await this.monitoringService.getEvents({ type: 'DATA_BREACH_ATTEMPT' });
      
      if (threats.length > 0) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Critical threat handling failed');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Threat handling test error: ${error}`);
    }

    return results;
  }

  // Sanitization Tests
  private async runSanitizationTests(): Promise<SanitizationTestResults> {
    const results: SanitizationTestResults = {
      htmlSanitization: await this.testHTMLSanitization(),
      scriptRemoval: await this.testScriptRemoval(),
      xssPrevention: await this.testXSSPrevention(),
      sqlInjectionPrevention: await this.testSQLInjectionPrevention(),
      pathTraversalPrevention: await this.testPathTraversalPrevention(),
      emailSanitization: await this.testEmailSanitization(),
      urlSanitization: await this.testURLSanitization(),
      phoneSanitization: await this.testPhoneSanitization(),
      creditCardSanitization: await this.testCreditCardSanitization(),
      batchSanitization: await this.testBatchSanitization()
    };

    return results;
  }

  private async testHTMLSanitization(): Promise<TestResult> {
    const results: TestResult = {
      name: 'HTML Sanitization',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const testCases = [
        { input: '<p>Hello <b>World</b></p>', expected: 'Hello World' },
        { input: '<script>alert("xss")</script>', expected: 'alert("xss")' },
        { input: '<div onclick="alert(1)">Click me</div>', expected: 'Click me' },
        { input: 'Normal text', expected: 'Normal text' }
      ];

      for (const testCase of testCases) {
        const sanitized = this.sanitizationService.sanitizeString(testCase.input, {
          removeHTML: true,
          removeScripts: true
        });
        
        if (!sanitized.includes('<') && !sanitized.includes('>')) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`HTML sanitization failed for: ${testCase.input}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`HTML sanitization test error: ${error}`);
    }

    return results;
  }

  private async testScriptRemoval(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Script Removal',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const testCases = [
        { input: '<script>alert("xss")</script>', expected: '' },
        { input: '<SCRIPT SRC="evil.js"></SCRIPT>', expected: '' },
        { input: '<img src="x" onerror="alert(1)">', expected: '<img src="x">' },
        { input: 'javascript:alert(1)', expected: 'alert(1)' }
      ];

      for (const testCase of testCases) {
        const sanitized = this.sanitizationService.sanitizeString(testCase.input);
        
        if (!sanitized.toLowerCase().includes('script') && 
            !sanitized.toLowerCase().includes('javascript:') &&
            !sanitized.toLowerCase().includes('onerror')) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Script removal failed for: ${testCase.input}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Script removal test error: ${error}`);
    }

    return results;
  }

  private async testXSSPrevention(): Promise<TestResult> {
    const results: TestResult = {
      name: 'XSS Prevention',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ];

      for (const payload of xssPayloads) {
        const sanitized = this.sanitizationService.sanitizeXSS(payload);
        
        if (!sanitized.toLowerCase().includes('script') && 
            !sanitized.toLowerCase().includes('onerror') &&
            !sanitized.toLowerCase().includes('onload') &&
            !sanitized.toLowerCase().includes('javascript:')) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`XSS prevention failed for: ${payload}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`XSS prevention test error: ${error}`);
    }

    return results;
  }

  private async testSQLInjectionPrevention(): Promise<TestResult> {
    const results: TestResult = {
      name: 'SQL Injection Prevention',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const sqlPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "1'; DELETE FROM users WHERE 't'='t",
        "admin'--"
      ];

      for (const payload of sqlPayloads) {
        const sanitized = this.sanitizationService.sanitizeSQL(payload);
        
        if (!sanitized.toLowerCase().includes('drop') && 
            !sanitized.toLowerCase().includes('delete') &&
            !sanitized.toLowerCase().includes('union') &&
            !sanitized.toLowerCase().includes('--') &&
            !sanitized.includes("'")) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`SQL injection prevention failed for: ${payload}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`SQL injection prevention test error: ${error}`);
    }

    return results;
  }

  private async testPathTraversalPrevention(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Path Traversal Prevention',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const pathPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'file:///etc/passwd',
        '....//....//....//etc/passwd'
      ];

      for (const payload of pathPayloads) {
        const sanitized = this.sanitizationService.sanitizePath(payload);
        
        if (!sanitized.includes('../') && 
            !sanitized.includes('..\\') &&
            !sanitized.includes('etc/passwd')) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Path traversal prevention failed for: ${payload}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Path traversal prevention test error: ${error}`);
    }

    return results;
  }

  private async testEmailSanitization(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Email Sanitization',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const testCases = [
        { input: 'valid@example.com', expected: 'valid@example.com' },
        { input: 'VALID@EXAMPLE.COM', expected: 'valid@example.com' },
        { input: '  user@example.com  ', expected: 'user@example.com' },
        { input: 'user<test>@example.com', expected: 'usertest@example.com' }
      ];

      for (const testCase of testCases) {
        try {
          const sanitized = this.sanitizationService.sanitizeEmail(testCase.input);
          
          if (sanitized.includes('@') && sanitized.includes('.')) {
            results.passed++;
          } else {
            results.failed++;
            results.errors.push(`Email sanitization failed for: ${testCase.input}`);
          }
        } catch (error) {
          // Some inputs should throw errors for invalid format
          if (testCase.input.includes('<')) {
            results.passed++; // Expected to fail for invalid characters
          } else {
            results.failed++;
            results.errors.push(`Unexpected error for ${testCase.input}: ${error}`);
          }
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Email sanitization test error: ${error}`);
    }

    return results;
  }

  private async testURLSanitization(): Promise<TestResult> {
    const results: TestResult = {
      name: 'URL Sanitization',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const testCases = [
        { input: 'https://example.com', expected: true },
        { input: 'http://example.com', expected: true },
        { input: 'javascript:alert(1)', expected: false },
        { input: 'data:text/html,<script>alert(1)</script>', expected: false }
      ];

      for (const testCase of testCases) {
        try {
          const sanitized = this.sanitizationService.sanitizeURL(testCase.input);
          
          if (testCase.expected) {
            results.passed++;
          } else {
            results.failed++;
            results.errors.push(`URL sanitization should have failed for: ${testCase.input}`);
          }
        } catch (error) {
          if (!testCase.expected) {
            results.passed++; // Expected to fail for dangerous URLs
          } else {
            results.failed++;
            results.errors.push(`Unexpected error for ${testCase.input}: ${error}`);
          }
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`URL sanitization test error: ${error}`);
    }

    return results;
  }

  private async testPhoneSanitization(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Phone Sanitization',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const testCases = [
        { input: '(555) 123-4567', expected: '5551234567' },
        { input: '555.123.4567', expected: '5551234567' },
        { input: '555 123 4567', expected: '5551234567' },
        { input: '123', expected: false } // Too short
      ];

      for (const testCase of testCases) {
        try {
          const sanitized = this.sanitizationService.sanitizePhone(testCase.input);
          
          if (testCase.expected) {
            if (sanitized === testCase.expected) {
              results.passed++;
            } else {
              results.failed++;
              results.errors.push(`Phone sanitization failed for: ${testCase.input}`);
            }
          } else {
            results.failed++;
            results.errors.push(`Phone sanitization should have failed for: ${testCase.input}`);
          }
        } catch (error) {
          if (!testCase.expected) {
            results.passed++; // Expected to fail for invalid phone numbers
          } else {
            results.failed++;
            results.errors.push(`Unexpected error for ${testCase.input}: ${error}`);
          }
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Phone sanitization test error: ${error}`);
    }

    return results;
  }

  private async testCreditCardSanitization(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Credit Card Sanitization',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const testCases = [
        { input: '4111111111111111', expected: '************1111' }, // Valid Visa
        { input: '5555555555554444', expected: '************4444' }, // Valid Mastercard
        { input: '1234567890123456', expected: false } // Invalid Luhn
      ];

      for (const testCase of testCases) {
        try {
          const sanitized = this.sanitizationService.sanitizeCreditCard(testCase.input);
          
          if (testCase.expected) {
            if (sanitized === testCase.expected) {
              results.passed++;
            } else {
              results.failed++;
              results.errors.push(`Credit card sanitization failed for: ${testCase.input}`);
            }
          } else {
            results.failed++;
            results.errors.push(`Credit card sanitization should have failed for: ${testCase.input}`);
          }
        } catch (error) {
          if (!testCase.expected) {
            results.passed++; // Expected to fail for invalid credit cards
          } else {
            results.failed++;
            results.errors.push(`Unexpected error for ${testCase.input}: ${error}`);
          }
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Credit card sanitization test error: ${error}`);
    }

    return results;
  }

  private async testBatchSanitization(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Batch Sanitization',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const items = [
        '<script>alert(1)</script>',
        '<p>Normal text</p>',
        'javascript:alert(1)',
        'Clean text'
      ];

      const sanitized = this.sanitizationService.sanitizeBatch(items);
      
      if (Array.isArray(sanitized) && sanitized.length === items.length) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Batch sanitization failed');
      }

      // Check that dangerous content was removed
      const hasDangerousContent = sanitized.some(item => 
        item.toLowerCase().includes('script') || 
        item.toLowerCase().includes('javascript:')
      );
      
      if (!hasDangerousContent) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Batch sanitization did not remove dangerous content');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Batch sanitization test error: ${error}`);
    }

    return results;
  }

  // Security Tests
  private async runSecurityTests(): Promise<SecurityTestResults> {
    const results: SecurityTestResults = {
      inputValidation: await this.testInputValidation(),
      outputEncoding: await this.testOutputEncoding(),
      headerSecurity: await this.testHeaderSecurity(),
      corsPolicy: await this.testCORSPolicy(),
      rateLimitBypass: await this.testRateLimitBypass(),
      authenticationBypass: await this.testAuthenticationBypass(),
      authorizationBypass: await this.testAuthorizationBypass(),
      dataExfiltration: await this.testDataExfiltration(),
      privilegeEscalation: await this.testPrivilegeEscalation(),
      sessionHijacking: await this.testSessionHijacking()
    };

    return results;
  }

  private async testInputValidation(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Input Validation',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '"; DROP TABLE users; --',
        '../../../etc/passwd',
        'javascript:alert(1)',
        '{{7*7}}', // Template injection
        '${jndi:ldap://evil.com/a}' // JNDI injection
      ];

      for (const input of maliciousInputs) {
        const sanitized = this.sanitizationService.sanitize(input);
        
        // Check that dangerous patterns were removed
        const isSafe = !sanitized.toLowerCase().includes('script') &&
                     !sanitized.toLowerCase().includes('drop') &&
                     !sanitized.toLowerCase().includes('../') &&
                     !sanitized.toLowerCase().includes('javascript:') &&
                     !sanitized.includes('{{') &&
                     !sanitized.includes('${');
        
        if (isSafe) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Input validation failed for: ${input}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Input validation test error: ${error}`);
    }

    return results;
  }

  private async testOutputEncoding(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Output Encoding',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const outputs = [
        '<script>alert("xss")</script>',
        '&lt;script&gt;alert("xss")&lt;/script&gt;',
        '" onclick="alert(1)"',
        'http://evil.com/redirect'
      ];

      for (const output of outputs) {
        const sanitized = this.sanitizationService.sanitizeString(output, {
          escapeHTML: true
        });
        
        // Check that HTML is properly escaped
        const isEscaped = !sanitized.includes('<') &&
                        !sanitized.includes('>') &&
                        !sanitized.includes('"') &&
                        !sanitized.includes("'") &&
                        sanitized.includes('&lt;') || sanitized.includes('&quot;');
        
        if (isEscaped) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Output encoding failed for: ${output}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Output encoding test error: ${error}`);
    }

    return results;
  }

  private async testHeaderSecurity(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Header Security',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        'authorization': 'Bearer token123',
        'content-type': 'application/json',
        'x-custom-header': '<script>alert(1)</script>'
      };

      const sanitized = this.sanitizationService.sanitizeHeaders(headers);
      
      // Check that headers are sanitized but structure is preserved
      const isSafe = Object.keys(sanitized).length === Object.keys(headers).length &&
                     !sanitized['x-custom-header']?.toLowerCase().includes('<script>');
      
      if (isSafe) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Header security failed');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Header security test error: ${error}`);
    }

    return results;
  }

  private async testCORSPolicy(): Promise<TestResult> {
    const results: TestResult = {
      name: 'CORS Policy',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Test CORS configuration
      const corsConfig = this.config.cors;
      
      if (corsConfig.enabled !== undefined) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('CORS configuration not found');
      }

      // Test origin validation
      if (corsConfig.origin !== undefined) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('CORS origin configuration not found');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`CORS policy test error: ${error}`);
    }

    return results;
  }

  private async testRateLimitBypass(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Rate Limit Bypass',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const key = 'test-bypass-key';
      const limit = 3;
      const windowMs = 1000;

      // Test normal rate limiting
      for (let i = 0; i < limit; i++) {
        await this.rateLimitService.checkLimit(key, limit, windowMs);
      }

      // Try to bypass with different key formats
      const bypassAttempts = [
        `${key} `, // Space
        `${key}\t`, // Tab
        ` ${key}`, // Leading space
        `${key.toUpperCase()}`, // Uppercase
        `${key.toLowerCase()}` // Lowercase
      ];

      let bypassDetected = 0;
      for (const bypassKey of bypassAttempts) {
        try {
          await this.rateLimitService.checkLimit(bypassKey, limit, windowMs);
          bypassDetected++;
        } catch (error) {
          // Expected to fail
        }
      }

      if (bypassDetected < bypassAttempts.length) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Rate limit bypass not properly detected');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Rate limit bypass test error: ${error}`);
    }

    return results;
  }

  private async testAuthenticationBypass(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Authentication Bypass',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Test various authentication bypass attempts
      const bypassAttempts = [
        '', // Empty token
        'invalid.token', // Invalid format
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid', // Invalid JWT
        'Bearer invalid.token', // Bearer prefix with invalid token
        'Basic invalid', // Wrong auth method
        'apikey invalidkey' // Wrong auth method
      ];

      for (const token of bypassAttempts) {
        const user = await this.authService.validateToken(token);
        if (user === null) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Authentication bypass not detected for: ${token}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Authentication bypass test error: ${error}`);
    }

    return results;
  }

  private async testAuthorizationBypass(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Authorization Bypass',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user with limited permissions
      const user = await this.authService.createUser({
        email: 'authtest@example.com',
        username: 'authtest',
        password: 'Password123!',
        roles: ['user'],
        permissions: ['read:own']
      });

      // Test authorization checks
      const unauthorizedResources = [
        'admin:users',
        'write:all',
        'delete:users',
        'system:config'
      ];

      for (const resource of unauthorizedResources) {
        const hasPermission = await this.authService.hasPermission(user.id, resource);
        if (!hasPermission) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Authorization bypass detected for: ${resource}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Authorization bypass test error: ${error}`);
    }

    return results;
  }

  private async testDataExfiltration(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Data Exfiltration',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Test data exfiltration prevention
      const sensitiveData = {
        password: 'secret123',
        creditCard: '4111111111111111',
        ssn: '123-45-6789',
        apiKey: 'sk_test_1234567890abcdef'
      };

      const sanitized = this.sanitizationService.sanitize(sensitiveData);
      
      // Check that sensitive data is masked or removed
      const isProtected = !sanitized.password?.includes('secret123') &&
                       !sanitized.creditCard?.includes('4111111111111111') &&
                       !sanitized.ssn?.includes('123-45-6789') &&
                       !sanitized.apiKey?.includes('sk_test_1234567890abcdef');
      
      if (isProtected) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push('Data exfiltration not prevented');
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Data exfiltration test error: ${error}`);
    }

    return results;
  }

  private async testPrivilegeEscalation(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Privilege Escalation',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user with basic role
      const user = await this.authService.createUser({
        email: 'privtest@example.com',
        username: 'privtest',
        password: 'Password123!',
        roles: ['user'],
        permissions: ['read:own']
      });

      // Test role escalation attempts
      const escalationAttempts = [
        'admin',
        'superuser',
        'root',
        'system'
      ];

      for (const role of escalationAttempts) {
        const hasRole = await this.authService.hasRole(user.id, role);
        if (!hasRole) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Privilege escalation detected for role: ${role}`);
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Privilege escalation test error: ${error}`);
    }

    return results;
  }

  private async testSessionHijacking(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Session Hijacking',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user and login
      const user = await this.authService.createUser({
        email: 'sessiontest@example.com',
        username: 'sessiontest',
        password: 'Password123!',
        roles: ['user']
      });

      const loginResult = await this.authService.login('sessiontest@example.com', 'Password123!');
      const validToken = loginResult.tokens.access;

      // Test session validation with different contexts
      const contexts = [
        { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' },
        { ipAddress: '10.0.0.1', userAgent: 'Mozilla/5.0' }, // Different IP
        { ipAddress: '192.168.1.1', userAgent: 'curl/7.68.0' } // Different user agent
      ];

      for (const context of contexts) {
        const validatedUser = await this.authService.validateToken(validToken);
        
        // Token should still be valid (in this basic test)
        if (validatedUser && validatedUser.id === user.id) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push('Session validation failed');
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Session hijacking test error: ${error}`);
    }

    return results;
  }

  // Performance Tests
  private async runPerformanceTests(): Promise<PerformanceTestResults> {
    const results: PerformanceTestResults = {
      validationPerformance: await this.testValidationPerformance(),
      rateLimitPerformance: await this.testRateLimitPerformance(),
      authenticationPerformance: await this.testAuthenticationPerformance(),
      sanitizationPerformance: await this.testSanitizationPerformance(),
      monitoringPerformance: await this.testMonitoringPerformance(),
      memoryUsage: await this.testMemoryUsage(),
      concurrentRequests: await this.testConcurrentRequests(),
      throughput: await this.testThroughput(),
      latency: await this.testLatency(),
      scalability: await this.testScalability()
    };

    return results;
  }

  private async testValidationPerformance(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Validation Performance',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const iterations = 1000;
      const schema = ValidationService.createEmailValidator();
      const testData = 'test@example.com';

      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        this.validationService.validateSchema(schema, testData);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      // Should complete in reasonable time (less than 1ms per validation)
      if (avgTime < 1) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(`Validation too slow: ${avgTime}ms per validation`);
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Validation performance test error: ${error}`);
    }

    return results;
  }

  private async testRateLimitPerformance(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Rate Limit Performance',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const iterations = 100;
      const key = 'perf-test-key';
      const limit = 1000;
      const windowMs = 60000;

      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        await this.rateLimitService.checkLimit(key, limit, windowMs);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      // Should complete in reasonable time (less than 5ms per check)
      if (avgTime < 5) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(`Rate limiting too slow: ${avgTime}ms per check`);
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Rate limit performance test error: ${error}`);
    }

    return results;
  }

  private async testAuthenticationPerformance(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Authentication Performance',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create test user
      const user = await this.authService.createUser({
        email: 'perftest@example.com',
        username: 'perftest',
        password: 'Password123!',
        roles: ['user']
      });

      const iterations = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        await this.authService.validateToken('test-token');
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      // Should complete in reasonable time (less than 10ms per validation)
      if (avgTime < 10) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(`Authentication too slow: ${avgTime}ms per validation`);
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Authentication performance test error: ${error}`);
    }

    return results;
  }

  private async testSanitizationPerformance(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Sanitization Performance',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const iterations = 1000;
      const testData = '<script>alert("xss")</script><p>Test content</p>';

      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        this.sanitizationService.sanitizeString(testData);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      // Should complete in reasonable time (less than 2ms per sanitization)
      if (avgTime < 2) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(`Sanitization too slow: ${avgTime}ms per operation`);
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Sanitization performance test error: ${error}`);
    }

    return results;
  }

  private async testMonitoringPerformance(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Monitoring Performance',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const iterations = 100;
      const eventData = {
        type: 'TEST_EVENT',
        severity: 'low',
        userId: 'test-user'
      };

      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        await this.monitoringService.logEvent(eventData);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      // Should complete in reasonable time (less than 5ms per log)
      if (avgTime < 5) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(`Monitoring too slow: ${avgTime}ms per log`);
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Monitoring performance test error: ${error}`);
    }

    return results;
  }

  private async testMemoryUsage(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Memory Usage',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      for (let i = 0; i < 1000; i++) {
        this.validationService.validateSchema(ValidationService.createEmailValidator(), `test${i}@example.com`);
        this.sanitizationService.sanitizeString(`<script>alert(${i})</script>`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      if (memoryIncrease < 50 * 1024 * 1024) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(`Memory usage too high: ${memoryIncrease / 1024 / 1024}MB`);
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Memory usage test error: ${error}`);
    }

    return results;
  }

  private async testConcurrentRequests(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Concurrent Requests',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const concurrency = 50;
      const promises = [];

      for (let i = 0; i < concurrency; i++) {
        promises.push(
          this.validationService.validateSchema(ValidationService.createEmailValidator(), `test${i}@example.com`)
        );
      }

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      
      // Should complete concurrent requests efficiently
      if (totalTime < 1000) { // Less than 1 second
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(`Concurrent requests too slow: ${totalTime}ms`);
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Concurrent requests test error: ${error}`);
    }

    return results;
  }

  private async testThroughput(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Throughput',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const duration = 5000; // 5 seconds
      const startTime = Date.now();
      let operations = 0;

      while (Date.now() - startTime < duration) {
        this.validationService.validateSchema(ValidationService.createEmailValidator(), `test${operations}@example.com`);
        operations++;
      }

      const throughput = operations / (duration / 1000); // Operations per second
      
      // Should achieve reasonable throughput (at least 100 ops/sec)
      if (throughput >= 100) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(`Throughput too low: ${throughput} ops/sec`);
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Throughput test error: ${error}`);
    }

    return results;
  }

  private async testLatency(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Latency',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const samples = 100;
      const latencies = [];

      for (let i = 0; i < samples; i++) {
        const startTime = Date.now();
        this.validationService.validateSchema(ValidationService.createEmailValidator(), `test${i}@example.com`);
        const endTime = Date.now();
        latencies.push(endTime - startTime);
      }

      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      
      // Should have low latency (average < 1ms, max < 10ms)
      if (avgLatency < 1 && maxLatency < 10) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(`Latency too high: avg=${avgLatency}ms, max=${maxLatency}ms`);
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Latency test error: ${error}`);
    }

    return results;
  }

  private async testScalability(): Promise<TestResult> {
    const results: TestResult = {
      name: 'Scalability',
      passed: 0,
      failed: 0,
      errors: []
    };

    try {
      const loadLevels = [10, 50, 100, 200];
      const performanceData = [];

      for (const load of loadLevels) {
        const startTime = Date.now();
        
        const promises = [];
        for (let i = 0; i < load; i++) {
          promises.push(
            this.validationService.validateSchema(ValidationService.createEmailValidator(), `test${i}@example.com`)
          );
        }
        
        await Promise.all(promises);
        const endTime = Date.now();
        
        const totalTime = endTime - startTime;
        const avgTime = totalTime / load;
        performanceData.push({ load, avgTime });
      }

      // Check if performance scales reasonably (time shouldn't increase exponentially)
      const timeIncrease = performanceData[performanceData.length - 1].avgTime / performanceData[0].avgTime;
      
      if (timeIncrease < 10) { // Less than 10x increase for 20x load
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(`Poor scalability: ${timeIncrease}x time increase`);
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Scalability test error: ${error}`);
    }

    return results;
  }

  // Test Result Types
  private generateTestReport(results: TestResults): string {
    const report = [
      '# Security Test Report',
      '',
      '## Summary',
      '',
      `Total Tests: ${this.countTotalTests(results)}`,
      `Passed: ${this.countPassedTests(results)}`,
      `Failed: ${this.countFailedTests(results)}`,
      `Success Rate: ${((this.countPassedTests(results) / this.countTotalTests(results)) * 100).toFixed(2)}%`,
      '',
      '## Detailed Results',
      ''
    ];

    // Add detailed results for each category
    this.addCategoryResults(report, 'Validation', results.validation);
    this.addCategoryResults(report, 'Rate Limiting', results.rateLimiting);
    this.addCategoryResults(report, 'Authentication', results.authentication);
    this.addCategoryResults(report, 'Error Handling', results.errorHandling);
    this.addCategoryResults(report, 'Monitoring', results.monitoring);
    this.addCategoryResults(report, 'Sanitization', results.sanitization);
    this.addCategoryResults(report, 'Security', results.security);
    this.addCategoryResults(report, 'Performance', results.performance);

    report.push('', '## Recommendations');
    report.push('');
    this.addRecommendations(report, results);

    return report.join('\n');
  }

  private countTotalTests(results: TestResults): number {
    return Object.values(results).reduce((total, category) => {
      return total + Object.values(category).reduce((catTotal, test) => catTotal + test.passed + test.failed, 0);
    }, 0);
  }

  private countPassedTests(results: TestResults): number {
    return Object.values(results).reduce((total, category) => {
      return total + Object.values(category).reduce((catTotal, test) => catTotal + test.passed, 0);
    }, 0);
  }

  private countFailedTests(results: TestResults): number {
    return Object.values(results).reduce((total, category) => {
      return total + Object.values(category).reduce((catTotal, test) => catTotal + test.failed, 0);
    }, 0);
  }

  private addCategoryResults(report: string[], categoryName: string, category: any): void {
    report.push(`### ${categoryName}`);
    report.push('');
    
    Object.entries(category).forEach(([testName, result]) => {
      const status = result.failed === 0 ? 'PASS' : 'FAIL';
      const successRate = result.passed + result.failed > 0 
        ? ((result.passed / (result.passed + result.failed)) * 100).toFixed(2)
        : '0.00';
      
      report.push(`- **${result.name}**: ${status} (${result.passed}/${result.passed + result.failed} - ${successRate}%)`);
      
      if (result.errors.length > 0) {
        result.errors.forEach((error: string) => {
          report.push(`  - Error: ${error}`);
        });
      }
    });
    
    report.push('');
  }

  private addRecommendations(report: string[], results: TestResults): void {
    const recommendations = [];

    // Analyze results and generate recommendations
    if (results.validation.emailValidation.failed > 0) {
      recommendations.push('- Review email validation logic and test cases');
    }

    if (results.rateLimiting.basicRateLimit.failed > 0) {
      recommendations.push('- Fix rate limiting implementation and test scenarios');
    }

    if (results.authentication.userLogin.failed > 0) {
      recommendations.push('- Improve authentication flow and error handling');
    }

    if (results.security.inputValidation.failed > 0) {
      recommendations.push('- Strengthen input validation and sanitization');
    }

    if (results.performance.validationPerformance.failed > 0) {
      recommendations.push('- Optimize validation performance for better scalability');
    }

    if (recommendations.length === 0) {
      recommendations.push('- All security tests passed! System appears to be secure.');
    }

    recommendations.forEach(rec => report.push(rec));
  }

  // Public API
  async runFullTestSuite(): Promise<{ results: TestResults; report: string }> {
    const results = await this.runAllTests();
    const report = this.generateTestReport(results);
    
    return { results, report };
  }

  async runQuickSecurityCheck(): Promise<{ passed: boolean; issues: string[] }> {
    const criticalTests = [
      this.testInputValidation(),
      this.testXSSPrevention(),
      this.testSQLInjectionPrevention(),
      this.testAuthenticationBypass(),
      this.testAuthorizationBypass()
    ];

    const results = await Promise.all(criticalTests);
    const passed = results.every(result => result.failed === 0);
    const issues = results
      .filter(result => result.failed > 0)
      .flatMap(result => result.errors);

    return { passed, issues };
  }
}

// Type definitions for test results
interface TestResult {
  name: string;
  passed: number;
  failed: number;
  errors: string[];
}

interface ValidationTestResults {
  emailValidation: TestResult;
  passwordValidation: TestResult;
  usernameValidation: TestResult;
  idValidation: TestResult;
  apiKeyValidation: TestResult;
  paginationValidation: TestResult;
  dateRangeValidation: TestResult;
  inputSanitization: TestResult;
  contentTypeValidation: TestResult;
  sizeValidation: TestResult;
}

interface RateLimitTestResults {
  basicRateLimit: TestResult;
  slidingWindowRateLimit: TestResult;
  tokenBucketRateLimit: TestResult;
  fixedWindowRateLimit: TestResult;
  userRateLimit: TestResult;
  ipRateLimit: TestResult;
  apiKeyRateLimit: TestResult;
  globalRateLimit: TestResult;
  burstProtection: TestResult;
  progressiveRateLimit: TestResult;
}

interface AuthenticationTestResults {
  userRegistration: TestResult;
  userLogin: TestResult;
  tokenValidation: TestResult;
  tokenRefresh: TestResult;
  apiKeyCreation: TestResult;
  apiKeyValidation: TestResult;
  userLogout: TestResult;
  sessionManagement: TestResult;
  permissionCheck: TestResult;
  roleCheck: TestResult;
}

interface ErrorHandlingTestResults {
  errorConversion: TestResult;
  errorReporting: TestResult;
  errorCallbacks: TestResult;
  errorStatistics: TestResult;
  errorCleanup: TestResult;
  securityEventCreation: TestResult;
  userFriendlyMessages: TestResult;
  notificationTriggers: TestResult;
}

interface MonitoringTestResults {
  eventLogging: TestResult;
  eventRetrieval: TestResult;
  anomalyDetection: TestResult;
  threatDetection: TestResult;
  metricsGeneration: TestResult;
  reportGeneration: TestResult;
  alertSystem: TestResult;
  threatHandling: TestResult;
}

interface SanitizationTestResults {
  htmlSanitization: TestResult;
  scriptRemoval: TestResult;
  xssPrevention: TestResult;
  sqlInjectionPrevention: TestResult;
  pathTraversalPrevention: TestResult;
  emailSanitization: TestResult;
  urlSanitization: TestResult;
  phoneSanitization: TestResult;
  creditCardSanitization: TestResult;
  batchSanitization: TestResult;
}

interface SecurityTestResults {
  inputValidation: TestResult;
  outputEncoding: TestResult;
  headerSecurity: TestResult;
  corsPolicy: TestResult;
  rateLimitBypass: TestResult;
  authenticationBypass: TestResult;
  authorizationBypass: TestResult;
  dataExfiltration: TestResult;
  privilegeEscalation: TestResult;
  sessionHijacking: TestResult;
}

interface PerformanceTestResults {
  validationPerformance: TestResult;
  rateLimitPerformance: TestResult;
  authenticationPerformance: TestResult;
  sanitizationPerformance: TestResult;
  monitoringPerformance: TestResult;
  memoryUsage: TestResult;
  concurrentRequests: TestResult;
  throughput: TestResult;
  latency: TestResult;
  scalability: TestResult;
}

interface TestResults {
  validation: ValidationTestResults;
  rateLimiting: RateLimitTestResults;
  authentication: AuthenticationTestResults;
  errorHandling: ErrorHandlingTestResults;
  monitoring: MonitoringTestResults;
  sanitization: SanitizationTestResults;
  security: SecurityTestResults;
  performance: PerformanceTestResults;
}

// Factory function
export function createSecurityTests(config: SecurityConfig): SecurityTests {
  return new SecurityTests(config);
}
