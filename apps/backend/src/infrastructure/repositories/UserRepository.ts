import { BaseRepository } from '../shared/repositories/BaseRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';

export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor(db: any) {
    super(db);
  }

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return this.executeInsert(user, 'users');
  }

  async findById(id: string): Promise<User | null> {
    return this.executeQuery('SELECT', 'SELECT * FROM users WHERE id = $1', [id]) as Promise<User | null>;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.executeQuery('SELECT', 'SELECT * FROM users WHERE email = $1', [email]) as Promise<User | null>;
  }

  async findByApiKey(apiKey: string): Promise<User | null> {
    return this.executeQuery('SELECT', 'SELECT * FROM users WHERE api_key = $1', [apiKey]) as Promise<User | null>;
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    return this.executeUpdate(id, user, 'users') as Promise<User>;
  }

  async delete(id: string): Promise<void> {
    return this.executeDelete(id, 'users');
  }
}
