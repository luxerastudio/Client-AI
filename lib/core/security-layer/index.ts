/**
 * Security Layer Core Module
 * Handles authentication, authorization, and data protection
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'viewer';
  permissions: string[];
  createdAt: Date;
  lastLogin?: Date;
  status: 'active' | 'suspended' | 'inactive';
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface SecurityConfig {
  sessionTimeout: number; // minutes
  maxLoginAttempts: number;
  passwordMinLength: number;
  requireTwoFactor: boolean;
  encryptionKey: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export class SecurityLayer {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, AuthSession> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.initializePermissions();
  }

  private initializePermissions(): void {
    const defaultPermissions: Permission[] = [
      // Lead Engine permissions
      { id: 'leads.read', name: 'Read Leads', description: 'View lead information', resource: 'leads', action: 'read' },
      { id: 'leads.create', name: 'Create Leads', description: 'Generate new leads', resource: 'leads', action: 'create' },
      { id: 'leads.update', name: 'Update Leads', description: 'Modify lead information', resource: 'leads', action: 'update' },
      { id: 'leads.delete', name: 'Delete Leads', description: 'Remove leads', resource: 'leads', action: 'delete' },
      
      // Campaign permissions
      { id: 'campaigns.read', name: 'Read Campaigns', description: 'View campaign information', resource: 'campaigns', action: 'read' },
      { id: 'campaigns.create', name: 'Create Campaigns', description: 'Create new campaigns', resource: 'campaigns', action: 'create' },
      { id: 'campaigns.update', name: 'Update Campaigns', description: 'Modify campaigns', resource: 'campaigns', action: 'update' },
      { id: 'campaigns.delete', name: 'Delete Campaigns', description: 'Remove campaigns', resource: 'campaigns', action: 'delete' },
      
      // Analytics permissions
      { id: 'analytics.read', name: 'Read Analytics', description: 'View analytics data', resource: 'analytics', action: 'read' },
      
      // User management permissions
      { id: 'users.read', name: 'Read Users', description: 'View user information', resource: 'users', action: 'read' },
      { id: 'users.create', name: 'Create Users', description: 'Create new users', resource: 'users', action: 'create' },
      { id: 'users.update', name: 'Update Users', description: 'Modify user information', resource: 'users', action: 'update' },
      { id: 'users.delete', name: 'Delete Users', description: 'Remove users', resource: 'users', action: 'delete' },
      
      // Billing permissions
      { id: 'billing.read', name: 'Read Billing', description: 'View billing information', resource: 'billing', action: 'read' },
      { id: 'billing.update', name: 'Update Billing', description: 'Modify billing information', resource: 'billing', action: 'update' }
    ];

    defaultPermissions.forEach(permission => {
      this.permissions.set(permission.id, permission);
    });
  }

  async createUser(
    email: string,
    name: string,
    role: User['role']
  ): Promise<User> {
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) throw new Error('User already exists');

    const user: User = {
      id: `user_${Date.now()}`,
      email,
      name,
      role,
      permissions: this.getRolePermissions(role),
      createdAt: new Date(),
      status: 'active'
    };

    this.users.set(user.id, user);
    
    // Log user creation
    await this.logAudit(user.id, 'user.create', 'users', user.id, true);
    
    return user;
  }

  async authenticateUser(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthSession | null> {
    const user = await this.getUserByEmail(email);
    if (!user || user.status !== 'active') {
      await this.logAudit('anonymous', 'auth.login', 'auth', undefined, false, 'Invalid credentials or inactive user');
      return null;
    }

    // In a real implementation, we'd verify password hash
    // For now, assume password is correct
    
    // Create session
    const session: AuthSession = {
      id: `session_${Date.now()}`,
      userId: user.id,
      token: this.generateToken(),
      expiresAt: new Date(Date.now() + this.config.sessionTimeout * 60 * 1000),
      ipAddress,
      userAgent,
      createdAt: new Date()
    };

    this.sessions.set(session.id, session);

    // Update user last login
    user.lastLogin = new Date();
    this.users.set(user.id, user);

    // Log successful login
    await this.logAudit(user.id, 'auth.login', 'auth', session.id, true);

    return session;
  }

  async validateSession(token: string): Promise<User | null> {
    for (const session of this.sessions.values()) {
      if (session.token === token && session.expiresAt > new Date()) {
        const user = this.users.get(session.userId);
        return user || null;
      }
    }
    return null;
  }

  async revokeSession(token: string): Promise<void> {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.token === token) {
        this.sessions.delete(sessionId);
        await this.logAudit(session.userId, 'auth.logout', 'auth', sessionId, true);
        break;
      }
    }
  }

  async hasPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || user.status !== 'active') return false;

    // Admin has all permissions
    if (user.role === 'admin') return true;

    // Check specific permissions
    const permissionId = `${resource}.${action}`;
    return user.permissions.includes(permissionId);
  }

  async authorizeAction(
    userId: string,
    resource: string,
    action: string,
    resourceId?: string
  ): Promise<boolean> {
    const hasPermission = await this.hasPermission(userId, resource, action);
    
    // Log the authorization attempt
    await this.logAudit(
      userId,
      `${resource}.${action}`,
      resource,
      resourceId,
      hasPermission,
      hasPermission ? undefined : 'Insufficient permissions'
    );

    return hasPermission;
  }

  async encryptData(data: string): Promise<string> {
    // Simple encryption for demo - in production, use proper encryption
    return Buffer.from(data).toString('base64');
  }

  async decryptData(encryptedData: string): Promise<string> {
    // Simple decryption for demo - in production, use proper decryption
    return Buffer.from(encryptedData, 'base64').toString();
  }

  async maskSensitiveData(data: any): Promise<any> {
    // Mask sensitive fields like emails, phone numbers, etc.
    const masked = { ...data };

    if (masked.email) {
      const [username, domain] = masked.email.split('@');
      masked.email = `${username.slice(0, 2)}***@${domain}`;
    }

    if (masked.phone) {
      masked.phone = masked.phone.slice(0, 3) + '***' + masked.phone.slice(-4);
    }

    return masked;
  }

  async getAuditLogs(
    userId?: string,
    action?: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values());

    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }

    if (action) {
      logs = logs.filter(log => log.action === action);
    }

    return logs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getUser(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async updateUser(
    userId: string,
    updates: Partial<User>
  ): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const updatedUser = { ...user, ...updates };
    this.users.set(userId, updatedUser);

    await this.logAudit(userId, 'user.update', 'users', userId, true);
    
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    this.users.delete(userId);

    // Revoke all sessions for this user
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }

    await this.logAudit(userId, 'user.delete', 'users', userId, true);
    
    return true;
  }

  async getPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values());
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(sessionId);
        await this.logAudit(session.userId, 'auth.session_expired', 'auth', sessionId, true);
      }
    }
  }

  private getRolePermissions(role: User['role']): string[] {
    const rolePermissions = {
      admin: Array.from(this.permissions.keys()),
      agent: [
        'leads.read', 'leads.create', 'leads.update',
        'campaigns.read', 'campaigns.create', 'campaigns.update',
        'analytics.read'
      ],
      viewer: [
        'leads.read',
        'campaigns.read',
        'analytics.read'
      ]
    };

    return rolePermissions[role] || [];
  }

  private generateToken(): string {
    // Generate a random token - in production, use proper JWT or similar
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private async logAudit(
    userId: string,
    action: string,
    resource: string,
    resourceId: string | undefined,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const log: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      userId,
      action,
      resource,
      resourceId,
      ipAddress: 'unknown', // Would be passed in real implementation
      userAgent: 'unknown', // Would be passed in real implementation
      success,
      errorMessage,
      metadata: {},
      createdAt: new Date()
    };

    this.auditLogs.set(log.id, log);
  }
}

export const securityLayer = new SecurityLayer({
  sessionTimeout: 60, // 1 hour
  maxLoginAttempts: 5,
  passwordMinLength: 8,
  requireTwoFactor: false,
  encryptionKey: 'demo-key-change-in-production'
});
