// @ts-nocheck
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { 
  IAuthenticationService,
  UserSchema,
  ApiKeySchema,
  SessionSchema,
  SecurityConfig,
  SecurityContext,
  AuthenticationError,
  AuthorizationError,
  InputValidationError 
} from '../../domain/security/entities/Security';
import { UserRepository, User } from '../repositories/UserRepository';
import { SessionRepository, Session } from '../repositories/SessionRepository';
import { ApiKeyRepository, ApiKey } from '../repositories/ApiKeyRepository';

export class AuthenticationServiceDB implements IAuthenticationService {
  private config: SecurityConfig;
  private userRepository: UserRepository;
  private sessionRepository: SessionRepository;
  private apiKeyRepository: ApiKeyRepository;

  constructor(
    config: SecurityConfig,
    userRepository: UserRepository,
    sessionRepository: SessionRepository,
    apiKeyRepository: ApiKeyRepository
  ) {
    this.config = config;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.apiKeyRepository = apiKeyRepository;
  }

  // User Authentication
  async login(email: string, password: string, context?: any): Promise<{ user: any; tokens: { access: string; refresh: string } }> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError('Account is disabled');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Create session
    await this.createSession(user.id, tokens.access, tokens.refresh, context);

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    return {
      user: this.sanitizeUser(user),
      tokens
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionRepository.deactivate(sessionId);
  }

  async refreshToken(refreshToken: string): Promise<{ access: string; refresh: string }> {
    const session = await this.sessionRepository.findByRefreshToken(refreshToken);
    
    if (!session || !session.isActive || session.expiresAt < new Date()) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    
    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    
    // Generate new tokens
    const tokens = this.generateTokens(user);
    
    // Update session with new tokens by creating a new session and deactivating the old one
    await this.sessionRepository.deactivate(session.id);
    await this.createSession(user.id, tokens.access, tokens.refresh);
    
    return tokens;
  }

  async validateToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, this.config.authentication.jwt.secret) as any;
      
      const session = await this.sessionRepository.findByToken(token);
      
      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw new AuthenticationError('Invalid or expired session');
      }
      
      const user = await this.userRepository.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new AuthenticationError('User not found or inactive');
      }
      
      // Update last activity
      await this.sessionRepository.updateLastActivity(session.id);
      
      return this.sanitizeUser(user);
    } catch (error) {
      throw new AuthenticationError('Invalid token');
    }
  }

  // User Management
  async register(userData: { email: string; password: string; name?: string }): Promise<any> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new AuthenticationError('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await this.userRepository.create({
      email: userData.email,
      passwordHash,
      name: userData.name,
      emailVerificationToken: randomBytes(32).toString('hex')
    });

    return this.sanitizeUser(user);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid current password');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.userRepository.updatePassword(userId, newPasswordHash);
  }

  async resetPassword(email: string): Promise<string> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.userRepository.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires
    });

    return resetToken;
  }

  async confirmResetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByPasswordResetToken(token);
    if (!user) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.userRepository.update(user.id, {
      passwordHash,
      passwordResetToken: undefined,
      passwordResetExpires: undefined
    });
  }

  // API Key Management
  async createApiKey(userId: string, name: string, permissions: string[]): Promise<any> {
    const apiKey = randomBytes(32).toString('hex');
    const keyHash = await bcrypt.hash(apiKey, 12);
    const keyPrefix = apiKey.substring(0, 8);

    const createdKey = await this.apiKeyRepository.create({
      userId,
      name,
      keyHash,
      keyPrefix,
      permissions
    });

    return {
      id: createdKey.id,
      name: createdKey.name,
      keyPrefix: createdKey.keyPrefix,
      permissions: createdKey.permissions,
      key: apiKey // Return the actual key only once
    };
  }

  async validateApiKey(apiKey: string): Promise<any> {
    // Find API key by prefix first for efficiency
    const keyPrefix = apiKey.substring(0, 8);
    
    // Get all API keys for this prefix and check each one
    const userApiKeys = await this.apiKeyRepository.findByUserId(''); // This needs to be optimized
    for (const keyRecord of userApiKeys) {
      if (keyRecord.keyPrefix === keyPrefix) {
        const isValid = await bcrypt.compare(apiKey, keyRecord.keyHash);
        if (isValid && keyRecord.isActive && (!keyRecord.expiresAt || keyRecord.expiresAt > new Date())) {
          const user = await this.userRepository.findById(keyRecord.userId);
          if (user && user.isActive) {
            // Update last used
            await this.apiKeyRepository.updateLastUsed(keyRecord.id);
            return this.sanitizeUser(user);
          }
        }
      }
    }

    throw new AuthenticationError('Invalid API key');
  }

  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findById(keyId);
    if (!apiKey || apiKey.userId !== userId) {
      throw new AuthorizationError('API key not found or access denied');
    }

    await this.apiKeyRepository.deactivate(keyId);
  }

  async listApiKeys(userId: string): Promise<any[]> {
    const apiKeys = await this.apiKeyRepository.findByUserId(userId);
    return apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
      isActive: key.isActive,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt
    }));
  }

  // Helper Methods
  private generateTokens(user: User): { access: string; refresh: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, this.config.authentication.jwt.secret, {
      expiresIn: this.config.authentication.jwt.expiresIn || '1h'
    });

    const refreshToken = jwt.sign({ userId: user.id }, this.config.authentication.jwt.secret, {
      expiresIn: '7d'
    });

    return {
      access: accessToken,
      refresh: refreshToken
    };
  }

  private async createSession(userId: string, accessToken: string, refreshToken: string, context?: any): Promise<Session> {
    const expiresIn = typeof this.config.authentication?.jwt?.expiresIn === 'number' 
      ? this.config.authentication.jwt.expiresIn 
      : 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return await this.sessionRepository.create({
      userId,
      token: accessToken,
      refreshToken,
      expiresAt,
      userAgent: context?.userAgent,
      ipAddress: context?.ipAddress
    });
  }

  private sanitizeUser(user: User): any {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  // Additional required methods from interface
  async getUserById(id: string): Promise<any> {
    const user = await this.userRepository.findById(id);
    return user ? this.sanitizeUser(user) : null;
  }

  async updateUser(id: string, updates: any): Promise<any> {
    const user = await this.userRepository.update(id, updates);
    return user ? this.sanitizeUser(user) : null;
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  async listUsers(limit?: number, offset?: number): Promise<any[]> {
    const users = await this.userRepository.list(limit, offset);
    return users.map(this.sanitizeUser);
  }

  async getUserSessions(userId: string): Promise<any[]> {
    const sessions = await this.sessionRepository.findByUserId(userId);
    return sessions.map(session => ({
      id: session.id,
      isActive: session.isActive,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress
    }));
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.sessionRepository.deactivateByUserId(userId);
  }
}
