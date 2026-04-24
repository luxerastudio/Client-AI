import { ICreditService } from '../../domain/credit/entities/Credit';

export class CreditController {
  constructor(private creditService: ICreditService) {}

  // Get user credit balance
  async getBalance(userId: string): Promise<{ balance: number; account?: any }> {
    const balance = await this.creditService.getBalance(userId);
    const account = await this.creditService.getAccount(userId);
    
    return { balance, account };
  }

  // Check if user has sufficient credits
  async hasSufficientCredits(userId: string, amount: number): Promise<boolean> {
    return await this.creditService.hasSufficientCredits(userId, amount);
  }

  // Validate and spend credits
  async validateAndSpend(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; transaction?: any; error?: string }> {
    return await this.creditService.validateAndSpend(userId, amount, description, metadata);
  }

  // Track usage
  async trackUsage(userId: string, usage: any): Promise<any> {
    return await this.creditService.trackUsage(userId, usage);
  }

  // Create account for new user
  async createAccountForUser(userId: string, initialCredits?: number): Promise<any> {
    const existingAccount = await this.creditService.getAccount(userId);
    if (existingAccount) {
      return existingAccount;
    }
    
    return await this.creditService.createAccount(userId, initialCredits);
  }

  // Get user credit summary
  async getCreditSummary(userId: string): Promise<any> {
    const account = await this.creditService.getAccount(userId);
    const balance = await this.creditService.getBalance(userId);
    const transactions = await this.creditService.getTransactionHistory(userId, 10, 0);
    const usage = await this.creditService.getUsageHistory(userId, 10, 0);
    const stats = await this.creditService.getUsageStats(userId, 'month');
    
    return {
      account,
      balance,
      recentTransactions: transactions,
      recentUsage: usage,
      monthlyStats: stats
    };
  }
}
