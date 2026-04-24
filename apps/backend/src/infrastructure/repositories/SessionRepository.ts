import { BaseRepository } from '../shared/repositories/BaseRepository';

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
  isActive?: boolean;
  lastActivityAt?: Date;
}

export interface UpdateSessionData {
  expiresAt?: Date;
  isActive?: boolean;
  lastActivityAt?: Date;
  userAgent?: string;
  ipAddress?: string;
}

export class SessionRepository extends BaseRepository<Session> {
  constructor(db: any) {
    super(db);
  }

  async create(sessionData: CreateSessionData): Promise<Session> {
    const dataWithDefaults = {
      ...sessionData,
      isActive: sessionData.isActive ?? true
    };
    return this.executeInsert(dataWithDefaults, 'sessions');
  }

  async findById(id: string): Promise<Session | null> {
    return this.executeQuery('SELECT', 'SELECT * FROM sessions WHERE id = $1', [id]) as Promise<Session | null>;
  }

  async findByToken(token: string): Promise<Session | null> {
    return this.executeQuery('SELECT', 'SELECT * FROM sessions WHERE token = $1 AND is_active = true', [token]) as Promise<Session | null>;
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    return this.executeQuery('SELECT', 'SELECT * FROM sessions WHERE refresh_token = $1 AND is_active = true', [refreshToken]) as Promise<Session | null>;
  }

  async findByUserId(userId: string, activeOnly: boolean = true): Promise<Session[]> {
    const query = activeOnly 
      ? 'SELECT * FROM sessions WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC'
      : 'SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC';
    return this.executeQueryMany('SELECT', query, [userId]) as Promise<Session[]>;
  }

  async update(id: string, sessionData: UpdateSessionData): Promise<Session | null> {
    return this.executeUpdate(id, sessionData, 'sessions') as Promise<Session | null>;
  }

  async deactivate(id: string): Promise<boolean> {
    const result = await this.executeUpdate(id, { is_active: false }, 'sessions');
    return result !== null;
  }

  async delete(id: string): Promise<void> {
    return this.executeDelete(id, 'sessions');
  }

  async countActiveByUserId(userId: string): Promise<number> {
    return this.executeCount('sessions', ' WHERE user_id = $1 AND is_active = true', [userId]);
  }

  async list(limit: number = 50, offset: number = 0): Promise<Session[]> {
    return this.executeQueryMany('SELECT', 'SELECT * FROM sessions ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]) as Promise<Session[]>;
  }
}
