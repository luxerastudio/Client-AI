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

export class AuthenticationService implements IAuthenticationService {
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
    const session = await this.createSession(user.id, tokens.access, tokens.refresh, context);

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
    
    // Update session
    const expiresIn = typeof this.config.authentication?.jwt?.expiresIn === 'number' 
      ? this.config.authentication.jwt.expiresIn 
      : 3600;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);
    await this.sessionRepository.update(session.id, {
      expiresAt: newExpiresAt
    });
    
    return tokens;
  }

  async validateToken(token: string): Promise<any | null> {
    try {
      const decoded = jwt.verify(token, this.config.authentication.jwt.secret) as any;
      
      // Get user
      const user = this.users.get(decoded.userId);
      if (!user || !user.isActive) {
        return null;
      }

      return this.sanitizeUser(user);
    } catch (error) {
      return null;
    }
  }

  // API Key Management
  async createApiKey(userId: string, name: string, permissions: string[], expiresAt?: Date): Promise<any> {
    const user = this.users.get(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Generate API key
    const apiKey = this.generateApiKeyString();

    // Hash API key for storage
    const keyHash = await bcrypt.hash(apiKey, 12);

    const apiKeyData = {
      id: uuidv4(),
      userId,
      name,
      keyHash,
      permissions,
      isActive: true,
      createdAt: new Date(),
      usageCount: 0,
      ...(expiresAt && { expiresAt }),
      ...(this.config.rateLimiting.enabled && {
        rateLimit: {
          windowMs: this.config.rateLimiting.windowMs,
          maxRequests: this.config.rateLimiting.maxRequests * 2 // Higher limit for API keys
        }
      })
    };

    this.apiKeys.set(apiKeyData.id, apiKeyData);

    // Return the actual API key (only shown once)
    return {
      ...apiKeyData,
      key: apiKey
    };
  }

  async revokeApiKey(apiKeyId: string): Promise<void> {
    const apiKey = this.apiKeys.get(apiKeyId);
    if (apiKey) {
      apiKey.isActive = false;
      this.apiKeys.set(apiKeyId, apiKey);
    }
  }

  async validateApiKey(apiKey: string): Promise<any | null> {
    try {
      // Find API key by checking hash
      for (const [id, storedApiKey] of this.apiKeys.entries()) {
        if (storedApiKey.isActive && await bcrypt.compare(apiKey, storedApiKey.keyHash)) {
          // Check expiration
          if (storedApiKey.expiresAt && storedApiKey.expiresAt < new Date()) {
            return null;
          }

          // Update usage count and last used
          storedApiKey.usageCount++;
          storedApiKey.lastUsedAt = new Date();
          this.apiKeys.set(id, storedApiKey);

          return {
            id: storedApiKey.id,
            userId: storedApiKey.userId,
            permissions: storedApiKey.permissions,
            name: storedApiKey.name
          };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Session Management
  async getUserSessions(userId: string): Promise<any[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId && session.isActive);
  }

  async revokeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.set(sessionId, session);
    }
  }

  // Security Context Creation
  async createSecurityContext(request: any): Promise<SecurityContext> {
    let user = null;
    let apiKey = null;
    let session = null;
    const permissions: string[] = [];
    const roles: string[] = [];

    // Try JWT authentication first
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      user = await this.validateToken(token);
      
      if (user) {
        session = this.findSessionByToken(token);
        permissions.push(...user.permissions);
        roles.push(...user.roles);
      }
    }

    // Try API key authentication
    if (!user) {
      const apiKeyHeader = request.headers[this.config.authentication.apiKeys.headerName.toLowerCase()];
      if (apiKeyHeader) {
        apiKey = await this.validateApiKey(apiKeyHeader);
        if (apiKey) {
          permissions.push(...apiKey.permissions);
          // Get user for API key
          user = this.users.get(apiKey.userId);
          if (user) {
            roles.push(...user.roles);
          }
        }
      }
    }

    const isAuthenticated = !!(user || apiKey);
    const isAuthorized = isAuthenticated && permissions.length > 0;

    return {
      user,
      apiKey,
      session,
      permissions,
      roles,
      ipAddress: request.ip || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      requestId: request.id || request.requestId,
      timestamp: new Date(),
      isAuthenticated,
      isAuthorized
    };
  }

  // User Management (for demo purposes - use proper user service in production)
  async createUser(userData: {
    email: string;
    username: string;
    password: string;
    roles?: string[];
    permissions?: string[];
  }): Promise<any> {
    // Check if user already exists
    const existingUser = this.findUserByEmail(userData.email);
    if (existingUser) {
      throw new InputValidationError('User with this email already exists');
    }

    const existingUsername = this.findUserByUsername(userData.username);
    if (existingUsername) {
      throw new InputValidationError('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    const user = {
      id: uuidv4(),
      email: userData.email,
      username: userData.username,
      passwordHash,
      roles: userData.roles || ['user'],
      permissions: userData.permissions || [],
      isActive: true,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(user.id, user);
    return this.sanitizeUser(user);
  }

  async updateUser(userId: string, updates: {
    email?: string;
    username?: string;
    password?: string;
    roles?: string[];
    permissions?: string[];
    isActive?: boolean;
  }): Promise<any> {
    const user = this.users.get(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Update fields
    if (updates.email) {
      const existingUser = this.findUserByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new InputValidationError('Email already in use');
      }
      user.email = updates.email;
    }

    if (updates.username) {
      const existingUsername = this.findUserByUsername(updates.username);
      if (existingUsername && existingUsername.id !== userId) {
        throw new InputValidationError('Username already taken');
      }
      user.username = updates.username;
    }

    if (updates.password) {
      user.passwordHash = await bcrypt.hash(updates.password, 12);
    }

    if (updates.roles) {
      user.roles = updates.roles;
    }

    if (updates.permissions) {
      user.permissions = updates.permissions;
    }

    if (updates.isActive !== undefined) {
      user.isActive = updates.isActive;
    }

    user.updatedAt = new Date();
    this.users.set(userId, user);

    return this.sanitizeUser(user);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Delete user
    this.users.delete(userId);

    // Revoke all API keys
    for (const [id, apiKey] of this.apiKeys.entries()) {
      if (apiKey.userId === userId) {
        this.apiKeys.delete(id);
      }
    }

    // Revoke all sessions
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(id);
      }
    }
  }

  // Helper methods

  private generateTokens(user: any): { access: string; refresh: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions
    };

    const accessToken = jwt.sign(payload, this.config.authentication.jwt.secret, {
      expiresIn: this.config.authentication.jwt.expiresIn,
      algorithm: this.config.authentication.jwt.algorithm
    });

    const refreshToken = jwt.sign({ userId: user.id }, this.config.authentication.jwt.secret, {
      expiresIn: this.config.authentication.jwt.refreshExpiresIn,
      algorithm: this.config.authentication.jwt.algorithm
    });

    return { access: accessToken, refresh: refreshToken };
  }

  private generateApiKeyString(): string {
    const prefix = 'ak_';
    const bytes = Array.from(randomBytes(32))
      .map(b => (b as number).toString(16).padStart(2, '0'))
      .join('');
    return prefix + bytes;
  }

  private async createSession(userId: string, accessToken: string, refreshToken: string, context?: any): Promise<void> {
    const session = {
      id: uuidv4(),
      userId,
      token: accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + this.parseTimeToMs(this.config.authentication.jwt.refreshExpiresIn)),
      isActive: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      createdAt: new Date(),
      lastAccessAt: new Date()
    };

    this.sessions.set(session.id, session);
  }

  private parseTimeToMs(timeString: string): number {
    const units: Record<string, number> = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000; // Default to 7 days
    }

    const [, amount, unit] = match;
    return parseInt(amount) * (units[unit] || 1);
  }

  private findUserByEmail(email: string): any {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  private findUserByUsername(username: string): any {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  private findSessionByToken(token: string): any {
    for (const session of this.sessions.values()) {
      if (session.token === token && session.isActive) {
        return session;
      }
    }
    return null;
  }

  private findSessionByRefreshToken(refreshToken: string): any {
    for (const session of this.sessions.values()) {
      if (session.refreshToken === refreshToken && session.isActive) {
        return session;
      }
    }
    return null;
  }

  private sanitizeUser(user: any): any {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  // Authorization helper methods
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || !user.isActive) {
      return false;
    }

    return user.permissions.includes(permission);
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || !user.isActive) {
      return false;
    }

    return user.roles.includes(role);
  }

  async canAccessResource(userId: string, resource: string, action: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || !user.isActive) {
      return false;
    }

    // Check specific permission
    const requiredPermission = `${resource}:${action}`;
    if (user.permissions.includes(requiredPermission)) {
      return true;
    }

    // Check wildcard permissions
    if (user.permissions.includes(`${resource}:*`)) {
      return true;
    }

    if (user.permissions.includes(`*:${action}`)) {
      return true;
    }

    if (user.permissions.includes('*:*')) {
      return true;
    }

    // Check admin role
    if (user.roles.includes('admin')) {
      return true;
    }

    return false;
  }

  // Cleanup expired sessions and API keys
  async cleanup(): Promise<void> {
    const now = new Date();

    // Clean expired sessions
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now || !session.isActive) {
        this.sessions.delete(id);
      }
    }

    // Clean expired API keys
    for (const [id, apiKey] of this.apiKeys.entries()) {
      if (apiKey.expiresAt && apiKey.expiresAt < now) {
        this.apiKeys.delete(id);
      }
    }
  }

  // Statistics
  getStats(): {
    totalUsers: number;
    activeUsers: number;
    totalApiKeys: number;
    activeApiKeys: number;
    totalSessions: number;
    activeSessions: number;
  } {
    const now = new Date();
    
    const activeUsers = Array.from(this.users.values())
      .filter(user => user.isActive).length;

    const activeApiKeys = Array.from(this.apiKeys.values())
      .filter(apiKey => apiKey.isActive && (!apiKey.expiresAt || apiKey.expiresAt > now)).length;

    const activeSessions = Array.from(this.sessions.values())
      .filter(session => session.isActive && session.expiresAt > now).length;

    return {
      totalUsers: this.users.size,
      activeUsers,
      totalApiKeys: this.apiKeys.size,
      activeApiKeys,
      totalSessions: this.sessions.size,
      activeSessions
    };
  }

  // Additional convenience methods for security routes
  async generateToken(userId: string, payload?: any, expiresIn?: string): Promise<string> {
    const user = this.users.get(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const tokenPayload = {
      sub: userId,
      email: user.email,
      ...payload
    };

    const options: jwt.SignOptions = {
      expiresIn: expiresIn || this.config.authentication.jwt.expiresIn
    };

    return jwt.sign(tokenPayload, this.config.authentication.jwt.secret, options);
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.config.authentication.jwt.secret);
    } catch (error) {
      throw new AuthenticationError('Invalid token');
    }
  }

  async generateApiKey(userId: string, name: string, permissions?: string[], expiresAt?: Date): Promise<string> {
    const apiKey = await this.createApiKey(userId, name, permissions || [], expiresAt);
    return apiKey.key;
  }
}

// Middleware factory functions
export function createAuthMiddleware(authService: AuthenticationService) {
  return async (request: any, reply: any) => {
    try {
      const securityContext = await authService.createSecurityContext(request);
      
      // Add security context to request
      request.securityContext = securityContext;
      request.user = securityContext.user;
      request.apiKey = securityContext.apiKey;

      // Add user info to response headers (optional)
      if (securityContext.isAuthenticated) {
        reply.header('X-Authenticated', 'true');
        if (securityContext.user) {
          reply.header('X-User-ID', securityContext.user.id);
        }
      }

    } catch (error) {
      throw new AuthenticationError('Authentication failed');
    }
  };
}

export function createRequireAuthMiddleware(authService: AuthenticationService) {
  return async (request: any, reply: any) => {
    if (!request.securityContext?.isAuthenticated) {
      throw new AuthenticationError('Authentication required');
    }
  };
}

export function createRequirePermissionMiddleware(authService: AuthenticationService, permission: string) {
  return async (request: any, reply: any) => {
    if (!request.securityContext?.isAuthenticated) {
      throw new AuthenticationError('Authentication required');
    }

    if (!request.securityContext.permissions.includes(permission)) {
      throw new AuthorizationError(`Permission '${permission}' required`);
    }
  };
}

export function createRequireRoleMiddleware(authService: AuthenticationService, role: string) {
  return async (request: any, reply: any) => {
    if (!request.securityContext?.isAuthenticated) {
      throw new AuthenticationError('Authentication required');
    }

    if (!request.securityContext.roles.includes(role)) {
      throw new AuthorizationError(`Role '${role}' required`);
    }
  };
}
