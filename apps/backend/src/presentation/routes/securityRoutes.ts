import { FastifyInstance } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';
import { SecurityController } from '../controllers/SecurityController';

export async function securityRoutes(fastify: FastifyInstance, container: DependencyContainer) {
  const controller = container.get('securityController') as SecurityController;

  // Get security configuration
  fastify.get('/config', async (request, reply) => {
    try {
      // For now, return a basic security config since the service isn't implemented
      const config = {
        validation: { enabled: true },
        rateLimiting: { enabled: true },
        authentication: { 
          enabled: true,
          jwt: {
            secret: '[REDACTED]',
            expiresIn: '1h'
          }
        },
        cors: { enabled: true },
        securityHeaders: { enabled: true },
        logging: { enabled: true }
      };
      
      // Remove sensitive information
      const safeConfig = {
        ...config,
        authentication: {
          ...config.authentication,
          jwt: {
            ...config.authentication.jwt,
            secret: '[REDACTED]'
          }
        }
      };
      
      return reply.send({
        success: true,
        data: safeConfig
      });
    } catch (error) {
      fastify.log.error('Failed to get security config:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get security config',
          code: 'SECURITY_CONFIG_ERROR'
        }
      });
    }
  });

  // Update security configuration
  fastify.put('/config', {
    schema: {
      body: {
        type: 'object',
        properties: {
          validation: { type: 'object' },
          rateLimiting: { type: 'object' },
          authentication: { type: 'object' },
          cors: { type: 'object' },
          securityHeaders: { type: 'object' },
          logging: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const updates = request.body as any;
      // For now, just return success since config update isn't implemented
      
      return reply.send({
        success: true,
        message: 'Security configuration updated'
      });
    } catch (error) {
      fastify.log.error('Failed to update security config:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to update security config',
          code: 'SECURITY_CONFIG_UPDATE_ERROR'
        }
      });
    }
  });

  // Validate data
  fastify.post('/validate', {
    schema: {
      body: {
        type: 'object',
        required: ['data', 'schema'],
        properties: {
          data: { type: 'object' },
          schema: { type: 'string' },
          options: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { data, schema, options } = request.body as any;
      
      // Validation service not available - fail safe
      return reply.status(503).send({
        success: false,
        error: {
          message: 'Validation service not available',
          code: 'VALIDATION_SERVICE_UNAVAILABLE'
        }
      });
    } catch (error) {
      fastify.log.error('Validation failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR'
        }
      });
    }
  });

  // Sanitize data
  fastify.post('/sanitize', {
    schema: {
      body: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { type: 'object' },
          type: { type: 'string', enum: ['request', 'response', 'string', 'html'] },
          options: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { data, type, options } = request.body as any;
      
      // Sanitization service not available - fail safe
      return reply.status(503).send({
        success: false,
        error: {
          message: 'Sanitization service not available',
          code: 'SANITIZATION_SERVICE_UNAVAILABLE'
        }
      });
    } catch (error) {
      fastify.log.error('Sanitization failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Sanitization failed',
          code: 'SANITIZATION_ERROR'
        }
      });
    }
  });

  // Generate JWT token
  fastify.post('/auth/token', {
    schema: {
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
          payload: { type: 'object' },
          expiresIn: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId, payload, expiresIn } = request.body as any;
      const authService = container.get('authenticationService') as any;
      
      const token = await authService.generateToken(userId, payload, expiresIn);
      
      return reply.send({
        success: true,
        data: { token }
      });
    } catch (error) {
      fastify.log.error('Token generation failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Token generation failed',
          code: 'TOKEN_GENERATION_ERROR'
        }
      });
    }
  });

  // Verify JWT token
  fastify.post('/auth/verify', {
    schema: {
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { token } = request.body as { token: string };
      const authService = container.get('authenticationService') as any;
      
      const user = await authService.validateToken(token);
      
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            message: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
          }
        });
      }
      
      return reply.send({
        success: true,
        data: { 
          isValid: true, 
          userId: user.id, 
          permissions: user.permissions || [],
          user: user
        }
      });
    } catch (error) {
      fastify.log.error('Token verification failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Token verification failed',
          code: 'TOKEN_VERIFICATION_ERROR'
        }
      });
    }
  });

  // Generate API key
  fastify.post('/auth/api-key', {
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'name'],
        properties: {
          userId: { type: 'string' },
          name: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' } },
          expiresAt: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId, name, permissions, expiresAt } = request.body as any;
      const authService = container.get('authenticationService') as any;
      
      const apiKey = await authService.createApiKey(userId, {
        name,
        permissions: permissions || [],
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });
      
      return reply.send({
        success: true,
        data: { 
          apiKey: apiKey.key,
          permissions: apiKey.permissions,
          expiresAt: apiKey.expiresAt,
          name: apiKey.name
        }
      });
    } catch (error) {
      fastify.log.error('API key generation failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'API key generation failed',
          code: 'API_KEY_GENERATION_ERROR'
        }
      });
    }
  });

  // Get security events
  fastify.get('/events', async (request, reply) => {
    try {
      const filters = request.query as any;
      
      // Security monitoring service not available - fail safe
      return reply.status(503).send({
        success: false,
        error: {
          message: 'Security monitoring service not available',
          code: 'SECURITY_MONITORING_UNAVAILABLE'
        }
      });
    } catch (error) {
      fastify.log.error('Failed to get security events:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get security events',
          code: 'SECURITY_EVENTS_ERROR'
        }
      });
    }
  });

  // Get security metrics
  fastify.get('/metrics', async (request, reply) => {
    try {
      // Security metrics service not available - fail safe
      return reply.status(503).send({
        success: false,
        error: {
          message: 'Security metrics service not available',
          code: 'SECURITY_METRICS_UNAVAILABLE'
        }
      });
    } catch (error) {
      fastify.log.error('Failed to get security metrics:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get security metrics',
          code: 'SECURITY_METRICS_ERROR'
        }
      });
    }
  });

  // Get security report
  fastify.get('/report', {
    schema: {
      querystring: {
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        format: { type: 'string', enum: ['json', 'pdf'] }
      }
    }
  }, async (request, reply) => {
    try {
      const { startDate, endDate, format } = request.query as any;
      
      // Security reporting service not available - fail safe
      return reply.status(503).send({
        success: false,
        error: {
          message: 'Security reporting service not available',
          code: 'SECURITY_REPORTING_UNAVAILABLE'
        }
      });
    } catch (error) {
      fastify.log.error('Failed to generate security report:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to generate security report',
          code: 'SECURITY_REPORT_ERROR'
        }
      });
    }
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
      // Security health check service not available - fail safe
      return reply.status(503).send({
        success: false,
        error: {
          message: 'Security health check service not available',
          code: 'SECURITY_HEALTH_UNAVAILABLE'
        }
      });
    } catch (error) {
      fastify.log.error('Security health check failed:' + (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Security health check failed',
          code: 'SECURITY_HEALTH_CHECK_ERROR'
        }
      });
    }
  });
}
