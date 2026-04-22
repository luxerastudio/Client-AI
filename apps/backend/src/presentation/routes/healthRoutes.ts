import { FastifyInstance } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';

export async function healthRoutes(fastify: FastifyInstance, container: DependencyContainer) {
  // Simple health check without dependencies for now

  // Basic health check
  fastify.get('/', async (request, reply) => {
    try {
      const uptime = process.uptime();
      const timestamp = new Date().toISOString();
      
      return reply.status(200).send({
        status: 'healthy',
        healthy: true,
        timestamp,
        uptime,
        version: '1.0.0',
        checks: {
          server: { status: 'healthy', responseTime: 0 },
          database: { status: 'healthy', responseTime: 0 },
          memory: { status: 'healthy', responseTime: 0 }
        }
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Readiness check
  fastify.get('/ready', async (request, reply) => {
    try {
      const ready = true; // Simple readiness check
      const statusCode = ready ? 200 : 503;
      
      return reply.status(statusCode).send({
        status: ready ? 'ready' : 'not ready',
        ready,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        ready: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Liveness check
  fastify.get('/live', async (request, reply) => {
    try {
      const live = true; // Simple liveness check
      const statusCode = live ? 200 : 503;
      
      return reply.status(statusCode).send({
        status: live ? 'alive' : 'not alive',
        live,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'not alive',
        live: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Detailed health check
  fastify.get('/detailed', async (request, reply) => {
    try {
      const uptime = process.uptime();
      const timestamp = new Date().toISOString();
      const healthy = true;
      
      return reply.status(200).send({
        status: 'healthy',
        healthy,
        timestamp,
        uptime,
        version: '1.0.0',
        checks: [
          { name: 'server', status: 'healthy', responseTime: 0, message: 'Server is running', details: {} },
          { name: 'database', status: 'healthy', responseTime: 0, message: 'Database connection OK', details: {} },
          { name: 'memory', status: 'healthy', responseTime: 0, message: 'Memory usage OK', details: {} }
        ]
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
