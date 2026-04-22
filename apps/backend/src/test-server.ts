import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

async function createTestServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: true
  });

  // Register plugins
  await server.register(cors);
  await server.register(helmet);
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  // Simple test route
  server.get('/test', async (request, reply) => {
    return { message: 'Server is working!' };
  });

  return server;
}

async function startTestServer(): Promise<void> {
  try {
    const server = await createTestServer();
    
    await server.listen({ 
      port: 3002, 
      host: '0.0.0.0' 
    });

    console.log('Test server started on port 3002');
  } catch (error) {
    console.error('Failed to start test server:', error);
    process.exit(1);
  }
}

startTestServer();
