/**
 * Credits System Core Module
 * Handles usage credits, billing, and subscription management
 */

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  validityDays: number;
  features: string[];
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'purchase' | 'usage' | 'refund' | 'bonus';
  amount: number;
  balance: number;
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface CreditUsage {
  id: string;
  userId: string;
  action: string;
  creditsUsed: number;
  metadata: {
    leadId?: string;
    campaignId?: string;
    messageId?: string;
    offerId?: string;
  };
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'suspended';
  currentCredits: number;
  totalCredits: number;
  creditsUsed: number;
  renewalDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditConfig {
  defaultCredits: number;
  leadGenerationCost: number;
  personalizationCost: number;
  outreachCost: number;
  offerCreationCost: number;
  currency: string;
}

export class CreditsSystem {
  private transactions: Map<string, CreditTransaction> = new Map();
  private usage: Map<string, CreditUsage> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private creditPackages: Map<string, CreditPackage> = new Map();
  private config: CreditConfig;

  constructor(config: CreditConfig) {
    this.config = config;
    this.initializeCreditPackages();
  }

  private initializeCreditPackages(): void {
    const packages: CreditPackage[] = [
      {
        id: 'starter_credits',
        name: 'Starter Credits',
        credits: 1000,
        price: 99,
        currency: 'USD',
        validityDays: 30,
        features: [
          'Lead generation (10 credits/lead)',
          'Email personalization (5 credits/email)',
          'Basic analytics'
        ]
      },
      {
        id: 'professional_credits',
        name: 'Professional Credits',
        credits: 5000,
        price: 399,
        currency: 'USD',
        validityDays: 30,
        features: [
          'Lead generation (8 credits/lead)',
          'Email personalization (3 credits/email)',
          'Advanced analytics',
          'Priority support',
          'A/B testing'
        ]
      },
      {
        id: 'enterprise_credits',
        name: 'Enterprise Credits',
        credits: 20000,
        price: 1499,
        currency: 'USD',
        validityDays: 30,
        features: [
          'Lead generation (5 credits/lead)',
          'Email personalization (2 credits/email)',
          'Real-time analytics',
          'Dedicated support',
          'Custom integrations',
          'API access'
        ]
      }
    ];

    packages.forEach(pkg => {
      this.creditPackages.set(pkg.id, pkg);
    });
  }

  async createSubscription(
    userId: string,
    planId: string
  ): Promise<Subscription> {
    const package_ = this.creditPackages.get(planId);
    if (!package_) throw new Error('Invalid plan ID');

    const subscription: Subscription = {
      id: `sub_${userId}_${Date.now()}`,
      userId,
      planId,
      status: 'active',
      currentCredits: package_.credits,
      totalCredits: package_.credits,
      creditsUsed: 0,
      renewalDate: new Date(Date.now() + package_.validityDays * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.subscriptions.set(subscription.id, subscription);

    // Record purchase transaction
    await this.recordTransaction(userId, 'purchase', package_.credits, {
      planId,
      price: package_.price,
      currency: package_.currency
    });

    return subscription;
  }

  async useCredits(
    userId: string,
    action: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) throw new Error('No active subscription found');

    const creditsRequired = this.getCreditsRequired(action);
    if (subscription.currentCredits < creditsRequired) {
      return false; // Insufficient credits
    }

    // Deduct credits
    subscription.currentCredits -= creditsRequired;
    subscription.creditsUsed += creditsRequired;
    subscription.updatedAt = new Date();

    this.subscriptions.set(subscription.id, subscription);

    // Record usage
    const usage: CreditUsage = {
      id: `usage_${Date.now()}_${userId}`,
      userId,
      action,
      creditsUsed: creditsRequired,
      metadata,
      createdAt: new Date()
    };

    this.usage.set(usage.id, usage);

    // Record transaction
    await this.recordTransaction(userId, 'usage', -creditsRequired, {
      action,
      ...metadata
    });

    return true;
  }

  async addCredits(
    userId: string,
    amount: number,
    description: string = 'Credit addition'
  ): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) throw new Error('No active subscription found');

    subscription.currentCredits += amount;
    subscription.totalCredits += amount;
    subscription.updatedAt = new Date();

    this.subscriptions.set(subscription.id, subscription);

    // Record transaction
    await this.recordTransaction(userId, 'bonus', amount, { description });
  }

  async refundCredits(
    userId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) throw new Error('No active subscription found');

    subscription.currentCredits += amount;
    subscription.creditsUsed = Math.max(0, subscription.creditsUsed - amount);
    subscription.updatedAt = new Date();

    this.subscriptions.set(subscription.id, subscription);

    // Record transaction
    await this.recordTransaction(userId, 'refund', amount, { reason });
  }

  async getBalance(userId: string): Promise<number> {
    const subscription = await this.getActiveSubscription(userId);
    return subscription ? subscription.currentCredits : 0;
  }

  async getUsageHistory(userId: string): Promise<CreditUsage[]> {
    return Array.from(this.usage.values())
      .filter(usage => usage.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getTransactionHistory(userId: string): Promise<CreditTransaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getSubscription(userId: string): Promise<Subscription | null> {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.userId === userId && subscription.status === 'active') {
        return subscription;
      }
    }
    return null;
  }

  async getCreditPackages(): Promise<CreditPackage[]> {
    return Array.from(this.creditPackages.values());
  }

  async getUsageStats(userId: string): Promise<{
    totalUsed: number;
    totalRemaining: number;
    usageByAction: Record<string, number>;
  }> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) {
      return {
        totalUsed: 0,
        totalRemaining: 0,
        usageByAction: {}
      };
    }

    const usageHistory = await this.getUsageHistory(userId);
    const usageByAction: Record<string, number> = {};

    usageHistory.forEach(usage => {
      usageByAction[usage.action] = (usageByAction[usage.action] || 0) + usage.creditsUsed;
    });

    return {
      totalUsed: subscription.creditsUsed,
      totalRemaining: subscription.currentCredits,
      usageByAction
    };
  }

  private async getActiveSubscription(userId: string): Promise<Subscription | null> {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.userId === userId && subscription.status === 'active') {
        // Check if subscription is expired
        if (subscription.renewalDate < new Date()) {
          subscription.status = 'expired';
          this.subscriptions.set(subscription.id, subscription);
          continue;
        }
        return subscription;
      }
    }
    return null;
  }

  private getCreditsRequired(action: string): number {
    switch (action) {
      case 'generate_lead':
        return this.config.leadGenerationCost;
      case 'personalize_content':
        return this.config.personalizationCost;
      case 'send_email':
        return this.config.outreachCost;
      case 'create_offer':
        return this.config.offerCreationCost;
      default:
        return 1; // Default cost
    }
  }

  private async recordTransaction(
    userId: string,
    type: 'purchase' | 'usage' | 'refund' | 'bonus',
    amount: number,
    metadata: Record<string, any>
  ): Promise<void> {
    const balance = await this.getBalance(userId);
    
    const transaction: CreditTransaction = {
      id: `tx_${Date.now()}_${userId}`,
      userId,
      type,
      amount,
      balance: type === 'usage' ? balance - amount : balance + amount,
      description: this.getTransactionDescription(type, metadata),
      metadata,
      createdAt: new Date()
    };

    this.transactions.set(transaction.id, transaction);
  }

  private getTransactionDescription(
    type: string,
    metadata: Record<string, any>
  ): string {
    switch (type) {
      case 'purchase':
        return `Purchased ${metadata.planId} plan`;
      case 'usage':
        return `Credits used for ${metadata.action}`;
      case 'refund':
        return `Refund: ${metadata.reason}`;
      case 'bonus':
        return `Bonus credits: ${metadata.description}`;
      default:
        return 'Credit transaction';
    }
  }

  async checkLowBalance(userId: string, threshold: number = 100): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance <= threshold;
  }

  async getExpiringSubscriptions(): Promise<Subscription[]> {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return Array.from(this.subscriptions.values())
      .filter(sub => 
        sub.status === 'active' && 
        sub.renewalDate <= threeDaysFromNow
      );
  }
}

export const creditsSystem = new CreditsSystem({
  defaultCredits: 1000,
  leadGenerationCost: 10,
  personalizationCost: 5,
  outreachCost: 3,
  offerCreationCost: 15,
  currency: 'USD'
});
