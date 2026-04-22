import { DatabaseConnection } from '../database/DatabaseConnection';

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  userAgent?: string;
  ipAddress?: string;
  lastActivityAt?: Date;
}

export interface CreateSessionData {
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface UpdateSessionData {
  expiresAt?: Date;
  isActive?: boolean;
  lastActivityAt?: Date;
  userAgent?: string;
  ipAddress?: string;
}

export class SessionRepository {
  constructor(private db: DatabaseConnection) {}

  async create(sessionData: CreateSessionData): Promise<Session> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const query = `
      INSERT INTO sessions (
        id, user_id, token, refresh_token, expires_at, 
        created_at, updated_at, is_active, user_agent, ip_address, last_activity_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      id,
      sessionData.userId,
      sessionData.token,
      sessionData.refreshToken,
      sessionData.expiresAt,
      now,
      now,
      true,
      sessionData.userAgent || null,
      sessionData.ipAddress || null,
      now
    ]);
    
    return this.mapToSession(result);
  }

  async findById(id: string): Promise<Session | null> {
    const query = 'SELECT * FROM sessions WHERE id = $1';
    const result = await this.db.queryOne(query, [id]);
    return result ? this.mapToSession(result) : null;
  }

  async findByToken(token: string): Promise<Session | null> {
    const query = 'SELECT * FROM sessions WHERE token = $1 AND is_active = true';
    const result = await this.db.queryOne(query, [token]);
    return result ? this.mapToSession(result) : null;
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const query = 'SELECT * FROM sessions WHERE refresh_token = $1 AND is_active = true';
    const result = await this.db.queryOne(query, [refreshToken]);
    return result ? this.mapToSession(result) : null;
  }

  async findByUserId(userId: string, activeOnly: boolean = true): Promise<Session[]> {
    const query = activeOnly 
      ? 'SELECT * FROM sessions WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC'
      : 'SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC';
    const results = await this.db.query(query, [userId]);
    return results.map(this.mapToSession);
  }

  async update(id: string, sessionData: UpdateSessionData): Promise<Session | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (sessionData.expiresAt !== undefined) {
      fields.push(`expires_at = $${paramIndex++}`);
      values.push(sessionData.expiresAt);
    }
    if (sessionData.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(sessionData.isActive);
    }
    if (sessionData.lastActivityAt !== undefined) {
      fields.push(`last_activity_at = $${paramIndex++}`);
      values.push(sessionData.lastActivityAt);
    }
    if (sessionData.userAgent !== undefined) {
      fields.push(`user_agent = $${paramIndex++}`);
      values.push(sessionData.userAgent);
    }
    if (sessionData.ipAddress !== undefined) {
      fields.push(`ip_address = $${paramIndex++}`);
      values.push(sessionData.ipAddress);
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    const query = `
      UPDATE sessions 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    const result = await this.db.queryOne(query, values);
    return result ? this.mapToSession(result) : null;
  }

  async updateLastActivity(id: string): Promise<boolean> {
    const query = `
      UPDATE sessions 
      SET last_activity_at = $1, updated_at = $2
      WHERE id = $3
    `;
    
    const result = await this.db.query(query, [new Date(), new Date(), id]);
    return result.length > 0;
  }

  async deactivate(id: string): Promise<boolean> {
    const query = `
      UPDATE sessions 
      SET is_active = false, updated_at = $1
      WHERE id = $2
    `;
    
    const result = await this.db.query(query, [new Date(), id]);
    return result.length > 0;
  }

  async deactivateByUserId(userId: string): Promise<boolean> {
    const query = `
      UPDATE sessions 
      SET is_active = false, updated_at = $1
      WHERE user_id = $2
    `;
    
    const result = await this.db.query(query, [new Date(), userId]);
    return result.length > 0;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM sessions WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.length > 0;
  }

  async deleteExpired(): Promise<boolean> {
    const query = 'DELETE FROM sessions WHERE expires_at < NOW()';
    const result = await this.db.query(query);
    return result.length > 0;
  }

  async countActiveByUserId(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND is_active = true';
    const result = await this.db.queryOne(query, [userId]);
    return parseInt(result.count);
  }

  async list(limit: number = 50, offset: number = 0): Promise<Session[]> {
    const query = `
      SELECT * FROM sessions 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const results = await this.db.query(query, [limit, offset]);
    return results.map(this.mapToSession);
  }

  private mapToSession(data: any): Session {
    return {
      id: data.id,
      userId: data.user_id,
      token: data.token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isActive: data.is_active,
      userAgent: data.user_agent,
      ipAddress: data.ip_address,
      lastActivityAt: data.last_activity_at
    };
  }
}
