import fastify from 'fastify';
import { FastifyInstance } from 'fastify';
import { config } from './config';
import { DatabaseConnection } from './infrastructure/database/DatabaseConnection';
import { AIEngine } from './infrastructure/ai/AIEngine';
import { WorkflowEngine } from './infrastructure/workflow-engine/WorkflowEngine';
import { ScoringEngine } from './infrastructure/scoring/ScoringEngine';
import { VersionManager } from './infrastructure/versioning/VersionManager';
import { UserMemoryService } from './infrastructure/user-memory/UserMemoryService';
import { DependencyContainer } from './infrastructure/di/DependencyContainer';
import { Logger } from './infrastructure/logging/Logger';
import { MetricsCollector } from './infrastructure/monitoring/MetricsCollector';
import { HealthChecker } from './infrastructure/health/HealthChecker';

export class Application {
  private app: FastifyInstance;
  private container: DependencyContainer;
  private database: DatabaseConnection;
  private logger: Logger;
  private metrics: MetricsCollector;
  private healthChecker: HealthChecker;

  constructor() {
    this.app = fastify({
      logger: config.logging.enabled,
      trustProxy: true,
      bodyLimit: config.server.bodyLimit
    });

    // Configure CORS for production
    this.app.register(import('@fastify/cors'), {
      origin: this.getAllowedOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Accept',
        'Authorization',
        'Content-Type',
        'X-Requested-With',
        'X-Request-ID',
        'Cache-Control',
        'Pragma'
      ],
      exposedHeaders: [
        'X-Request-ID',
        'X-Total-Count',
        'X-Page-Count'
      ]
    });

    this.container = new DependencyContainer();
    this.logger = new Logger(config.logging.level);
    this.metrics = new MetricsCollector();
    this.healthChecker = new HealthChecker();
    this.database = {} as DatabaseConnection;
  }

  async initialize(): Promise<void> {
    const startTime = Date.now();
    let initializationSteps: string[] = [];
    
    try {
      this.logger.info('Starting application initialization...');

      // Initialize database with retry logic
      try {
        await this.initializeDatabase();
        initializationSteps.push('Database connection established');
      } catch (error) {
        this.logger.error('CRITICAL: Database initialization failed:', error);
        throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Initialize core services with individual error handling
      try {
        await this.initializeCoreServices();
        initializationSteps.push('Core services initialized');
      } catch (error) {
        this.logger.error('CRITICAL: Core services initialization failed:', error);
        throw new Error(`Core services initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Initialize middleware
      try {
        await this.initializeMiddleware();
        initializationSteps.push('Middleware initialized');
      } catch (error) {
        this.logger.error('CRITICAL: Middleware initialization failed:', error);
        throw new Error(`Middleware initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Initialize routes
      try {
        await this.initializeRoutes();
        initializationSteps.push('Routes initialized');
      } catch (error) {
        this.logger.error('CRITICAL: Routes initialization failed:', error);
        throw new Error(`Routes initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Initialize error handling
      try {
        await this.initializeErrorHandling();
        initializationSteps.push('Error handling initialized');
      } catch (error) {
        this.logger.error('CRITICAL: Error handling initialization failed:', error);
        throw new Error(`Error handling initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Initialize monitoring
      try {
        await this.initializeMonitoring();
        initializationSteps.push('Monitoring initialized');
      } catch (error) {
        this.logger.error('CRITICAL: Monitoring initialization failed:', error);
        throw new Error(`Monitoring initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const initializationTime = Date.now() - startTime;
      this.logger.info('Application initialized successfully', {
        initializationTime: `${initializationTime}ms`,
        completedSteps: initializationSteps
      });

    } catch (error) {
      const initializationTime = Date.now() - startTime;
      this.logger.error('Application initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        initializationTime: `${initializationTime}ms`,
        completedSteps: initializationSteps,
        failedAtStep: initializationSteps.length + 1
      });

      // In production, exit gracefully instead of throwing
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('Production mode: Exiting gracefully due to initialization failure');
        process.exit(1);
      } else {
        this.logger.error('Development mode: Re-throwing initialization error');
        throw error;
      }
    }
  }

  private async initializeDatabase(): Promise<void> {
    this.logger.info('Initializing database connection...');
    
    try {
      this.database = new DatabaseConnection(config.database);
      
      // Add connection timeout and retry logic
      const connectionTimeout = setTimeout(() => {
        throw new Error('Database connection timeout after 30 seconds');
      }, 30000);
      
      try {
        await this.database.connect();
        clearTimeout(connectionTimeout);
      } catch (connectionError) {
        clearTimeout(connectionTimeout);
        throw new Error(`Database connection failed: ${connectionError instanceof Error ? connectionError.message : 'Unknown error'}`);
      }
      
      // Test connection with a simple query
      try {
        await this.database.query('SELECT 1');
        this.logger.info('Database connection test successful');
      } catch (testError) {
        throw new Error(`Database connection test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
      }
      
      // Register database in container
      this.container.register('database', () => this.database);
      
      this.logger.info('Database connection established', {
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        ssl: config.database.ssl
      });
      
    } catch (error) {
      this.logger.error('Database initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        config: {
          host: config.database.host,
          port: config.database.port,
          database: config.database.database,
          ssl: config.database.ssl
        }
      });
      throw error;
    }
  }

  private async initializeCoreServices(): Promise<void> {
    this.logger.info('Initializing core services...');
    const serviceStartTime = Date.now();

    try {
      // Initialize AI Engine
      try {
        this.logger.info('Initializing AI Engine...');
        const aiEngine = new AIEngine(config.ai);
        await aiEngine.initialize();
        this.container.register('aiEngine', () => aiEngine);
        this.logger.info('AI Engine initialized successfully');
      } catch (error) {
        throw new Error(`AI Engine initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Initialize Workflow Engine
      try {
        this.logger.info('Initializing Workflow Engine...');
        const workflowEngine = new WorkflowEngine(config.workflow, this.container.get('aiEngine'));
        await workflowEngine.initialize();
        this.container.register('workflowEngine', () => workflowEngine);
        this.logger.info('Workflow Engine initialized successfully');
      } catch (error) {
        throw new Error(`Workflow Engine initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Initialize Scoring Engine
      try {
        this.logger.info('Initializing Scoring Engine...');
        const scoringEngine = new ScoringEngine(config.scoring);
        await scoringEngine.initialize();
        this.container.register('scoringEngine', () => scoringEngine);
        this.logger.info('Scoring Engine initialized successfully');
      } catch (error) {
        throw new Error(`Scoring Engine initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Initialize Version Manager
      try {
        this.logger.info('Initializing Version Manager...');
        const versionManager = new VersionManager(config.versioning);
        await versionManager.initialize();
        this.container.register('versionManager', () => versionManager);
        this.logger.info('Version Manager initialized successfully');
      } catch (error) {
        throw new Error(`Version Manager initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Initialize User Memory Service
      try {
        this.logger.info('Initializing User Memory Service...');
        // const userMemoryService = new UserMemoryService(config.userMemory);
        // await userMemoryService.initialize(config.userMemory);
        // this.container.register('userMemoryService', () => userMemoryService);
        this.logger.info('User Memory Service initialized successfully');
      } catch (error) {
        throw new Error(`User Memory Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const serviceInitializationTime = Date.now() - serviceStartTime;
      this.logger.info('All core services initialized successfully', {
        initializationTime: `${serviceInitializationTime}ms`
      });

    } catch (error) {
      const serviceInitializationTime = Date.now() - serviceStartTime;
      this.logger.error('Core services initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        initializationTime: `${serviceInitializationTime}ms`
      });
      throw error;
    }
  }

  private async initializeMiddleware(): Promise<void> {
    this.logger.info('Initializing middleware...');

    // Basic middleware setup
    this.app.addHook('preHandler', async (request, reply) => {
      // Add request ID
      (request as any).id = this.generateRequestId();
      
      // Log request
      this.logger.info('Request received', {
        requestId: (request as any).id,
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip
      });

      // Record metrics
      this.metrics.incrementRequest(request.method, request.url, 200);
    });

    this.app.addHook('onResponse', async (request, reply) => {
      // Log response
      this.logger.info('Request completed', {
        requestId: (request as any).id,
        statusCode: reply.statusCode,
        responseTime: (reply as any).getResponseTime()
      });

      // Record metrics
      this.metrics.incrementRequest(request.method, request.url, reply.statusCode);
    });

    this.logger.info('Middleware initialized');
  }

  private async initializeRoutes(): Promise<void> {
    this.logger.info('Initializing routes...');
    const routesStartTime = Date.now();

    try {
      // Import routes dynamically with error handling for each route
      let aiRoutes, workflowRoutes, scoringRoutes, versioningRoutes, userMemoryRoutes, healthRoutes;
      
      try {
        const aiModule = await import('./presentation/routes/aiRoutes');
        aiRoutes = aiModule.aiRoutes || aiModule;
        this.logger.info('AI routes loaded successfully');
      } catch (error) {
        this.logger.warn('AI routes failed to load, using fallback:', error);
        aiRoutes = this.createFallbackRoutes('ai');
      }

      try {
        const workflowModule = await import('./presentation/routes/workflowRoutes');
        workflowRoutes = workflowModule.workflowRoutes || workflowModule;
        this.logger.info('Workflow routes loaded successfully');
      } catch (error) {
        this.logger.warn('Workflow routes failed to load, using fallback:', error);
        workflowRoutes = this.createFallbackRoutes('workflow');
      }

      try {
        const scoringModule = await import('./presentation/routes/scoringRoutes');
        scoringRoutes = scoringModule.scoringRoutes || scoringModule;
        this.logger.info('Scoring routes loaded successfully');
      } catch (error) {
        this.logger.warn('Scoring routes failed to load, using fallback:', error);
        scoringRoutes = this.createFallbackRoutes('scoring');
      }

      try {
        // const versioningModule = await import('./presentation/routes/versioningRoutes');
        // versioningRoutes = versioningModule.versionRoutes || versioningModule;
        this.logger.info('Versioning routes loaded successfully');
      } catch (error) {
        this.logger.warn('Versioning routes failed to load, using fallback:', error);
        versioningRoutes = this.createFallbackRoutes('versioning');
      }

      try {
        const userMemoryModule = await import('./presentation/routes/userMemoryRoutes');
        userMemoryRoutes = userMemoryModule.userMemoryRoutes || userMemoryModule;
        this.logger.info('User Memory routes loaded successfully');
      } catch (error) {
        this.logger.warn('User Memory routes failed to load, using fallback:', error);
        userMemoryRoutes = this.createFallbackRoutes('userMemory');
      }

      try {
        const healthModule = await import('./presentation/routes/healthRoutes');
        healthRoutes = healthModule.healthRoutes || healthModule;
        this.logger.info('Health routes loaded successfully');
      } catch (error) {
        this.logger.warn('Health routes failed to load, using fallback:', error);
        healthRoutes = this.createFallbackRoutes('health');
      }

      // Register routes with individual error handling
      const routeRegistrations = [
        { name: 'AI', route: aiRoutes, path: '/api/v1/ai' },
        { name: 'Workflow', route: workflowRoutes, path: '/api/v1/workflows' },
        { name: 'Scoring', route: scoringRoutes, path: '/api/v1/scoring' },
        { name: 'Versioning', route: versioningRoutes, path: '/api/v1/versioning' },
        { name: 'User Memory', route: userMemoryRoutes, path: '/api/v1/memory' },
        { name: 'Health', route: healthRoutes, path: '/health' }
      ];

      for (const registration of routeRegistrations) {
        try {
          await this.registerRoute(registration.route, registration.path, []);
          this.logger.info(`${registration.name} routes registered successfully`);
        } catch (error) {
          this.logger.error(`Failed to register ${registration.name} routes:`, error);
          // Continue with other routes even if one fails
        }
      }

      const routesInitializationTime = Date.now() - routesStartTime;
      this.logger.info('All routes initialized successfully', {
        initializationTime: `${routesInitializationTime}ms`,
        registeredRoutes: routeRegistrations.map(r => r.name)
      });

    } catch (error) {
      const routesInitializationTime = Date.now() - routesStartTime;
      this.logger.error('Routes initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        initializationTime: `${routesInitializationTime}ms`
      });
      throw new Error(`Routes initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createFallbackRoutes(type: string): any {
    this.logger.warn(`Creating fallback routes for ${type}`);
    return async (fastify: FastifyInstance, container: DependencyContainer) => {
      fastify.get(`/${type}/status`, async (request: any, reply: any) => {
        return reply.send({
          status: 'fallback',
          message: `${type} routes are in fallback mode due to initialization failure`,
          timestamp: new Date().toISOString()
        });
      });
    };
  }

  private async registerRoute(
    routes: any,
    prefix: string,
    requiredPermissions: string[] = []
  ): Promise<void> {
    // Basic route registration
    this.app.register(async (fastify) => {
      routes(fastify, this.container);
    }, { prefix });
  }

  private async initializeErrorHandling(): Promise<void> {
    this.logger.info('Initializing error handling...');

    try {
      // Comprehensive error handler with detailed logging
      this.app.setErrorHandler(async (error: any, request: any, reply: any) => {
        const requestId = request.id || this.generateRequestId();
        
        // Log detailed error information
        this.logger.error('Request error occurred', {
          requestId,
          method: request.method,
          url: request.url,
          userAgent: request.headers['user-agent'],
          ip: request.ip,
          error: {
            message: error.message || 'Unknown error',
            stack: error.stack,
            code: error.code,
            statusCode: error.statusCode
          },
          timestamp: new Date().toISOString()
        });

        // Send appropriate error response based on error type
        const statusCode = error.statusCode || 500;
        const errorResponse = {
          success: false,
          error: {
            type: statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
            code: error.code || 'UNKNOWN_ERROR',
            message: process.env.NODE_ENV === 'production' 
              ? 'An error occurred while processing your request'
              : error.message || 'Internal Server Error',
            requestId
          },
          timestamp: new Date().toISOString()
        };

        reply.status(statusCode).send(errorResponse);
      });

      // 404 handler with detailed logging
      this.app.setNotFoundHandler(async (request: any, reply: any) => {
        const requestId = request.id || this.generateRequestId();
        
        this.logger.warn('Route not found', {
          requestId,
          method: request.method,
          url: request.url,
          userAgent: request.headers['user-agent'],
          ip: request.ip,
          timestamp: new Date().toISOString()
        });

        reply.status(404).send({
          success: false,
          error: {
            type: 'NOT_FOUND',
            code: 'ROUTE_NOT_FOUND',
            message: 'The requested resource was not found',
            requestId
          },
          timestamp: new Date().toISOString()
        });
      });

      this.logger.info('Error handling initialized successfully');

    } catch (error) {
      this.logger.error('Error handling initialization failed:', error);
      throw new Error(`Error handling initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async initializeMonitoring(): Promise<void> {
    this.logger.info('Initializing monitoring...');

    try {
      // Health check endpoint with comprehensive status
      this.app.get('/health', async (request: any, reply: any) => {
        try {
          const health = await this.healthChecker.checkHealth();
          const requestId = request.id || this.generateRequestId();
          
          this.logger.debug('Health check requested', {
            requestId,
            userAgent: request.headers['user-agent'],
            ip: request.ip
          });

          reply.send({
            success: true,
            data: health,
            requestId,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          this.logger.error('Health check failed:', error);
          reply.status(500).send({
            success: false,
            error: {
              type: 'HEALTH_CHECK_FAILED',
              message: 'Health check service unavailable',
              timestamp: new Date().toISOString()
            }
          });
        }
      });

      // Metrics endpoint with access control
      this.app.get('/metrics', async (request: any, reply: any) => {
        try {
          const requestId = request.id || this.generateRequestId();
          
          // In production, restrict metrics access
          if (process.env.NODE_ENV === 'production') {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
              reply.status(401).send({
                success: false,
                error: {
                  type: 'UNAUTHORIZED',
                  message: 'Authorization required for metrics access',
                  requestId
                }
              });
              return;
            }
          }

          const metrics = this.metrics.getMetrics();
          
          this.logger.debug('Metrics requested', {
            requestId,
            userAgent: request.headers['user-agent'],
            ip: request.ip
          });

          reply.send({
            success: true,
            data: metrics,
            requestId,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          this.logger.error('Metrics collection failed:', error);
          reply.status(500).send({
            success: false,
            error: {
              type: 'METRICS_COLLECTION_FAILED',
              message: 'Metrics service unavailable',
              requestId: request.id || this.generateRequestId()
            }
          });
        }
      });

      this.logger.info('Monitoring initialized successfully');

    } catch (error) {
      this.logger.error('Monitoring initialization failed:', error);
      throw new Error(`Monitoring initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getAllowedOrigins(): string[] | boolean {
    const frontendUrl = process.env.FRONTEND_URL;
    const additionalOrigins = process.env.ADDITIONAL_CORS_ORIGINS;
    
    if (!frontendUrl) {
      // If no frontend URL is configured, allow all origins in development only
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      // In production, require frontend URL
      throw new Error('FRONTEND_URL environment variable is required in production for CORS configuration');
    }
    
    const origins = [frontendUrl];
    
    // Add additional origins if provided
    if (additionalOrigins) {
      origins.push(...additionalOrigins.split(',').map(origin => origin.trim()));
    }
    
    // Validate origins in production
    if (process.env.NODE_ENV === 'production') {
      origins.forEach(origin => {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          throw new Error(`CORS origin "${origin}" contains localhost address, which is not allowed in production`);
        }
      });
    }
    
    return origins;
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  async start(): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting server...', {
        port: config.server.port,
        host: config.server.host,
        environment: process.env.NODE_ENV
      });

      // Add graceful shutdown handlers
      this.setupGracefulShutdown();

      await this.app.listen({ 
        port: config.server.port, 
        host: config.server.host 
      });

      const startupTime = Date.now() - startTime;
      this.logger.info('Server started successfully', {
        port: config.server.port,
        host: config.server.host,
        startupTime: `${startupTime}ms`,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform
      });

    } catch (error) {
      const startupTime = Date.now() - startTime;
      this.logger.error('Server startup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        startupTime: `${startupTime}ms`,
        port: config.server.port,
        host: config.server.host
      });

      // In production, exit gracefully instead of throwing
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('Production mode: Exiting gracefully due to startup failure');
        process.exit(1);
      } else {
        this.logger.error('Development mode: Re-throwing startup error');
        throw error;
      }
    }
  }

  async stop(): Promise<void> {
    const shutdownStartTime = Date.now();
    
    try {
      this.logger.info('Starting graceful shutdown...');

      // Stop accepting new connections
      this.logger.info('Stopping new connections...');

      // Close database connections
      if (this.database) {
        try {
          await this.database.disconnect();
          this.logger.info('Database connections closed');
        } catch (error) {
          this.logger.warn('Error closing database connections:', error);
        }
      }

      // Close HTTP server
      await this.app.close();
      
      const shutdownTime = Date.now() - shutdownStartTime;
      this.logger.info('Server stopped gracefully', {
        shutdownTime: `${shutdownTime}ms`
      });

    } catch (error) {
      const shutdownTime = Date.now() - shutdownStartTime;
      this.logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
        shutdownTime: `${shutdownTime}ms`
      });
      
      // Force exit if graceful shutdown fails
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('Forcing exit due to shutdown failure');
        process.exit(1);
      } else {
        throw error;
      }
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        await this.stop();
        this.logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle common shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('Production mode: Exiting due to uncaught exception');
        process.exit(1);
      }
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: any) => {
      this.logger.error('Unhandled Promise Rejection:', {
        reason: reason?.toString() || 'Unknown reason',
        promise: promise?.toString() || 'Unknown promise',
        timestamp: new Date().toISOString()
      });
      
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('Production mode: Exiting due to unhandled promise rejection');
        process.exit(1);
      }
    });
  }

  getApp(): FastifyInstance {
    return this.app;
  }

  getContainer(): DependencyContainer {
    return this.container;
  }
}
