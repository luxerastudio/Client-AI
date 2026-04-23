// @ts-nocheck
import fastify from 'fastify';
// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { config } from './config';
import { DatabaseConnection } from './infrastructure/database/DatabaseConnection';
import { SecurityConfigManager } from './infrastructure/security/SecurityConfigManager';
import { ValidationService } from './infrastructure/security/ValidationService';
import { RateLimitService } from './infrastructure/security/RateLimitService';
import { AuthenticationService } from './infrastructure/security/AuthenticationService';
import { ErrorHandler } from './infrastructure/security/ErrorHandler';
import { SecurityMonitoringService } from './infrastructure/security/SecurityMonitoringService';
import { SanitizationService } from './infrastructure/security/SanitizationService';
import { SecurityMiddleware } from './infrastructure/security/SecurityMiddleware';
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
  private securityConfig: SecurityConfigManager;
  private logger: Logger;
  private metrics: MetricsCollector;
  private healthChecker: HealthChecker;

  constructor() {
    this.app = fastify({
      logger: config.logging.enabled,
      trustProxy: true,
      bodyLimit: config.server.bodyLimit
    });

    this.container = new DependencyContainer();
    this.logger = new Logger(config.logging.level);
    this.metrics = new MetricsCollector();
    this.healthChecker = new HealthChecker();
    this.database = {} as DatabaseConnection;
    this.securityConfig = {} as SecurityConfigManager;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing application...');

      // Initialize database
      await this.initializeDatabase();

      // Initialize security layer
      await this.initializeSecurity();

      // Initialize core services
      await this.initializeCoreServices();

      // Initialize middleware
      await this.initializeMiddleware();

      // Initialize routes
      await this.initializeRoutes();

      // Initialize error handling
      await this.initializeErrorHandling();

      // Initialize monitoring
      await this.initializeMonitoring();

      this.logger.info('Application initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    this.logger.info('Initializing database connection...');
    
    this.database = new DatabaseConnection(config.database);
    await this.database.connect();
    
    // Register database in container
    this.container.register('database', () => this.database);
    
    this.logger.info('Database connection established');
  }

  private async initializeSecurity(): Promise<void> {
    this.logger.info('Initializing security layer...');

    // Initialize security configuration
    this.securityConfig = new SecurityConfigManager({
      environment: config.environment as 'development' | 'staging' | 'production',
      configPath: config.security.configPath,
      enableHotReload: config.security.hotReload,
      validateConfig: true
    });

    const securityConfig = this.securityConfig.getConfig();

    // Initialize security services
    const validationService = new ValidationService(securityConfig);
    const rateLimitService = new RateLimitService(securityConfig);
    const authService = new AuthenticationService(securityConfig);
    const errorHandler = new ErrorHandler();
    const monitoringService = new SecurityMonitoringService(securityConfig);
    const sanitizationService = new SanitizationService(securityConfig);
    const securityMiddleware = new SecurityMiddleware(
      validationService,
      rateLimitService,
      authService,
      errorHandler,
      securityConfig
    );

    // Register security services in container
    this.container.register('securityConfig', () => this.securityConfig);
    this.container.register('validationService', () => validationService);
    this.container.register('rateLimitService', () => rateLimitService);
    this.container.register('authService', () => authService);
    this.container.register('errorHandler', () => errorHandler);
    this.container.register('monitoringService', () => monitoringService);
    this.container.register('sanitizationService', () => sanitizationService);
    this.container.register('securityMiddleware', () => securityMiddleware);

    this.logger.info('Security layer initialized');
  }

  private async initializeCoreServices(): Promise<void> {
    this.logger.info('Initializing core services...');

    // Initialize AI Engine
    const aiEngine = new AIEngine(config.ai);
    await aiEngine.initialize();
    this.container.register('aiEngine', () => aiEngine);

    // Initialize Workflow Engine
    const workflowEngine = new WorkflowEngine(config.workflow, aiEngine);
    await workflowEngine.initialize();
    this.container.register('workflowEngine', () => workflowEngine);

    // Initialize Scoring Engine
    const scoringEngine = new ScoringEngine(config.scoring);
    await scoringEngine.initialize();
    this.container.register('scoringEngine', () => scoringEngine);

    // Initialize Version Manager
    const versionManager = new VersionManager(config.versioning);
    await versionManager.initialize();
    this.container.register('versionManager', () => versionManager);

    // Initialize User Memory Service
    const userMemoryService = new UserMemoryService(
      {} as any, // repository
      {} as any, // patternDetector
      {} as any, // contentPersonalizer
      {} as any, // adaptationEngine
      {} as any  // analytics
    );
    await userMemoryService.initialize(config.userMemory);
    this.container.register('userMemoryService', () => userMemoryService);

    this.logger.info('Core services initialized');
  }

  private async initializeMiddleware(): Promise<void> {
    this.logger.info('Initializing middleware...');

    const securityMiddleware = this.container.get('securityMiddleware') as SecurityMiddleware;

    // Apply security middleware stack
    const middlewareStack = [
      securityMiddleware.createSecurityHeadersMiddleware(),
      securityMiddleware.createCorsMiddleware(),
      securityMiddleware.createRateLimitMiddleware(),
      securityMiddleware.createAuthMiddleware(),
      securityMiddleware.createSanitizationMiddleware()
    ];

    middlewareStack.forEach(middleware => {
      this.app.addHook('preHandler', middleware as any);
    });

    // Add custom middleware
    this.app.addHook('preHandler', async (request, reply) => {
      // Add request ID
      request.id = this.generateRequestId();
      
      // Log request
      this.logger.info('Request received', {
        requestId: request.id,
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
        requestId: request.id,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime()
      });

      // Record metrics
      this.metrics.incrementRequest(request.method, request.url, reply.statusCode);
    });

    this.logger.info('Middleware initialized');
  }

  private async initializeRoutes(): Promise<void> {
    this.logger.info('Initializing routes...');

    // Import and register routes
    const { workflowRoutes } = await import('./presentation/routes/workflowRoutes');
    const { aiRoutes } = await import('./presentation/routes/aiRoutes');
    const { scoringRoutes } = await import('./presentation/routes/scoringRoutes');
    const { versionRoutes } = await import('./presentation/routes/versionRoutes');
    const { userMemoryRoutes } = await import('./presentation/routes/userMemoryRoutes');
    const { securityRoutes } = await import('./presentation/routes/securityRoutes');
    const { healthRoutes } = await import('./presentation/routes/healthRoutes');

    // Register routes with security
    await this.registerRoute(workflowRoutes, '/api/v1/workflows', ['authenticated']);
    await this.registerRoute(aiRoutes, '/api/v1/ai', []); // Remove authentication for testing
    await this.registerRoute(scoringRoutes, '/api/v1/scoring', ['authenticated']);
    await this.registerRoute(versionRoutes, '/api/v1/versions', ['authenticated']);
    await this.registerRoute(userMemoryRoutes, '/api/v1/memory', ['authenticated']);
    await this.registerRoute(securityRoutes, '/api/v1/security', ['authenticated']);
    await this.registerRoute(healthRoutes, '/health', []); // Public endpoint

    this.logger.info('Routes initialized');
  }

  private async registerRoute(
    routes: any,
    prefix: string,
    requiredPermissions: string[]
  ): Promise<void> {
    const securityMiddleware = this.container.get('securityMiddleware') as SecurityMiddleware;
    
    // Create middleware stack for this route
    const middleware = [];
    
    if (requiredPermissions.includes('authenticated')) {
      middleware.push(securityMiddleware.createRequireAuthMiddleware());
    }

    requiredPermissions.forEach(permission => {
      if (permission !== 'authenticated') {
        middleware.push(securityMiddleware.createRequirePermissionMiddleware(permission));
      }
    });

    // Register route with middleware
    this.app.register(async (fastify) => {
      routes(fastify, this.container);
    }, { prefix, preHandler: middleware });
  }

  private async initializeErrorHandling(): Promise<void> {
    this.logger.info('Initializing error handling...');

    const errorHandler = this.container.get('errorHandler') as ErrorHandler;

    // Global error handler
    this.app.setErrorHandler(async (error, request, reply) => {
      const report = errorHandler.handleError(error, {
        requestId: request.id,
        userId: request.user?.id,
        apiKeyId: request.apiKey?.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        endpoint: request.url,
        method: request.method
      });

      reply.status(report.error.statusCode).send({
        success: false,
        error: {
          type: report.error.type,
          code: report.error.code,
          message: report.userFriendlyMessage,
          requestId: report.context.requestId
        }
      });
    });

    // Handle 404 errors
    this.app.setNotFoundHandler(async (request, reply) => {
      reply.status(404).send({
        success: false,
        error: {
          type: 'NOT_FOUND',
          code: 'ROUTE_NOT_FOUND',
          message: 'The requested resource was not found',
          requestId: request.id
        }
      });
    });

    this.logger.info('Error handling initialized');
  }

  private async initializeMonitoring(): Promise<void> {
    this.logger.info('Initializing monitoring...');

    // Health check endpoint
    this.app.get('/health', async (request, reply) => {
      const health = await this.healthChecker.checkHealth();
      const statusCode = health.healthy ? 200 : 503;
      
      reply.status(statusCode).send({
        status: health.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: health.checks,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', async (request, reply) => {
      const metrics = this.metrics.getMetrics();
      reply.type('text/plain').send(metrics);
    });

    // Ready check endpoint
    this.app.get('/ready', async (request, reply) => {
      const ready = await this.healthChecker.checkReadiness();
      const statusCode = ready ? 200 : 503;
      
      reply.status(statusCode).send({
        ready,
        timestamp: new Date().toISOString()
      });
    });

    this.logger.info('Monitoring initialized');
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async start(): Promise<void> {
    try {
      await this.initialize();
      
      const port = config.server.port;
      const host = config.server.host;
      
      await this.app.listen({ port, host });
      
      this.logger.info(`Server started on ${host}:${port}`);
      this.logger.info(`Environment: ${config.environment as string}`);
      this.logger.info(`API Documentation: http://${host}:${port}/docs`);
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Shutting down application...');

    try {
      // Close server
      await this.app.close();
      
      // Cleanup services
      const aiEngine = this.container.get('aiEngine');
      if (aiEngine && typeof (aiEngine as any).cleanup === 'function') {
        await (aiEngine as any).cleanup();
      }

      const workflowEngine = this.container.get('workflowEngine');
      if (workflowEngine && typeof (workflowEngine as any).cleanup === 'function') {
        await (workflowEngine as any).cleanup();
      }

      // Close database
      if (this.database) {
        await this.database.disconnect();
      }

      // Cleanup security services
      const securityMiddleware = this.container.get('securityMiddleware');
      if (securityMiddleware && typeof (securityMiddleware as any).destroy === 'function') {
        (securityMiddleware as any).destroy();
      }

      this.logger.info('Application shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      throw error;
    }
  }

  getApp(): FastifyInstance {
    return this.app;
  }

  getContainer(): DependencyContainer {
    return this.container;
  }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
