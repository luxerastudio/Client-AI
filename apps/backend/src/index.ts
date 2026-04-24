// @ts-nocheck
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config } from './infrastructure/config/Config';
import { logger } from './infrastructure/logging/Logger';
import { DependencyContainer } from './infrastructure/di/DependencyContainer';

// Import all routes for proper registration
import { healthRoutes } from './presentation/routes/healthRoutes';
import { aiRoutes } from './presentation/routes/aiRoutes';
import { workflowRoutes } from './presentation/routes/workflowRoutes';
import { scoringRoutes } from './presentation/routes/scoringRoutes';
import { securityRoutes } from './presentation/routes/securityRoutes';
// import { versionRoutes } from './presentation/routes/versionRoutes';
import { userMemoryRoutes } from './presentation/routes/userMemoryRoutes';
import { workflowEngineRoutes } from './presentation/routes/workflowEngineRoutes';

async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: false // We use our own logger
  });

  // Register plugins
  await server.register(cors, {
    origin: true,
    credentials: true
  });

  await server.register(helmet);

  await server.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.window
  });

  // Register Swagger documentation
  await server.register(swagger, {
    swagger: {
      info: {
        title: 'AI SaaS API',
        description: 'Production-grade AI automation API',
        version: '1.0.0'
      },
      host: 'localhost',
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'workflows', description: 'Workflow management' },
      { name: 'content', description: 'AI content generation' }
    ]
  }
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full'
    }
  });

  // Initialize EnhancedDependencyContainer and register all services
  const container = new DependencyContainer();
  await initializeDependencyContainer(container);

  // Register all routes through proper DI system
  await registerRoutes(server, container);

  // Error handler
  server.setErrorHandler((error, request, reply) => {
    logger.error('Request error', error);
    
    reply.status(500).send({
      error: 'Internal Server Error',
      message: config.nodeEnv === 'development' ? error.message : 'Something went wrong'
    });
  });

  return server;
}

// Initialize EnhancedDependencyContainer with all services
async function initializeDependencyContainer(container: DependencyContainer): Promise<void> {
  logger.info('Initializing EnhancedDependencyContainer...');

  // Register Database Connection
  const DatabaseConnection = (await import('./infrastructure/database/DatabaseConnection')).DatabaseConnection;
  container.register('dbConnection', () => {
    const dbConnection = new DatabaseConnection();
    // Initialize connection synchronously in factory
    dbConnection.connect().catch(error => {
      console.warn('Database connection failed, using fallback mode:', error);
    });
    return dbConnection;
  }, { singleton: true });

  // Register AI Engine
  const AIEngine = (await import('./infrastructure/ai/AIEngine')).AIEngine;
  container.register('aiEngine', () => {
    const aiEngine = new AIEngine(config.ai || {});
    // Initialize asynchronously
    aiEngine.initialize().catch(console.error);
    return aiEngine;
  }, { singleton: true });

  // Register User Memory Service (OPTIONAL)
  try {
    const UserMemoryService = (await import('./infrastructure/user-memory/UserMemoryService')).UserMemoryService;
    const UserMemoryRepository = (await import('./infrastructure/repositories/UserMemoryRepositoryDB')).UserMemoryRepositoryDB;
    
    const repoSuccess = safeRegisterService(container, 'userMemoryRepository', () => {
      const dbConnection = container.get('dbConnection') as any;
      return new UserMemoryRepository(dbConnection);
    }, { singleton: true, dependencies: ['dbConnection'] });
    
    const serviceSuccess = safeRegisterService(container, 'userMemoryService', () => {
      const repository = container.get('userMemoryRepository') as any;
      const aiEngine = container.get('aiEngine') as any;
      return new UserMemoryService(repository, undefined, undefined, undefined, undefined);
    }, { singleton: true, dependencies: ['userMemoryRepository', 'aiEngine'] });
    
    if (repoSuccess && serviceSuccess) successfulRegistrations += 2;
    else failedRegistrations += 2;
  } catch (error) {
    logDetailedError('DI', 'registerUserMemoryService', error);
    failedRegistrations++;
  }

  // Register Memory-Aware Prompt Enhancer
  const MemoryAwarePromptEnhancer = (await import('./infrastructure/ai/MemoryAwarePromptEnhancer')).MemoryAwarePromptEnhancer;
  container.register('promptEnhancer', () => {
    const userMemoryService = container.get('userMemoryService') as any;
    const aiEngine = container.get('aiEngine') as any;
    return new MemoryAwarePromptEnhancer(userMemoryService, aiEngine);
  }, { singleton: true, dependencies: ['userMemoryService', 'aiEngine'] });

  // Register User Repository
  const UserRepository = (await import('./infrastructure/repositories/UserRepository')).UserRepository;
  container.register('userRepository', () => {
    const dbConnection = container.get('dbConnection') as any;
    return new UserRepository(dbConnection);
  }, { singleton: true, dependencies: ['dbConnection'] });

  // Register Session Repository
  const SessionRepository = (await import('./infrastructure/repositories/SessionRepository')).SessionRepository;
  container.register('sessionRepository', () => {
    const dbConnection = container.get('dbConnection') as any;
    return new SessionRepository(dbConnection);
  }, { singleton: true, dependencies: ['dbConnection'] });

  // Register API Key Repository
  const ApiKeyRepository = (await import('./infrastructure/repositories/ApiKeyRepository')).ApiKeyRepository;
  container.register('apiKeyRepository', () => {
    const dbConnection = container.get('dbConnection') as any;
    return new ApiKeyRepository(dbConnection);
  }, { singleton: true, dependencies: ['dbConnection'] });

  // Register Scoring Result Repository
  const ScoringResultRepository = (await import('./infrastructure/repositories/ScoringResultRepository')).ScoringResultRepository;
  container.register('scoringResultRepository', () => {
    const dbConnection = container.get('dbConnection') as any;
    return new ScoringResultRepository(dbConnection);
  }, { singleton: true, dependencies: ['dbConnection'] });

  // Register Scoring Engine with database integration
  const ScoringEngineDB = (await import('./infrastructure/scoring/ScoringEngineDB')).ScoringEngineDB;
  container.register('scoringEngine', () => {
    const scoringResultRepository = container.get('scoringResultRepository') as any;
    return new ScoringEngineDB(scoringResultRepository, config.scoring || {});
  }, { singleton: true, dependencies: ['scoringResultRepository'] });

  // Register Workflow Registry
  const WorkflowRegistry = (await import('./infrastructure/workflow-engine/WorkflowRegistry')).WorkflowRegistry;
  container.register('workflowRegistry', () => new WorkflowRegistry(), { singleton: true });

  // Register Workflow Execution Repository
  const WorkflowExecutionRepository = (await import('./infrastructure/repositories/WorkflowExecutionRepository')).WorkflowExecutionRepository;
  container.register('workflowExecutionRepository', () => {
    const dbConnection = container.get('dbConnection') as any;
    return new WorkflowExecutionRepository(dbConnection);
  }, { singleton: true, dependencies: ['dbConnection'] });

  // Register Workflow Engine with database integration
  const WorkflowExecutionEngineDB = (await import('./infrastructure/workflow-engine/WorkflowExecutionEngineDB')).WorkflowExecutionEngineDB;
  container.register('workflowEngine', () => {
    const workflowRegistry = container.get('workflowRegistry') as any;
    const workflowExecutionRepository = container.get('workflowExecutionRepository') as any;
    const aiEngine = container.get('aiEngine') as any;
    return new WorkflowExecutionEngineDB(workflowRegistry, workflowExecutionRepository, aiEngine);
  }, { singleton: true, dependencies: ['workflowRegistry', 'workflowExecutionRepository', 'aiEngine'] });

  // Register Authentication Service with repositories
  const AuthenticationServiceDB = (await import('./infrastructure/security/AuthenticationServiceDB')).AuthenticationServiceDB;
  container.register('authService', () => {
    const userRepository = container.get('userRepository') as any;
    const sessionRepository = container.get('sessionRepository') as any;
    const apiKeyRepository = container.get('apiKeyRepository') as any;
    return new AuthenticationServiceDB(
      config.security || {},
      userRepository,
      sessionRepository,
      apiKeyRepository
    );
  }, { singleton: true, dependencies: ['userRepository', 'sessionRepository', 'apiKeyRepository'] });

  // Register Controllers
  const AIController = (await import('./presentation/controllers/AIController')).AIController;
  const WorkflowController = (await import('./presentation/controllers/WorkflowController')).WorkflowController;
  const ScoringController = (await import('./presentation/controllers/ScoringController')).ScoringController;
  const SecurityController = (await import('./presentation/controllers/SecurityController')).SecurityController;
  const VersionController = (await import('./presentation/controllers/VersionController')).VersionController;
  const UserMemoryController = (await import('./presentation/controllers/UserMemoryController')).UserMemoryController;
  const WorkflowEngineController = (await import('./presentation/controllers/WorkflowEngineController')).WorkflowEngineController;

  container.register('aiController', () => new AIController(container), { singleton: true });
  container.register('workflowController', () => new WorkflowController(container), { singleton: true });
  container.register('scoringController', () => new ScoringController(container), { singleton: true });
  container.register('securityController', () => new SecurityController(container), { singleton: true });
  container.register('versionController', () => new VersionController(container), { singleton: true });
  container.register('userMemoryController', () => new UserMemoryController(container), { singleton: true });
  container.register('workflowEngineController', () => new WorkflowEngineController(container), { singleton: true });

  // Validate and warmup DI system
  const validation = container.validateDependencies();
  if (!validation.valid) {
    throw new Error(`DI System validation failed: ${validation.errors.join(', ')}`);
  }

  // Warmup singleton services
  await container.warmup();

  logger.info('EnhancedDependencyContainer initialized successfully');
  logger.info(`Services registered: ${container.getRegisteredServices().length}`);
  logger.info(`Initialization order: ${container.getInitializationOrder().join(' -> ')}`);
  logger.info(`Health info: ${JSON.stringify(container.getHealthInfo())}`);
}

// Register all routes through proper DI system
async function registerRoutes(server: FastifyInstance, container: EnhancedDependencyContainer): Promise<void> {
  logger.info('Registering routes...');

  // Simple test route first
  server.get('/test', async (request, reply) => {
    return { message: 'DI system is working!', containerServices: container.getRegisteredServices() };
  });

  // Register health routes (no authentication required)
  try {
    await server.register(async function(fastify: FastifyInstance) {
      await healthRoutes(fastify, container);
    }, { prefix: '/health' });
    logger.info('Health routes registered');
  } catch (error) {
    logger.error('Failed to register health routes:', error);
  }

  // Register AI routes
  try {
    await server.register(async function(fastify: FastifyInstance) {
      await aiRoutes(fastify, container);
    }, { prefix: '/api/v1/ai' });
    logger.info('AI routes registered');
  } catch (error) {
    logger.error('Failed to register AI routes:', error);
  }

  // Register workflow routes
  try {
    const workflowController = container.get('workflowController');
    await server.register(async function(fastify: FastifyInstance) {
      await workflowRoutes(fastify, workflowController);
    }, { prefix: '/api/v1/workflow' });
    logger.info('Workflow routes registered');
  } catch (error) {
    logger.error('Failed to register workflow routes:', error);
  }

  // Register scoring routes
  try {
    const scoringController = container.get('scoringController');
    await server.register(async function(fastify: FastifyInstance) {
      await scoringRoutes(fastify, container);
    }, { prefix: '/api/v1/scoring' });
    logger.info('Scoring routes registered');
  } catch (error) {
    logger.error('Failed to register scoring routes:', error);
  }

  // Register security routes
  try {
    const securityController = container.get('securityController');
    await server.register(async function(fastify: FastifyInstance) {
      await securityRoutes(fastify, container);
    }, { prefix: '/api/v1/security' });
    logger.info('Security routes registered');
  } catch (error) {
    logger.error('Failed to register security routes:', error);
  }

  // Register version routes
  try {
    const versionController = container.get('versionController');
    await server.register(async function(fastify: FastifyInstance) {
      await versionRoutes(fastify, container);
    }, { prefix: '/api/v1/version' });
    logger.info('Version routes registered');
  } catch (error) {
    logger.error('Failed to register version routes:', error);
  }

  // Register user memory routes
  try {
    const userMemoryController = container.get('userMemoryController');
    await server.register(async function(fastify: FastifyInstance) {
      await userMemoryRoutes(fastify, container);
    }, { prefix: '/api/v1/memory' });
    logger.info('User memory routes registered');
  } catch (error) {
    logger.error('Failed to register user memory routes:', error);
  }

  // Register workflow engine routes
  try {
    const workflowEngineController = container.get('workflowEngineController');
    await server.register(async function(fastify: FastifyInstance) {
      await workflowEngineRoutes(fastify, container);
    }, { prefix: '/api/v1/workflow-engine' });
    logger.info('Workflow engine routes registered');
  } catch (error) {
    logger.error('Failed to register workflow engine routes:', error);
  }

  logger.info('Routes registration completed');
}

async function start(): Promise<void> {
  try {
    const server = await createServer();
    
    await server.listen({ 
      port: config.port, 
      host: '0.0.0.0' 
    });

    logger.info(`Server started on port ${config.port}`);
    logger.info(`API documentation available at http://localhost:${config.port}/docs`);
    
    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      await server.close();
      // await Container.getInstance().disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

start().catch((error) => {
  logger.error('Failed to start application', error);
  process.exit(1);
});
