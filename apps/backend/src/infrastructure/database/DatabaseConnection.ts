import { Pool, PoolClient } from 'pg';

export interface DatabaseConfig {
  url?: string;
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

export class DatabaseConnection {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private isConfigured: boolean;
  private connectionError: Error | null = null;
  private isMockMode: boolean = false; // DISABLED - Force real connection
  private retryCount: number = 0;
  private readonly maxRetries: number = 3;
  private readonly connectionTimeout: number = 5000; // 5 seconds

  constructor(dbConfig?: Partial<DatabaseConfig>) {
    this.config = dbConfig || {};
    this.isConfigured = this.validateConfiguration();
    
    if (!this.isConfigured) {
      console.log('🔧 DATABASE NOT CONFIGURED - REQUIRE REAL CONNECTION');
      // this.isMockMode = true; // DISABLED - Force real connection
    }
  }

  private validateConfiguration(): boolean {
    // DATABASE_URL is the ONLY source of truth - NO FALLBACKS
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl || databaseUrl.trim() === '') {
      console.log('⚠️ DATABASE_URL not found or empty - Database not configured');
      return false;
    }
    
    // Railway safety check - prevent localhost connections
    if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') || databaseUrl.includes('::1')) {
      console.error('❌ DATABASE_URL contains localhost address - this is not allowed in production');
      return false;
    }
    
    console.log('✅ DATABASE_URL configured - USING RAILWAY EXTERNAL DATABASE_URL');
    return true;
  }

  async connect(): Promise<void> {
    // Safe initialization - never crash the app
    try {
      if (this.isMockMode) {
        console.log('🔧 DATABASE NOT AVAILABLE - REQUIRING REAL CONNECTION');
        // DISABLED: return; // Force real connection
      }

      if (!this.isConfigured) {
        console.log('❌ DATABASE NOT CONFIGURED - REQUIRING REAL CONNECTION');
        // this.isMockMode = true; // DISABLED - Force real connection
        // return; // DISABLED - Force real connection
      }

      // Retry logic with timeout protection
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`🔄 Database connection attempt ${attempt}/${this.maxRetries}`);
          
          const poolConfig = {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: this.config.maxConnections || 10,
            connectionTimeoutMillis: this.connectionTimeout,
            idleTimeoutMillis: this.config.idleTimeout || 30000,
            statement_timeout: this.connectionTimeout,
            query_timeout: this.connectionTimeout
          };

          this.pool = new Pool(poolConfig);

          // Test connection with timeout
          const connectPromise = this.pool.connect();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database connection timeout')), this.connectionTimeout)
          );
          
          const client = await Promise.race([connectPromise, timeoutPromise]) as PoolClient;
          await client.query('SELECT 1');
          client.release();

          console.log('✅ DATABASE CONNECTED - USING RAILWAY EXTERNAL DATABASE');
          this.connectionError = null;
          this.retryCount = 0;
          return;
          
        } catch (error) {
          this.connectionError = error as Error;
          this.retryCount = attempt;
          
          console.error(`❌ Database connection attempt ${attempt} failed:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            code: (error as any)?.code || 'UNKNOWN',
            attempt,
            maxRetries: this.maxRetries
          });
          
          if (attempt === this.maxRetries) {
            console.log('🔧 DATABASE NOT CONNECTED - RUNNING IN DEGRADED MODE');
            this.isMockMode = true;
            if (this.pool) {
              try {
                await this.pool.end();
              } catch (cleanupError) {
                console.error('Error cleaning up failed pool:', cleanupError);
              }
              this.pool = null;
            }
          } else {
            // Wait before retry (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    } catch (unexpectedError) {
      // Catch any unexpected errors to prevent app crash
      console.error('🚨 UNEXPECTED DATABASE INITIALIZATION ERROR:', unexpectedError);
      console.log('🔧 FALLING BACK TO DEGRADED MODE TO PREVENT CRASH');
      this.isMockMode = true;
      this.connectionError = unexpectedError as Error;
      if (this.pool) {
        try {
          await this.pool.end();
        } catch (cleanupError) {
          console.error('Error cleaning up failed pool:', cleanupError);
        }
        this.pool = null;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection closed');
      this.pool = null;
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    if (this.isMockMode) {
      console.error('❌ DATABASE NOT AVAILABLE - Cannot execute query in mock mode');
      throw new Error('Database not available. Please check DATABASE_URL configuration.');
    }
    
    if (!this.pool) {
      console.error('❌ DATABASE POOL NOT AVAILABLE - Cannot execute query');
      throw new Error('Database connection not established.');
    }
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    if (this.isMockMode) {
      console.error('❌ DATABASE NOT AVAILABLE - Cannot execute query in mock mode');
      throw new Error('Database not available. Please check DATABASE_URL configuration.');
    }
    
    if (!this.pool) {
      console.error('❌ DATABASE POOL NOT AVAILABLE - Cannot execute query');
      throw new Error('Database connection not established.');
    }
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (this.isMockMode) {
      console.error('❌ DATABASE NOT AVAILABLE - Cannot execute transaction in mock mode');
      throw new Error('Database not available. Please check DATABASE_URL configuration.');
    }
    
    if (!this.pool) {
      console.error('❌ DATABASE POOL NOT AVAILABLE - Cannot execute transaction');
      throw new Error('Database connection not established.');
    }
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    if (this.isMockMode) {
      console.error('❌ DATABASE NOT AVAILABLE - Cannot provide client in mock mode');
      throw new Error('Database not available. Please check DATABASE_URL configuration.');
    }
    
    if (!this.pool) {
      console.error('❌ DATABASE POOL NOT AVAILABLE - Cannot provide client');
      throw new Error('Database connection not established.');
    }
    return this.pool.connect();
  }

  getPool(): Pool | null {
    return this.pool;
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    if (this.isMockMode) {
      return {
        healthy: false,
        details: {
          message: 'DATABASE NOT CONNECTED - RUNNING IN DEGRADED MODE',
          configured: false,
          mockMode: true,
          retryCount: this.retryCount
        }
      };
    }
    
    if (!this.isConfigured) {
      return {
        healthy: false,
        details: {
          message: 'Database not configured',
          configured: false,
          mockMode: false
        }
      };
    }
    
    if (!this.pool) {
      return {
        healthy: false,
        details: {
          message: 'Database not connected',
          configured: true,
          mockMode: false,
          error: this.connectionError?.message || 'Unknown error',
          retryCount: this.retryCount
        }
      };
    }
    
    try {
      const start = Date.now();
      await this.query('SELECT 1');
      const responseTime = Date.now() - start;

      const poolStats = this.pool.waitingCount || 0;
      
      return {
        healthy: true,
        details: {
          responseTime,
          waitingCount: poolStats,
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          configured: true,
          mockMode: false,
          retryCount: this.retryCount
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          message: 'Database health check failed',
          error: (error as Error).message,
          configured: true,
          mockMode: false,
          retryCount: this.retryCount
        }
      };
    }
  }

  // Check if database is available
  isAvailable(): boolean {
    return this.isConfigured && this.pool !== null && this.connectionError === null;
  }

  // Check if in mock mode
  isInMockMode(): boolean {
    return this.isMockMode;
  }

  // Get connection status
  getConnectionStatus(): {
    configured: boolean;
    connected: boolean;
    mockMode: boolean;
    error?: string;
    retryCount?: number;
  } {
    return {
      configured: this.isConfigured,
      connected: this.pool !== null,
      mockMode: this.isMockMode,
      error: this.connectionError?.message,
      retryCount: this.retryCount
    };
  }
}
