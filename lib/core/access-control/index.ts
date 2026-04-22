/**
 * Access Control Layer
 * Handles user authentication, tier management, and execution permissions
 */

export interface UserTier {
  id: string;
  name: 'FREE' | 'PRO' | 'UNLIMITED';
  creditsPerMonth: number;
  maxExecutionsPerHour: number;
  maxRequestsPerMinute: number;
  features: string[];
  price: number;
}

export interface UserAccess {
  userId: string;
  tier: UserTier;
  creditsRemaining: number;
  executionsThisHour: number;
  requestsThisMinute: number;
  lastExecutionReset: Date;
  lastRequestReset: Date;
  subscriptionActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageLog {
  id: string;
  userId: string;
  action: string;
  creditsUsed: number;
  executionTime: number;
  metadata: Record<string, any>;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxExecutionsPerHour: number;
  windowSizeMinutes: number;
  windowSizeHours: number;
}

export class AccessControl {
  private userAccess: Map<string, UserAccess> = new Map();
  private usageLogs: Map<string, UsageLog[]> = new Map();
  private tiers: Map<string, UserTier> = new Map();
  private rateLimitConfig: RateLimitConfig;

  constructor() {
    this.initializeTiers();
    this.rateLimitConfig = {
      maxRequestsPerMinute: 10,
      maxExecutionsPerHour: 5,
      windowSizeMinutes: 1,
      windowSizeHours: 1
    };
  }

  private initializeTiers(): void {
    const tiers: UserTier[] = [
      {
        id: 'free',
        name: 'FREE',
        creditsPerMonth: 100,
        maxExecutionsPerHour: 2,
        maxRequestsPerMinute: 5,
        features: ['lead_generation', 'basic_personalization'],
        price: 0
      },
      {
        id: 'pro',
        name: 'PRO',
        creditsPerMonth: 1000,
        maxExecutionsPerHour: 10,
        maxRequestsPerMinute: 20,
        features: ['lead_generation', 'advanced_personalization', 'outreach', 'basic_analytics'],
        price: 99
      },
      {
        id: 'unlimited',
        name: 'UNLIMITED',
        creditsPerMonth: 10000,
        maxExecutionsPerHour: 100,
        maxRequestsPerMinute: 100,
        features: ['lead_generation', 'advanced_personalization', 'outreach', 'offers', 'advanced_analytics', 'api_access'],
        price: 499
      }
    ];

    tiers.forEach(tier => {
      this.tiers.set(tier.id, tier);
    });
  }

  async createUserAccess(userId: string, tierId: string = 'free'): Promise<UserAccess> {
    const tier = this.tiers.get(tierId);
    if (!tier) throw new Error('Invalid tier ID');

    const userAccess: UserAccess = {
      userId,
      tier,
      creditsRemaining: tier.creditsPerMonth,
      executionsThisHour: 0,
      requestsThisMinute: 0,
      lastExecutionReset: new Date(),
      lastRequestReset: new Date(),
      subscriptionActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.userAccess.set(userId, userAccess);
    return userAccess;
  }

  async checkAccess(userId: string): Promise<{
    hasCredits: boolean;
    withinLimits: boolean;
    allowedTier: boolean;
    creditsRemaining: number;
    tier: string;
  }> {
    const userAccess = this.userAccess.get(userId);
    if (!userAccess) {
      throw new Error('User access not found. Please create user access first.');
    }

    // Check subscription status
    if (!userAccess.subscriptionActive) {
      return {
        hasCredits: false,
        withinLimits: false,
        allowedTier: false,
        creditsRemaining: 0,
        tier: userAccess.tier.name
      };
    }

    // Reset counters if windows have passed
    this.resetCountersIfNeeded(userAccess);

    // Check credits
    const hasCredits = userAccess.creditsRemaining > 0;

    // Check rate limits
    const withinLimits = 
      userAccess.executionsThisHour < userAccess.tier.maxExecutionsPerHour &&
      userAccess.requestsThisMinute < userAccess.tier.maxRequestsPerMinute;

    // Check tier permissions
    const allowedTier = userAccess.tier.name !== 'FREE' || userAccess.creditsRemaining > 0;

    return {
      hasCredits,
      withinLimits,
      allowedTier,
      creditsRemaining: userAccess.creditsRemaining,
      tier: userAccess.tier.name
    };
  }

  async deductCredits(userId: string, amount: number): Promise<boolean> {
    const userAccess = this.userAccess.get(userId);
    if (!userAccess) throw new Error('User access not found');

    if (userAccess.creditsRemaining < amount) {
      return false; // Insufficient credits
    }

    userAccess.creditsRemaining -= amount;
    userAccess.updatedAt = new Date();
    this.userAccess.set(userId, userAccess);

    return true;
  }

  async incrementExecution(userId: string): Promise<boolean> {
    const userAccess = this.userAccess.get(userId);
    if (!userAccess) throw new Error('User access not found');

    this.resetCountersIfNeeded(userAccess);

    if (userAccess.executionsThisHour >= userAccess.tier.maxExecutionsPerHour) {
      return false; // Rate limit exceeded
    }

    userAccess.executionsThisHour++;
    userAccess.updatedAt = new Date();
    this.userAccess.set(userId, userAccess);

    return true;
  }

  async incrementRequest(userId: string): Promise<boolean> {
    const userAccess = this.userAccess.get(userId);
    if (!userAccess) throw new Error('User access not found');

    this.resetCountersIfNeeded(userAccess);

    if (userAccess.requestsThisMinute >= userAccess.tier.maxRequestsPerMinute) {
      return false; // Rate limit exceeded
    }

    userAccess.requestsThisMinute++;
    userAccess.updatedAt = new Date();
    this.userAccess.set(userId, userAccess);

    return true;
  }

  async logUsage(userId: string, action: string, creditsUsed: number, executionTime: number, metadata: Record<string, any> = {}, success: boolean = true, errorMessage?: string): Promise<void> {
    const log: UsageLog = {
      id: `usage_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      userId,
      action,
      creditsUsed,
      executionTime,
      metadata,
      timestamp: new Date(),
      success,
      errorMessage
    };

    if (!this.usageLogs.has(userId)) {
      this.usageLogs.set(userId, []);
    }

    const userLogs = this.usageLogs.get(userId)!;
    userLogs.push(log);

    // Keep only last 1000 logs per user
    if (userLogs.length > 1000) {
      userLogs.splice(0, userLogs.length - 1000);
    }
  }

  async getUsageLogs(userId: string, limit: number = 50): Promise<UsageLog[]> {
    const logs = this.usageLogs.get(userId) || [];
    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getUserAccess(userId: string): Promise<UserAccess | null> {
    return this.userAccess.get(userId) || null;
  }

  async upgradeTier(userId: string, newTierId: string): Promise<UserAccess | null> {
    const userAccess = this.userAccess.get(userId);
    const newTier = this.tiers.get(newTierId);
    
    if (!userAccess || !newTier) return null;

    // Add bonus credits for upgrade
    const creditBonus = newTier.creditsPerMonth - userAccess.tier.creditsPerMonth;

    userAccess.tier = newTier;
    userAccess.creditsRemaining += creditBonus;
    userAccess.updatedAt = new Date();

    this.userAccess.set(userId, userAccess);
    return userAccess;
  }

  async addCredits(userId: string, amount: number): Promise<boolean> {
    const userAccess = this.userAccess.get(userId);
    if (!userAccess) return false;

    userAccess.creditsRemaining += amount;
    userAccess.updatedAt = new Date();
    this.userAccess.set(userId, userAccess);

    return true;
  }

  async resetMonthlyCredits(userId: string): Promise<void> {
    const userAccess = this.userAccess.get(userId);
    if (!userAccess) return;

    userAccess.creditsRemaining = userAccess.tier.creditsPerMonth;
    userAccess.updatedAt = new Date();
    this.userAccess.set(userId, userAccess);
  }

  async getUsageStats(userId: string): Promise<{
    totalExecutions: number;
    totalCreditsUsed: number;
    averageExecutionTime: number;
    successRate: number;
    tier: string;
    creditsRemaining: number;
  }> {
    const logs = this.usageLogs.get(userId) || [];
    const userAccess = this.userAccess.get(userId);

    if (!userAccess) {
      throw new Error('User access not found');
    }

    const successfulLogs = logs.filter(log => log.success);
    const totalCreditsUsed = logs.reduce((sum, log) => sum + log.creditsUsed, 0);
    const totalExecutionTime = successfulLogs.reduce((sum, log) => sum + log.executionTime, 0);
    const averageExecutionTime = successfulLogs.length > 0 ? totalExecutionTime / successfulLogs.length : 0;
    const successRate = logs.length > 0 ? (successfulLogs.length / logs.length) * 100 : 0;

    return {
      totalExecutions: logs.length,
      totalCreditsUsed,
      averageExecutionTime,
      successRate,
      tier: userAccess.tier.name,
      creditsRemaining: userAccess.creditsRemaining
    };
  }

  async getTiers(): Promise<UserTier[]> {
    return Array.from(this.tiers.values());
  }

  private resetCountersIfNeeded(userAccess: UserAccess): void {
    const now = new Date();

    // Reset execution counter if hour has passed
    const hoursSinceReset = (now.getTime() - userAccess.lastExecutionReset.getTime()) / (1000 * 60 * 60);
    if (hoursSinceReset >= 1) {
      userAccess.executionsThisHour = 0;
      userAccess.lastExecutionReset = now;
    }

    // Reset request counter if minute has passed
    const minutesSinceReset = (now.getTime() - userAccess.lastRequestReset.getTime()) / (1000 * 60);
    if (minutesSinceReset >= 1) {
      userAccess.requestsThisMinute = 0;
      userAccess.lastRequestReset = now;
    }
  }
}

export const accessControl = new AccessControl();
