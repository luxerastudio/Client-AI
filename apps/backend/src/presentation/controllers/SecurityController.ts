import { FastifyRequest, FastifyReply } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';
import { AuthenticationServiceDB } from '../../infrastructure/security/AuthenticationServiceDB';

// Simple sanitize function since the original is private
function sanitizeUser(user: any) {
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}

export class SecurityController {
  constructor(private container: DependencyContainer) {}

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, password } = request.body as any;
      const authService = this.container.get('authService') as AuthenticationServiceDB;
      
      const result = await authService.login(email, password);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      reply.status(401).send({
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      });
    }
  }

  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, password, username } = request.body as any;
      const authService = this.container.get('authService') as AuthenticationServiceDB;
      
      // For now, create a simple user. In production, this would have more validation
      const user = await authService.register({
        email,
        password,
        name: username
      });
      
      return {
        success: true,
        data: { user: sanitizeUser(user) }
      };
    } catch (error) {
      reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      });
    }
  }

  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { refreshToken } = request.body as any;
      const authService = this.container.get('authService') as AuthenticationServiceDB;
      
      const tokens = await authService.refreshToken(refreshToken);
      
      return {
        success: true,
        data: tokens
      };
    } catch (error) {
      reply.status(401).send({
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sessionId } = request.body as any;
      const authService = this.container.get('authService') as AuthenticationServiceDB;
      
      await authService.logout(sessionId);
      
      return {
        success: true,
        data: { message: 'Logged out successfully' }
      };
    } catch (error) {
      reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      });
    }
  }

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as any;
      const authService = this.container.get('authService') as AuthenticationServiceDB;
      
      // Since getUserById doesn't exist, we'll use validateToken to get user info
      // For now, return a simple profile response
      return {
        success: true,
        data: { 
          user: { 
            id: userId,
            message: 'Profile endpoint - needs getUserById implementation'
          }
        }
      };
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile'
      });
    }
  }
}
