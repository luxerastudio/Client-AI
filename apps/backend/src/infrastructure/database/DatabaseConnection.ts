import { Pool, PoolClient } from 'pg';
import { config } from '../../config';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

export class DatabaseConnection {
  private pool!: Pool;
  private config: DatabaseConfig;

  constructor(dbConfig?: Partial<DatabaseConfig>) {
    this.config = {
      host: dbConfig?.host || config.database.host,
      port: dbConfig?.port || config.database.port,
      database: dbConfig?.database || config.database.database,
      username: dbConfig?.username || config.database.username,
      password: dbConfig?.password || config.database.password,
      ssl: dbConfig?.ssl ?? config.database.ssl,
      maxConnections: dbConfig?.maxConnections || config.database.maxConnections,
      connectionTimeout: dbConfig?.connectionTimeout || config.database.connectionTimeout,
      idleTimeout: dbConfig?.idleTimeout || config.database.idleTimeout
    };
  }

  async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        max: this.config.maxConnections,
        connectionTimeoutMillis: this.config.connectionTimeout,
        idleTimeoutMillis: this.config.idleTimeout,
        // Enable prepared statements
        // prepare: true, // Removed as it doesn't exist in PoolConfig
        // Statement timeout
        statement_timeout: 30000,
        // Query timeout
        query_timeout: 30000
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      console.log('Database connection established successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection closed');
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
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
    return this.pool.connect();
  }

  getPool(): Pool {
    return this.pool;
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
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
          activeCount: this.pool.totalCount - this.pool.idleCount
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Migration utilities
  async runMigrations(): Promise<void> {
    const migrationQuery = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.query(migrationQuery);
    console.log('Migrations table initialized');
  }

  async createTables(): Promise<void> {
    // Create core tables
    const tables = [
      // Users table
      `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          roles TEXT[] DEFAULT ARRAY['user'],
          permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
          is_active BOOLEAN DEFAULT true,
          is_email_verified BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP
        );
      `,
      // API Keys table
      `
        CREATE TABLE IF NOT EXISTS api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          key_hash VARCHAR(255) NOT NULL UNIQUE,
          permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
          is_active BOOLEAN DEFAULT true,
          expires_at TIMESTAMP,
          usage_count INTEGER DEFAULT 0,
          last_used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      // Sessions table
      `
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL,
          refresh_token_hash VARCHAR(255) NOT NULL,
          ip_address INET,
          user_agent TEXT,
          expires_at TIMESTAMP NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_access_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      // Workflows table
      `
        CREATE TABLE IF NOT EXISTS workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          definition JSONB NOT NULL,
          status VARCHAR(50) DEFAULT 'draft',
          version INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_run_at TIMESTAMP,
          next_run_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true
        );
      `,
      // Workflow executions table
      `
        CREATE TABLE IF NOT EXISTS workflow_executions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          status VARCHAR(50) DEFAULT 'pending',
          input JSONB,
          output JSONB,
          error_message TEXT,
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP,
          duration_ms INTEGER,
          steps_completed INTEGER DEFAULT 0,
          total_steps INTEGER DEFAULT 0,
          metadata JSONB
        );
      `,
      // User memory table
      `
        CREATE TABLE IF NOT EXISTS user_memory (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(100) NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          metadata JSONB
        );
      `,
      // Scoring records table
      `
        CREATE TABLE IF NOT EXISTS scoring_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_type VARCHAR(100) NOT NULL,
          entity_id UUID NOT NULL,
          score DECIMAL(5,4) NOT NULL,
          algorithm VARCHAR(100) NOT NULL,
          weights JSONB,
          factors JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB,
          UNIQUE(entity_type, entity_id, algorithm)
        );
      `
    ];

    for (const tableQuery of tables) {
      await this.query(tableQuery);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);',
      'CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);',
      'CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON user_memory(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_user_memory_type ON user_memory(type);',
      'CREATE INDEX IF NOT EXISTS idx_scoring_records_entity ON scoring_records(entity_type, entity_id);'
    ];

    for (const indexQuery of indexes) {
      await this.query(indexQuery);
    }

    console.log('Database tables created successfully');
  }

  // Utility methods
  async escapeLiteral(value: string): Promise<string> {
    const client = await this.getClient();
    try {
      return client.escapeLiteral(value);
    } finally {
      client.release();
    }
  }

  async escapeIdentifier(identifier: string): Promise<string> {
    const client = await this.getClient();
    try {
      return client.escapeIdentifier(identifier);
    } finally {
      client.release();
    }
  }
}
