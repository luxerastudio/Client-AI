import { DatabaseConnection } from '../database/DatabaseConnection';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiKeyData {
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt?: Date;
}

export interface UpdateApiKeyData {
  name?: string;
  permissions?: string[];
  isActive?: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
}

export class ApiKeyRepository {
  constructor(private db: DatabaseConnection) {}

  async create(apiKeyData: CreateApiKeyData): Promise<ApiKey> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const query = `
      INSERT INTO api_keys (
        id, user_id, name, key_hash, key_prefix, permissions,
        is_active, expires_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      id,
      apiKeyData.userId,
      apiKeyData.name,
      apiKeyData.keyHash,
      apiKeyData.keyPrefix,
      JSON.stringify(apiKeyData.permissions),
      true,
      apiKeyData.expiresAt || null,
      now,
      now
    ]);
    
    return this.mapToApiKey(result);
  }

  async findById(id: string): Promise<ApiKey | null> {
    const query = 'SELECT * FROM api_keys WHERE id = $1';
    const result = await this.db.queryOne(query, [id]);
    return result ? this.mapToApiKey(result) : null;
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    const query = 'SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = true';
    const result = await this.db.queryOne(query, [keyHash]);
    return result ? this.mapToApiKey(result) : null;
  }

  async findByUserId(userId: string, activeOnly: boolean = true): Promise<ApiKey[]> {
    const query = activeOnly 
      ? 'SELECT * FROM api_keys WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC'
      : 'SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC';
    const results = await this.db.query(query, [userId]);
    return results.map(this.mapToApiKey);
  }

  async update(id: string, apiKeyData: UpdateApiKeyData): Promise<ApiKey | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (apiKeyData.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(apiKeyData.name);
    }
    if (apiKeyData.permissions !== undefined) {
      fields.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(apiKeyData.permissions));
    }
    if (apiKeyData.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(apiKeyData.isActive);
    }
    if (apiKeyData.expiresAt !== undefined) {
      fields.push(`expires_at = $${paramIndex++}`);
      values.push(apiKeyData.expiresAt);
    }
    if (apiKeyData.lastUsedAt !== undefined) {
      fields.push(`last_used_at = $${paramIndex++}`);
      values.push(apiKeyData.lastUsedAt);
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    const query = `
      UPDATE api_keys 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    const result = await this.db.queryOne(query, values);
    return result ? this.mapToApiKey(result) : null;
  }

  async updateLastUsed(id: string): Promise<boolean> {
    const query = `
      UPDATE api_keys 
      SET last_used_at = $1, updated_at = $2
      WHERE id = $3
    `;
    
    const result = await this.db.query(query, [new Date(), new Date(), id]);
    return result.length > 0;
  }

  async deactivate(id: string): Promise<boolean> {
    const query = `
      UPDATE api_keys 
      SET is_active = false, updated_at = $1
      WHERE id = $2
    `;
    
    const result = await this.db.query(query, [new Date(), id]);
    return result.length > 0;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM api_keys WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.length > 0;
  }

  async deleteExpired(): Promise<boolean> {
    const query = 'DELETE FROM api_keys WHERE expires_at < NOW()';
    const result = await this.db.query(query);
    return result.length > 0;
  }

  async countActiveByUserId(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM api_keys WHERE user_id = $1 AND is_active = true';
    const result = await this.db.queryOne(query, [userId]);
    return parseInt(result.count);
  }

  async list(limit: number = 50, offset: number = 0): Promise<ApiKey[]> {
    const query = `
      SELECT * FROM api_keys 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const results = await this.db.query(query, [limit, offset]);
    return results.map(this.mapToApiKey);
  }

  async hasPermission(keyHash: string, permission: string): Promise<boolean> {
    const query = `
      SELECT permissions FROM api_keys 
      WHERE key_hash = $1 AND is_active = true
    `;
    const result = await this.db.queryOne(query, [keyHash]);
    
    if (!result) return false;
    
    const permissions = result.permissions;
    return Array.isArray(permissions) && permissions.includes(permission);
  }

  private mapToApiKey(data: any): ApiKey {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      keyHash: data.key_hash,
      keyPrefix: data.key_prefix,
      permissions: Array.isArray(data.permissions) ? data.permissions : JSON.parse(data.permissions || '[]'),
      isActive: data.is_active,
      expiresAt: data.expires_at,
      lastUsedAt: data.last_used_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
