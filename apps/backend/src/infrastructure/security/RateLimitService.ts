import { 
  IRateLimitService,
  RateLimitInfoSchema,
  SecurityConfig,
  SecurityContext
} from '@/domain/security/entities/Security';
import { RateLimitError } from '@/domain/security/entities/Security';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  windowStart: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

export class RateLimitService implements IRateLimitService {
  private store: RateLimitStore = {};
  private config: SecurityConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.startCleanup();
  }

  async checkLimit(key: string, limit: number, windowMs: number): Promise<any> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create entry
    let entry = this.store[key];
    
    if (!entry || entry.windowStart < windowStart) {
      // Create new entry or reset window
      entry = {
        count: 0,
        resetTime: now + windowMs,
        windowStart: now
      };
      this.store[key] = entry;
    }

    // Increment count
    entry.count++;
    
    // Calculate remaining requests
    const remaining = Math.max(0, limit - entry.count);
    const isExceeded = entry.count > limit;
    const retryAfter = isExceeded ? Math.ceil((entry.resetTime - now) / 1000) : undefined;

    const rateLimitInfo = RateLimitInfoSchema.parse({
      limit,
      current: entry.count,
      remaining,
      resetTime: new Date(entry.resetTime),
      retryAfter,
      isExceeded
    });

    if (isExceeded) {
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        rateLimitInfo
      );
    }

    return rateLimitInfo;
  }

  async resetLimit(key: string): Promise<void> {
    delete this.store[key];
  }

  async getUsageStats(key: string, timeRange: { start: Date; end: Date }): Promise<number> {
    const entry = this.store[key];
    if (!entry) return 0;

    const now = Date.now();
    const windowStart = now - (entry.resetTime - entry.windowStart);
    
    if (entry.windowStart >= timeRange.start.getTime() && 
        entry.windowStart <= timeRange.end.getTime()) {
      return entry.count;
    }

    return 0;
  }

  async setCustomLimit(key: string, limit: number, windowMs: number): Promise<void> {
    const now = Date.now();
    
    this.store[key] = {
      count: 0,
      resetTime: now + windowMs,
      windowStart: now
    };
  }

  // Middleware for Express/Fastify
  createRateLimitMiddleware(options?: {
    keyGenerator?: (request: any) => string;
    skip?: (request: any) => boolean;
    onLimitReached?: (request: any, info: any) => void;
  }) {
    return async (request: any, reply: any) => {
      // Skip if configured
      if (options?.skip?.(request)) {
        return;
      }

      // Generate key
      const key = options?.keyGenerator?.(request) || this.generateDefaultKey(request);
      
      try {
        // Check rate limit
        const info = await this.checkLimit(
          key,
          this.config.rateLimiting.maxRequests,
          this.config.rateLimiting.windowMs
        );

        // Add rate limit headers
        reply.header('X-RateLimit-Limit', info.limit);
        reply.header('X-RateLimit-Remaining', info.remaining);
        reply.header('X-RateLimit-Reset', Math.ceil(info.resetTime.getTime() / 1000));

        // Call custom handler if provided
        if (options?.onLimitReached && info.remaining === 0) {
          options.onLimitReached(request, info);
        }

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

  // Advanced rate limiting strategies

  async checkSlidingWindowLimit(key: string, limit: number, windowMs: number): Promise<any> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing requests in window (simplified - in production use Redis or similar)
    let entry = this.store[key];
    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
        windowStart: now
      };
      this.store[key] = entry;
    }

    // For sliding window, we'd need to track individual request timestamps
    // This is a simplified implementation
    entry.count++;
    
    const remaining = Math.max(0, limit - entry.count);
    const isExceeded = entry.count > limit;
    const retryAfter = isExceeded ? Math.ceil((entry.resetTime - now) / 1000) : undefined;

    return RateLimitInfoSchema.parse({
      limit,
      current: entry.count,
      remaining,
      resetTime: new Date(entry.resetTime),
      retryAfter,
      isExceeded
    });
  }

  async checkTokenBucketLimit(key: string, capacity: number, refillRate: number): Promise<any> {
    const now = Date.now();
    
    let entry = this.store[key];
    if (!entry) {
      entry = {
        count: 0,
        resetTime: now,
        windowStart: now
      };
      this.store[key] = entry;
    }

    // Calculate tokens to add based on time elapsed
    const timeElapsed = now - entry.windowStart;
    const tokensToAdd = Math.floor(timeElapsed * refillRate / 1000);
    
    // Update bucket (don't exceed capacity)
    entry.count = Math.max(0, entry.count - tokensToAdd);
    entry.windowStart = now;

    // Check if we can consume a token
    if (entry.count < capacity) {
      entry.count++;
      
      return RateLimitInfoSchema.parse({
        limit: capacity,
        current: entry.count,
        remaining: capacity - entry.count,
        resetTime: new Date(now + 1000), // Next token available in ~1 second
        isExceeded: false
      });
    } else {
      const retryAfter = Math.ceil(1000 / refillRate);
      
      return RateLimitInfoSchema.parse({
        limit: capacity,
        current: entry.count,
        remaining: 0,
        resetTime: new Date(now + retryAfter * 1000),
        retryAfter,
        isExceeded: true
      });
    }
  }

  async checkFixedWindowCounterLimit(key: string, limit: number, windowMs: number): Promise<any> {
    const now = Date.now();
    const windowNumber = Math.floor(now / windowMs);
    const windowKey = `${key}:${windowNumber}`;
    
    let entry = this.store[windowKey];
    if (!entry) {
      entry = {
        count: 0,
        resetTime: (windowNumber + 1) * windowMs,
        windowStart: windowNumber * windowMs
      };
      this.store[windowKey] = entry;
    }

    entry.count++;
    
    const remaining = Math.max(0, limit - entry.count);
    const isExceeded = entry.count > limit;
    const retryAfter = isExceeded ? Math.ceil((entry.resetTime - now) / 1000) : undefined;

    return RateLimitInfoSchema.parse({
      limit,
      current: entry.count,
      remaining,
      resetTime: new Date(entry.resetTime),
      retryAfter,
      isExceeded
    });
  }

  // User-specific rate limiting
  async checkUserRateLimit(userId: string, endpoint?: string): Promise<any> {
    const key = endpoint ? `user:${userId}:${endpoint}` : `user:${userId}`;
    
    // Get user-specific limits (could be from database)
    const userLimit = await this.getUserSpecificLimit(userId);
    const limit = userLimit || this.config.rateLimiting.maxRequests;
    
    return this.checkLimit(key, limit, this.config.rateLimiting.windowMs);
  }

  // IP-based rate limiting
  async checkIPRateLimit(ipAddress: string, endpoint?: string): Promise<any> {
    const key = endpoint ? `ip:${ipAddress}:${endpoint}` : `ip:${ipAddress}`;
    
    // IP-based limits might be stricter
    const limit = Math.floor(this.config.rateLimiting.maxRequests * 0.5);
    
    return this.checkLimit(key, limit, this.config.rateLimiting.windowMs);
  }

  // API key rate limiting
  async checkApiKeyRateLimit(apiKeyId: string): Promise<any> {
    const key = `apikey:${apiKeyId}`;
    
    // API keys might have custom limits
    const apiKeyLimit = await this.getApiKeySpecificLimit(apiKeyId);
    const limit = apiKeyLimit || this.config.rateLimiting.maxRequests * 2; // Higher limit for API keys
    
    return this.checkLimit(key, limit, this.config.rateLimiting.windowMs);
  }

  // Global rate limiting
  async checkGlobalRateLimit(): Promise<any> {
    const key = 'global';
    
    // Global limit is usually much higher
    const limit = this.config.rateLimiting.maxRequests * 10;
    
    return this.checkLimit(key, limit, this.config.rateLimiting.windowMs);
  }

  // Burst protection
  async checkBurstProtection(key: string, burstLimit: number, sustainedLimit: number, windowMs: number): Promise<any> {
    const now = Date.now();
    
    // Check burst limit (short-term)
    const burstKey = `${key}:burst`;
    const burstInfo = await this.checkLimit(burstKey, burstLimit, Math.min(windowMs / 10, 60000));
    
    if (burstInfo.isExceeded) {
      return burstInfo;
    }
    
    // Check sustained limit (long-term)
    const sustainedKey = `${key}:sustained`;
    return this.checkLimit(sustainedKey, sustainedLimit, windowMs);
  }

  // Progressive rate limiting (increases penalties for repeated violations)
  async checkProgressiveRateLimit(key: string, baseLimit: number, windowMs: number, violationCount: number): Promise<any> {
    // Calculate progressive penalty
    const penaltyMultiplier = Math.min(violationCount, 10); // Cap at 10x
    const adjustedLimit = Math.max(1, Math.floor(baseLimit / penaltyMultiplier));
    
    return this.checkLimit(key, adjustedLimit, windowMs);
  }

  // Helper methods

  private generateDefaultKey(request: any): string {
    // Try to get IP address
    const ip = request.ip || 
               request.connection?.remoteAddress || 
               request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               'unknown';
    
    // Try to get user ID or API key
    const userId = request.user?.id || request.userId;
    const apiKey = request.headers['x-api-key'] || request.apiKey;
    
    // Generate key based on available identifiers
    if (userId) return `user:${userId}`;
    if (apiKey) return `apikey:${apiKey}`;
    return `ip:${ip}`;
  }

  private async getUserSpecificLimit(userId: string): Promise<number | null> {
    // In a real implementation, this would fetch from database
    // For now, return null to use default limit
    return null;
  }

  private async getApiKeySpecificLimit(apiKeyId: string): Promise<number | null> {
    // In a real implementation, this would fetch from database
    // For now, return null to use default limit
    return null;
  }

  private startCleanup(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of Object.entries(this.store)) {
      // Remove entries that are well past their reset time
      if (entry.resetTime < now - 60000) { // Keep for 1 minute after reset
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => delete this.store[key]);
  }

  // Statistics and monitoring
  async getRateLimitStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    totalRequests: number;
    averageRequestsPerKey: number;
    topConsumers: Array<{ key: string; count: number; }>;
  }> {
    const now = Date.now();
    const entries = Object.entries(this.store);
    
    const activeEntries = entries.filter(([_, entry]) => entry.resetTime > now);
    const totalRequests = entries.reduce((sum, [_, entry]) => sum + entry.count, 0);
    const averageRequestsPerKey = entries.length > 0 ? totalRequests / entries.length : 0;
    
    // Sort by count to get top consumers
    const topConsumers = entries
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([key, entry]) => ({ key, count: entry.count }));

    return {
      totalKeys: entries.length,
      activeKeys: activeEntries.length,
      totalRequests,
      averageRequestsPerKey,
      topConsumers
    };
  }

  async resetAllLimits(): Promise<void> {
    this.store = {};
  }

  // Graceful shutdown
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Factory functions for common rate limiting scenarios

export function createRateLimitService(config: SecurityConfig): RateLimitService {
  return new RateLimitService(config);
}

export function createUserRateLimitMiddleware(rateLimitService: RateLimitService) {
  return rateLimitService.createRateLimitMiddleware({
    keyGenerator: (request) => `user:${request.user?.id || request.userId}`,
    skip: (request) => !request.user?.id && !request.userId
  });
}

export function createIPRateLimitMiddleware(rateLimitService: RateLimitService) {
  return rateLimitService.createRateLimitMiddleware({
    keyGenerator: (request) => {
      const ip = request.ip || 
                 request.connection?.remoteAddress || 
                 request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                 'unknown';
      return `ip:${ip}`;
    }
  });
}

export function createApiKeyRateLimitMiddleware(rateLimitService: RateLimitService) {
  return rateLimitService.createRateLimitMiddleware({
    keyGenerator: (request) => {
      const apiKey = request.headers['x-api-key'] || request.apiKey;
      return apiKey ? `apikey:${apiKey}` : 'unknown';
    },
    skip: (request) => !request.headers['x-api-key'] && !request.apiKey
  });
}

export function createGlobalRateLimitMiddleware(rateLimitService: RateLimitService) {
  return rateLimitService.createRateLimitMiddleware({
    keyGenerator: () => 'global'
  });
}
