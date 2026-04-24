export interface CreditAccount {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastResetAt?: Date;
  monthlyLimit?: number;
  dailyLimit?: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'earn' | 'spend' | 'refund' | 'bonus' | 'penalty';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  metadata?: Record<string, any>;
  referenceId?: string;
  referenceType?: 'api_call' | 'purchase' | 'refund' | 'bonus' | 'penalty';
  createdAt: Date;
}

export interface CreditUsage {
  id: string;
  userId: string;
  apiEndpoint: string;
  operation: string;
  creditsSpent: number;
  tokensUsed?: number;
  processingTime?: number;
  model?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  status: 'completed' | 'failed' | 'refunded';
  createdAt: Date;
}

export interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  currency: string;
  isActive: boolean;
  features?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditConfig {
  enabled: boolean;
  defaultCredits: number;
  monthlyReset: boolean;
  resetDayOfMonth?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  allowNegativeBalance: boolean;
  autoRefill: boolean;
  refillAmount?: number;
  refillThreshold?: number;
}

export interface ICreditService {
  // Account management
  getAccount(userId: string): Promise<CreditAccount | null>;
  createAccount(userId: string, initialCredits?: number): Promise<CreditAccount>;
  updateAccount(userId: string, updates: Partial<CreditAccount>): Promise<CreditAccount>;
  deleteAccount(userId: string): Promise<void>;
  
  // Balance operations
  getBalance(userId: string): Promise<number>;
  addCredits(userId: string, amount: number, description: string, metadata?: Record<string, any>): Promise<CreditTransaction>;
  spendCredits(userId: string, amount: number, description: string, metadata?: Record<string, any>): Promise<CreditTransaction>;
  refundCredits(userId: string, amount: number, description: string, referenceId?: string): Promise<CreditTransaction>;
  
  // Usage tracking
  trackUsage(userId: string, usage: Omit<CreditUsage, 'id' | 'createdAt'>): Promise<CreditUsage>;
  getUsageHistory(userId: string, limit?: number, offset?: number): Promise<CreditUsage[]>;
  getUsageStats(userId: string, period?: 'day' | 'week' | 'month' | 'year'): Promise<any>;
  
  // Transaction history
  getTransactionHistory(userId: string, limit?: number, offset?: number): Promise<CreditTransaction[]>;
  getTransactionsByType(userId: string, type: CreditTransaction['type']): Promise<CreditTransaction[]>;
  
  // Validation
  hasSufficientCredits(userId: string, amount: number): Promise<boolean>;
  validateAndSpend(userId: string, amount: number, description: string, metadata?: Record<string, any>): Promise<{ success: boolean; transaction?: CreditTransaction; error?: string }>;
  
  // Package management
  getAvailablePackages(): Promise<CreditPackage[]>;
  purchasePackage(userId: string, packageId: string): Promise<{ success: boolean; transaction?: CreditTransaction; error?: string }>;
  
  // Reset and maintenance
  resetMonthlyCredits(userId: string): Promise<void>;
  resetDailyCredits(userId: string): Promise<void>;
  cleanupOldTransactions(daysToKeep?: number): Promise<void>;
  
  // Configuration
  getConfig(): CreditConfig;
}

export interface ICreditRepository {
  // Account operations
  createAccount(account: Omit<CreditAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditAccount>;
  getAccount(userId: string): Promise<CreditAccount | null>;
  updateAccount(userId: string, updates: Partial<CreditAccount>): Promise<CreditAccount>;
  deleteAccount(userId: string): Promise<void>;
  
  // Transaction operations
  createTransaction(transaction: Omit<CreditTransaction, 'id' | 'createdAt'>): Promise<CreditTransaction>;
  getTransactions(userId: string, limit?: number, offset?: number): Promise<CreditTransaction[]>;
  getTransactionsByType(userId: string, type: CreditTransaction['type']): Promise<CreditTransaction[]>;
  
  // Usage operations
  createUsage(usage: Omit<CreditUsage, 'id' | 'createdAt'>): Promise<CreditUsage>;
  getUsageHistory(userId: string, limit?: number, offset?: number): Promise<CreditUsage[]>;
  getUsageStats(userId: string, period: 'day' | 'week' | 'month' | 'year'): Promise<any>;
  
  // Package operations
  getAvailablePackages(): Promise<CreditPackage[]>;
  getPackage(packageId: string): Promise<CreditPackage | null>;
  
  // Statistics
  getAccountStats(userId: string): Promise<any>;
  getSystemStats(): Promise<any>;
}

export class CreditError extends Error {
  constructor(
    message: string,
    public code: string,
    public userId?: string,
    public amount?: number
  ) {
    super(message);
    this.name = 'CreditError';
  }
}

export class InsufficientCreditsError extends CreditError {
  constructor(userId: string, requested: number, available: number) {
    super(
      `Insufficient credits. Requested: ${requested}, Available: ${available}`,
      'INSUFFICIENT_CREDITS',
      userId,
      requested
    );
    this.name = 'InsufficientCreditsError';
  }
}

export class AccountNotFoundError extends CreditError {
  constructor(userId: string) {
    super(
      `Credit account not found for user: ${userId}`,
      'ACCOUNT_NOT_FOUND',
      userId
    );
    this.name = 'AccountNotFoundError';
  }
}

export class InvalidTransactionError extends CreditError {
  constructor(message: string, userId?: string) {
    super(
      `Invalid transaction: ${message}`,
      'INVALID_TRANSACTION',
      userId
    );
    this.name = 'InvalidTransactionError';
  }
}
