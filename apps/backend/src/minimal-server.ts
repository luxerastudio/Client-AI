import Fastify from 'fastify';
import cors from '@fastify/cors';

async function startServer() {
  const server = Fastify({
    logger: false
  });

  // Register CORS
  await server.register(cors, {
    origin: true,
    credentials: true
  });

// Health check endpoint
server.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
});

// AI generate endpoint (mock)
server.post('/api/v1/ai/generate', {
  schema: {
    body: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: { type: 'string', minLength: 1, maxLength: 10000 }
      }
    }
  }
}, async (request, reply) => {
  const { prompt } = request.body as any;
  
  return {
    success: true,
    data: {
      content: `Mock AI response to: ${prompt}`,
      model: 'mock-gpt-4',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    }
  };
});

// Workflow endpoint (mock)
server.post('/api/v1/workflows/run', {
  schema: {
    body: {
      type: 'object',
      required: ['workflowId', 'input'],
      properties: {
        workflowId: { type: 'string' },
        input: { type: 'object' }
      }
    }
  }
}, async (request, reply) => {
  const { workflowId, input } = request.body as any;
  
  return {
    success: true,
    data: {
      executionId: `exec_${Date.now()}`,
      status: 'completed',
      output: { result: `Mock workflow ${workflowId} executed with input: ${JSON.stringify(input)}` }
    }
  };
});

// Scoring endpoint (mock)
server.post('/api/v1/score', {
  schema: {
    body: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string' },
        criteria: { type: 'array', items: { type: 'string' } }
      }
    }
  }
}, async (request, reply) => {
  const { content, criteria = [] } = request.body as any;
  
  return {
    success: true,
    data: {
      score: 0.85,
      breakdown: criteria.map((crit: string) => ({ criterion: crit, score: Math.random() })),
      confidence: 0.9
    }
  };
});

// Security endpoints (mock)
server.post('/api/v1/security/auth/login', async (request, reply) => {
  return {
    success: true,
    data: {
      user: { id: 'user_123', email: 'test@example.com' },
      tokens: { access: 'mock_access_token', refresh: 'mock_refresh_token' }
    }
  };
});

server.get('/api/v1/security/health', async (request, reply) => {
  return {
    status: 'healthy',
    services: {
      authentication: 'ok',
      authorization: 'ok',
      monitoring: 'ok'
    }
  };
});

// Version endpoint (mock)
server.get('/api/v1/versions/latest', async (request, reply) => {
  return {
    success: true,
    data: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      changes: ['Mock version for testing']
    }
  };
});

// Start server
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Minimal server started on port 3001');
    console.log('Health: http://localhost:3001/health');
    console.log('API docs: http://localhost:3001/docs');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();
