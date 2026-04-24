import {
  ICreditService,
  CreditAccount,
  CreditTransaction,
  CreditUsage,
  CreditPackage,
  CreditConfig,
  ICreditRepository,
  InsufficientCreditsError,
  AccountNotFoundError,
  InvalidTransactionError
} from '../../domain/credit/entities/Credit';

export class CreditService implements ICreditService {
  private config: CreditConfig;

  constructor(
    private repository: ICreditRepository,
    config?: Partial<CreditConfig>
  ) {
    this.config = {
      enabled: true,
      defaultCredits: 1000,
      monthlyReset: false,
      allowNegativeBalance: false,
      autoRefill: false,
      ...config
    };
  }

  // Account management
  async getAccount(userId: string): Promise<CreditAccount | null> {
    if (!this.config.enabled) {
      return null;
    }
    return await this.repository.getAccount(userId);
  }

  async createAccount(userId: string, initialCredits?: number): Promise<CreditAccount> {
    const existingAccount = await this.getAccount(userId);
    if (existingAccount) {
      throw new InvalidTransactionError('Account already exists', userId);
    }

    const balance = initialCredits || this.config.defaultCredits;
    const accountData = {
      userId,
      balance,
      totalEarned: balance,
      totalSpent: 0,
      isActive: true,
      monthlyLimit: this.config.monthlyLimit,
      dailyLimit: this.config.dailyLimit
    };

    const account = await this.repository.createAccount(accountData);

    // Create initial transaction
    if (balance > 0) {
      await this.repository.createTransaction({
        userId,
        type: 'earn',
        amount: balance,
        balanceBefore: 0,
        balanceAfter: balance,
        description: 'Initial credit allocation',
        referenceType: 'bonus'
      });
    }

    return account;
  }

  async updateAccount(userId: string, updates: Partial<CreditAccount>): Promise<CreditAccount> {
    const account = await this.getAccount(userId);
    if (!account) {
      throw new AccountNotFoundError(userId);
    }

    return await this.repository.updateAccount(userId, updates);
  }

  async deleteAccount(userId: string): Promise<void> {
    const account = await this.getAccount(userId);
    if (!account) {
      throw new AccountNotFoundError(userId);
    }

    await this.repository.deleteAccount(userId);
  }

  // Balance operations
  async getBalance(userId: string): Promise<number> {
    if (!this.config.enabled) {
      return Number.MAX_SAFE_INTEGER; // Unlimited credits when disabled
    }

    const account = await this.getAccount(userId);
    if (!account) {
      // Auto-create account with default credits
      const newAccount = await this.createAccount(userId);
      return newAccount.balance;
    }

    return account.balance;
  }

  async addCredits(userId: string, amount: number, description: string, metadata?: Record<string, any>): Promise<CreditTransaction> {
    if (amount <= 0) {
      throw new InvalidTransactionError('Amount must be positive', userId);
    }

    const account = await this.getAccount(userId);
    if (!account) {
      // Auto-create account
      await this.createAccount(userId, amount);
      const newAccount = await this.getAccount(userId);
      if (!newAccount) {
        throw new AccountNotFoundError(userId);
      }
    }

    const currentBalance = await this.getBalance(userId);
    const newBalance = currentBalance + amount;

    // Update account
    await this.repository.updateAccount(userId, {
      balance: newBalance,
      totalEarned: (account?.totalEarned || 0) + amount
    });

    // Create transaction
    const transaction = await this.repository.createTransaction({
      userId,
      type: 'earn',
      amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description,
      metadata,
      referenceType: 'bonus'
    });

    return transaction;
  }

  async spendCredits(userId: string, amount: number, description: string, metadata?: Record<string, any>): Promise<CreditTransaction> {
    if (amount <= 0) {
      throw new InvalidTransactionError('Amount must be positive', userId);
    }

    const hasSufficient = await this.hasSufficientCredits(userId, amount);
    if (!hasSufficient) {
      const balance = await this.getBalance(userId);
      throw new InsufficientCreditsError(userId, amount, balance);
    }

    const account = await this.getAccount(userId);
    if (!account) {
      throw new AccountNotFoundError(userId);
    }

    const currentBalance = account.balance;
    const newBalance = currentBalance - amount;

    // Update account
    await this.repository.updateAccount(userId, {
      balance: newBalance,
      totalSpent: account.totalSpent + amount
    });

    // Create transaction
    const transaction = await this.repository.createTransaction({
      userId,
      type: 'spend',
      amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description,
      metadata,
      referenceType: 'api_call'
    });

    // Check if auto-refill is needed
    if (this.config.autoRefill && this.config.refillThreshold && this.config.refillAmount) {
      if (newBalance <= this.config.refillThreshold) {
        await this.addCredits(
          userId,
          this.config.refillAmount,
          'Auto-refill triggered',
          { autoRefill: true, threshold: this.config.refillThreshold }
        );
      }
    }

    return transaction;
  }

  async refundCredits(userId: string, amount: number, description: string, referenceId?: string): Promise<CreditTransaction> {
    if (amount <= 0) {
      throw new InvalidTransactionError('Amount must be positive', userId);
    }

    const account = await this.getAccount(userId);
    if (!account) {
      throw new AccountNotFoundError(userId);
    }

    const currentBalance = account.balance;
    const newBalance = currentBalance + amount;

    // Update account
    await this.repository.updateAccount(userId, {
      balance: newBalance,
      totalEarned: account.totalEarned + amount,
      totalSpent: Math.max(0, account.totalSpent - amount)
    });

    // Create transaction
    const transaction = await this.repository.createTransaction({
      userId,
      type: 'refund',
      amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description,
      referenceId,
      referenceType: 'refund'
    });

    return transaction;
  }

  // Usage tracking
  async trackUsage(userId: string, usage: Omit<CreditUsage, 'id' | 'createdAt'>): Promise<CreditUsage> {
    return await this.repository.createUsage(usage);
  }

  async getUsageHistory(userId: string, limit?: number, offset?: number): Promise<CreditUsage[]> {
    return await this.repository.getUsageHistory(userId, limit, offset);
  }

  async getUsageStats(userId: string, period?: 'day' | 'week' | 'month' | 'year'): Promise<any> {
    return await this.repository.getUsageStats(userId, period || 'month');
  }

  // Transaction history
  async getTransactionHistory(userId: string, limit?: number, offset?: number): Promise<CreditTransaction[]> {
    return await this.repository.getTransactions(userId, limit, offset);
  }

  async getTransactionsByType(userId: string, type: CreditTransaction['type']): Promise<CreditTransaction[]> {
    return await this.repository.getTransactionsByType(userId, type);
  }

  // Validation
  async hasSufficientCredits(userId: string, amount: number): Promise<boolean> {
    if (!this.config.enabled) {
      return true;
    }

    if (this.config.allowNegativeBalance) {
      return true;
    }

    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  async validateAndSpend(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; transaction?: CreditTransaction; error?: string }> {
    try {
      const hasSufficient = await this.hasSufficientCredits(userId, amount);
      if (!hasSufficient) {
        const balance = await this.getBalance(userId);
        return {
          success: false,
          error: `Insufficient credits. Required: ${amount}, Available: ${balance}`
        };
      }

      const transaction = await this.spendCredits(userId, amount, description, metadata);
      return { success: true, transaction };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Package management
  async getAvailablePackages(): Promise<CreditPackage[]> {
    return await this.repository.getAvailablePackages();
  }

  async purchasePackage(userId: string, packageId: string): Promise<{ success: boolean; transaction?: CreditTransaction; error?: string }> {
    try {
      const packageInfo = await this.repository.getPackage(packageId);
      if (!packageInfo) {
        return { success: false, error: 'Package not found' };
      }

      const transaction = await this.addCredits(
        userId,
        packageInfo.credits,
        `Purchased package: ${packageInfo.name}`,
        { packageId, packageName: packageInfo.name, price: packageInfo.price }
      );

      return { success: true, transaction };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Reset and maintenance
  async resetMonthlyCredits(userId: string): Promise<void> {
    if (!this.config.monthlyReset) {
      return;
    }

    const account = await this.getAccount(userId);
    if (!account) {
      return;
    }

    // Check if reset is needed (last reset was in a different month)
    const now = new Date();
    const lastReset = account.lastResetAt;
    
    if (lastReset && 
        lastReset.getMonth() === now.getMonth() && 
        lastReset.getFullYear() === now.getFullYear()) {
      return; // Already reset this month
    }

    // Reset to default credits
    await this.repository.updateAccount(userId, {
      balance: this.config.defaultCredits,
      lastResetAt: now
    });

    // Create reset transaction
    await this.repository.createTransaction({
      userId,
      type: 'bonus',
      amount: this.config.defaultCredits,
      balanceBefore: account.balance,
      balanceAfter: this.config.defaultCredits,
      description: 'Monthly credit reset',
      referenceType: 'bonus'
    });
  }

  async resetDailyCredits(userId: string): Promise<void> {
    const account = await this.getAccount(userId);
    if (!account || !account.dailyLimit) {
      return;
    }

    // Check if daily usage exceeds limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const usageToday = await this.repository.getUsageHistory(userId, 1000, 0);
    const todayUsage = usageToday.filter(usage => usage.createdAt >= today);
    const creditsSpentToday = todayUsage.reduce((sum, usage) => sum + usage.creditsSpent, 0);

    if (creditsSpentToday > account.dailyLimit) {
      // Block further usage for today
      await this.repository.updateAccount(userId, { isActive: false });
      
      // Schedule reactivation for next day
      setTimeout(async () => {
        await this.repository.updateAccount(userId, { isActive: true });
      }, this.getTimeUntilTomorrow());
    }
  }

  async cleanupOldTransactions(daysToKeep: number = 90): Promise<void> {
    // This would be implemented to clean up old transactions
    // For now, just log that cleanup was called
    console.log(`Credit cleanup called - keeping ${daysToKeep} days of transactions`);
  }

  // Helper methods
  private getTimeUntilTomorrow(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - Date.now();
  }

  // Configuration
  updateConfig(config: Partial<CreditConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): CreditConfig {
    return { ...this.config };
  }
}
