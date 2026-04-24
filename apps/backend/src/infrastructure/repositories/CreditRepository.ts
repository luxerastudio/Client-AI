import { DatabaseConnection } from '../database/DatabaseConnection';
import {
  ICreditRepository,
  CreditAccount,
  CreditTransaction,
  CreditUsage,
  CreditPackage,
  AccountNotFoundError,
  InvalidTransactionError
} from '../../domain/credit/entities/Credit';

export class CreditRepository implements ICreditRepository {
  constructor(private db: DatabaseConnection) {}

  // Account operations
  async createAccount(accountData: Omit<CreditAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditAccount> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const query = `
      INSERT INTO credit_accounts (
        id, user_id, balance, total_earned, total_spent, is_active,
        monthly_limit, daily_limit, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      id,
      accountData.userId,
      accountData.balance,
      accountData.totalEarned,
      accountData.totalSpent,
      accountData.isActive,
      accountData.monthlyLimit || null,
      accountData.dailyLimit || null,
      now,
      now
    ]);
    
    return this.mapToAccount(result);
  }

  async getAccount(userId: string): Promise<CreditAccount | null> {
    const query = 'SELECT * FROM credit_accounts WHERE user_id = $1';
    const result = await this.db.queryOne(query, [userId]);
    return result ? this.mapToAccount(result) : null;
  }

  async updateAccount(userId: string, updates: Partial<CreditAccount>): Promise<CreditAccount> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.balance !== undefined) {
      fields.push(`balance = $${paramIndex++}`);
      values.push(updates.balance);
    }
    if (updates.totalEarned !== undefined) {
      fields.push(`total_earned = $${paramIndex++}`);
      values.push(updates.totalEarned);
    }
    if (updates.totalSpent !== undefined) {
      fields.push(`total_spent = $${paramIndex++}`);
      values.push(updates.totalSpent);
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }
    if (updates.monthlyLimit !== undefined) {
      fields.push(`monthly_limit = $${paramIndex++}`);
      values.push(updates.monthlyLimit);
    }
    if (updates.dailyLimit !== undefined) {
      fields.push(`daily_limit = $${paramIndex++}`);
      values.push(updates.dailyLimit);
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(userId);

    const query = `
      UPDATE credit_accounts 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.queryOne(query, values);
    if (!result) {
      throw new AccountNotFoundError(userId);
    }
    
    return this.mapToAccount(result);
  }

  async deleteAccount(userId: string): Promise<void> {
    const query = 'DELETE FROM credit_accounts WHERE user_id = $1';
    await this.db.query(query, [userId]);
  }

  // Transaction operations
  async createTransaction(transactionData: Omit<CreditTransaction, 'id' | 'createdAt'>): Promise<CreditTransaction> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const query = `
      INSERT INTO credit_transactions (
        id, user_id, type, amount, balance_before, balance_after,
        description, metadata, reference_id, reference_type, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      id,
      transactionData.userId,
      transactionData.type,
      transactionData.amount,
      transactionData.balanceBefore,
      transactionData.balanceAfter,
      transactionData.description,
      transactionData.metadata ? JSON.stringify(transactionData.metadata) : null,
      transactionData.referenceId || null,
      transactionData.referenceType || null,
      now
    ]);
    
    return this.mapToTransaction(result);
  }

  async getTransactions(userId: string, limit: number = 50, offset: number = 0): Promise<CreditTransaction[]> {
    const query = `
      SELECT * FROM credit_transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const results = await this.db.query(query, [userId, limit, offset]);
    return results.map(this.mapToTransaction);
  }

  async getTransactionsByType(userId: string, type: CreditTransaction['type']): Promise<CreditTransaction[]> {
    const query = `
      SELECT * FROM credit_transactions 
      WHERE user_id = $1 AND type = $2 
      ORDER BY created_at DESC
    `;
    const results = await this.db.query(query, [userId, type]);
    return results.map(this.mapToTransaction);
  }

  // Usage operations
  async createUsage(usageData: Omit<CreditUsage, 'id' | 'createdAt'>): Promise<CreditUsage> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const query = `
      INSERT INTO credit_usage (
        id, user_id, api_endpoint, operation, credits_spent, tokens_used,
        processing_time, model, metadata, ip_address, user_agent,
        request_id, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      id,
      usageData.userId,
      usageData.apiEndpoint,
      usageData.operation,
      usageData.creditsSpent,
      usageData.tokensUsed || null,
      usageData.processingTime || null,
      usageData.model || null,
      usageData.metadata ? JSON.stringify(usageData.metadata) : null,
      usageData.ipAddress || null,
      usageData.userAgent || null,
      usageData.requestId || null,
      usageData.status,
      now
    ]);
    
    return this.mapToUsage(result);
  }

  async getUsageHistory(userId: string, limit: number = 50, offset: number = 0): Promise<CreditUsage[]> {
    const query = `
      SELECT * FROM credit_usage 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const results = await this.db.query(query, [userId, limit, offset]);
    return results.map(this.mapToUsage);
  }

  async getUsageStats(userId: string, period: 'day' | 'week' | 'month' | 'year'): Promise<any> {
    let dateTrunc: string;
    switch (period) {
      case 'day':
        dateTrunc = 'day';
        break;
      case 'week':
        dateTrunc = 'week';
        break;
      case 'month':
        dateTrunc = 'month';
        break;
      case 'year':
        dateTrunc = 'year';
        break;
    }

    const query = `
      SELECT 
        date_trunc('${dateTrunc}', created_at) as period,
        SUM(credits_spent) as total_credits,
        COUNT(*) as total_requests,
        AVG(tokens_used) as avg_tokens,
        AVG(processing_time) as avg_processing_time
      FROM credit_usage
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 ${period}'
      GROUP BY date_trunc('${dateTrunc}', created_at)
      ORDER BY period DESC
    `;

    return await this.db.query(query, [userId]);
  }

  // Package operations
  async getAvailablePackages(): Promise<CreditPackage[]> {
    const query = 'SELECT * FROM credit_packages WHERE is_active = true ORDER BY price ASC';
    const results = await this.db.query(query);
    return results.map(this.mapToPackage);
  }

  async getPackage(packageId: string): Promise<CreditPackage | null> {
    const query = 'SELECT * FROM credit_packages WHERE id = $1';
    const result = await this.db.queryOne(query, [packageId]);
    return result ? this.mapToPackage(result) : null;
  }

  // Statistics
  async getAccountStats(userId: string): Promise<any> {
    const query = `
      SELECT 
        ca.balance,
        ca.total_earned,
        ca.total_spent,
        COUNT(ct.id) as transaction_count,
        COUNT(cu.id) as usage_count,
        COALESCE(SUM(cu.credits_spent), 0) as total_usage_credits
      FROM credit_accounts ca
      LEFT JOIN credit_transactions ct ON ca.user_id = ct.user_id
      LEFT JOIN credit_usage cu ON ca.user_id = cu.user_id
      WHERE ca.user_id = $1
      GROUP BY ca.id, ca.balance, ca.total_earned, ca.total_spent
    `;
    
    const result = await this.db.queryOne(query, [userId]);
    return result || null;
  }

  async getSystemStats(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_accounts,
        SUM(balance) as total_balance,
        SUM(total_earned) as total_earned,
        SUM(total_spent) as total_spent,
        COUNT(*) FILTER (WHERE is_active = true) as active_accounts
      FROM credit_accounts
    `;
    
    return await this.db.queryOne(query);
  }

  // Private mapping methods
  private mapToAccount(row: any): CreditAccount {
    return {
      id: row.id,
      userId: row.user_id,
      balance: parseFloat(row.balance),
      totalEarned: parseFloat(row.total_earned),
      totalSpent: parseFloat(row.total_spent),
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastResetAt: row.last_reset_at ? new Date(row.last_reset_at) : undefined,
      monthlyLimit: row.monthly_limit ? parseFloat(row.monthly_limit) : undefined,
      dailyLimit: row.daily_limit ? parseFloat(row.daily_limit) : undefined
    };
  }

  private mapToTransaction(row: any): CreditTransaction {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      amount: parseFloat(row.amount),
      balanceBefore: parseFloat(row.balance_before),
      balanceAfter: parseFloat(row.balance_after),
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      referenceId: row.reference_id,
      referenceType: row.reference_type,
      createdAt: new Date(row.created_at)
    };
  }

  private mapToUsage(row: any): CreditUsage {
    return {
      id: row.id,
      userId: row.user_id,
      apiEndpoint: row.api_endpoint,
      operation: row.operation,
      creditsSpent: parseFloat(row.credits_spent),
      tokensUsed: row.tokens_used ? parseInt(row.tokens_used) : undefined,
      processingTime: row.processing_time ? parseInt(row.processing_time) : undefined,
      model: row.model,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      requestId: row.request_id,
      status: row.status,
      createdAt: new Date(row.created_at)
    };
  }

  private mapToPackage(row: any): CreditPackage {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      credits: parseInt(row.credits),
      price: parseFloat(row.price),
      currency: row.currency,
      isActive: row.is_active,
      features: row.features ? JSON.parse(row.features) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
