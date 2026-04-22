import { DatabaseConnection } from '../database/DatabaseConnection';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  role?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name?: string;
  role?: string;
  emailVerificationToken?: string;
}

export interface UpdateUserData {
  name?: string;
  role?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  lastLoginAt?: Date;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

export class UserRepository {
  constructor(private db: DatabaseConnection) {}

  async create(userData: CreateUserData): Promise<User> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const query = `
      INSERT INTO users (
        id, email, password_hash, name, role, is_active, 
        created_at, updated_at, email_verified, email_verification_token
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await this.db.queryOne(query, [
      id,
      userData.email,
      userData.passwordHash,
      userData.name || null,
      userData.role || 'user',
      true,
      now,
      now,
      false,
      userData.emailVerificationToken || null
    ]);
    
    return this.mapToUser(result);
  }

  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.db.queryOne(query, [id]);
    return result ? this.mapToUser(result) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.db.queryOne(query, [email]);
    return result ? this.mapToUser(result) : null;
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email_verification_token = $1';
    const result = await this.db.queryOne(query, [token]);
    return result ? this.mapToUser(result) : null;
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE password_reset_token = $1 
      AND password_reset_expires > NOW()
    `;
    const result = await this.db.queryOne(query, [token]);
    return result ? this.mapToUser(result) : null;
  }

  async update(id: string, userData: UpdateUserData): Promise<User | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (userData.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(userData.name);
    }
    if (userData.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(userData.role);
    }
    if (userData.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(userData.isActive);
    }
    if (userData.emailVerified !== undefined) {
      fields.push(`email_verified = $${paramIndex++}`);
      values.push(userData.emailVerified);
    }
    if (userData.lastLoginAt !== undefined) {
      fields.push(`last_login_at = $${paramIndex++}`);
      values.push(userData.lastLoginAt);
    }
    if (userData.emailVerificationToken !== undefined) {
      fields.push(`email_verification_token = $${paramIndex++}`);
      values.push(userData.emailVerificationToken);
    }
    if (userData.passwordResetToken !== undefined) {
      fields.push(`password_reset_token = $${paramIndex++}`);
      values.push(userData.passwordResetToken);
    }
    if (userData.passwordResetExpires !== undefined) {
      fields.push(`password_reset_expires = $${paramIndex++}`);
      values.push(userData.passwordResetExpires);
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    const result = await this.db.queryOne(query, values);
    return result ? this.mapToUser(result) : null;
  }

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = $2
      WHERE id = $3
    `;
    
    const result = await this.db.query(query, [passwordHash, new Date(), id]);
    return result.length > 0;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.length > 0;
  }

  async list(limit: number = 50, offset: number = 0): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const results = await this.db.query(query, [limit, offset]);
    return results.map(this.mapToUser);
  }

  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM users';
    const result = await this.db.queryOne(query);
    return parseInt(result.count);
  }

  private mapToUser(data: any): User {
    return {
      id: data.id,
      email: data.email,
      passwordHash: data.password_hash,
      name: data.name,
      role: data.role,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastLoginAt: data.last_login_at,
      emailVerified: data.email_verified,
      emailVerificationToken: data.email_verification_token,
      passwordResetToken: data.password_reset_token,
      passwordResetExpires: data.password_reset_expires
    };
  }
}
