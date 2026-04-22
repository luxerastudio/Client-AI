import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  environment: process.env.NODE_ENV || 'development',
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '3001'),
    bodyLimit: parseInt(process.env.BODY_LIMIT || '10485760'), // 10MB
    keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '65000')
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_saas',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'agency_in_a_box',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000')
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    timeout: parseInt(process.env.AI_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS || '3'),
    rateLimitPerMinute: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '60')
  },
  workflow: {
    maxConcurrentWorkflows: parseInt(process.env.MAX_CONCURRENT_WORKFLOWS || '10'),
    defaultTimeout: parseInt(process.env.WORKFLOW_DEFAULT_TIMEOUT || '300000'), // 5 minutes
    maxSteps: parseInt(process.env.WORKFLOW_MAX_STEPS || '50'),
    checkpointInterval: parseInt(process.env.WORKFLOW_CHECKPOINT_INTERVAL || '10000'),
    enablePersistence: process.env.WORKFLOW_ENABLE_PERSISTENCE === 'true',
    storagePath: process.env.WORKFLOW_STORAGE_PATH || './data/workflows'
  },
  scoring: {
    algorithm: process.env.SCORING_ALGORITHM || 'weighted',
    weights: {
      relevance: parseFloat(process.env.SCORING_WEIGHT_RELEVANCE || '0.4'),
      quality: parseFloat(process.env.SCORING_WEIGHT_QUALITY || '0.3'),
      engagement: parseFloat(process.env.SCORING_WEIGHT_ENGAGEMENT || '0.2'),
      conversion: parseFloat(process.env.SCORING_WEIGHT_CONVERSION || '0.1')
    },
    cacheEnabled: process.env.SCORING_CACHE_ENABLED === 'true',
    cacheTTL: parseInt(process.env.SCORING_CACHE_TTL || '3600000'), // 1 hour
    batchSize: parseInt(process.env.SCORING_BATCH_SIZE || '100')
  },
  versioning: {
    enabled: process.env.VERSIONING_ENABLED === 'true',
    maxVersions: parseInt(process.env.VERSIONING_MAX_VERSIONS || '100'),
    autoVersioning: process.env.VERSIONING_AUTO_VERSIONING === 'true',
    storagePath: process.env.VERSIONING_STORAGE_PATH || './data/versions',
    compressionEnabled: process.env.VERSIONING_COMPRESSION_ENABLED === 'true'
  },
  userMemory: {
    maxPromptHistory: parseInt(process.env.USER_MEMORY_MAX_PROMPT_HISTORY || '1000'),
    maxInteractionHistory: parseInt(process.env.USER_MEMORY_MAX_INTERACTION_HISTORY || '500'),
    patternDetectionThreshold: parseFloat(process.env.USER_MEMORY_PATTERN_DETECTION_THRESHOLD || '0.7'),
    adaptationConfidenceThreshold: parseFloat(process.env.USER_MEMORY_ADAPTATION_CONFIDENCE_THRESHOLD || '0.8'),
    personalizationEnabled: process.env.USER_MEMORY_PERSONALIZATION_ENABLED === 'true',
    autoAdaptation: process.env.USER_MEMORY_AUTO_ADAPTATION === 'true',
    retentionPeriod: parseInt(process.env.USER_MEMORY_RETENTION_PERIOD || '7776000000'), // 90 days
    storagePath: process.env.USER_MEMORY_STORAGE_PATH || './data/user-memory'
  },
  security: {
    configPath: process.env.SECURITY_CONFIG_PATH || './config/security.json',
    hotReload: process.env.SECURITY_HOT_RELOAD === 'true'
  },
  logging: {
    enabled: process.env.LOGGING_ENABLED === 'true',
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    fileEnabled: process.env.LOG_FILE_ENABLED === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
    maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'), // 10MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
    consoleEnabled: process.env.LOG_CONSOLE_ENABLED !== 'false'
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    port: parseInt(process.env.METRICS_PORT || '9090'),
    path: process.env.METRICS_PATH || '/metrics',
    collectDefaultMetrics: process.env.METRICS_COLLECT_DEFAULT === 'true',
    collectInterval: parseInt(process.env.METRICS_COLLECT_INTERVAL || '10000')
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'agency:',
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000')
  },
  cache: {
    provider: process.env.CACHE_PROVIDER || 'redis',
    ttl: parseInt(process.env.CACHE_TTL || '3600000'), // 1 hour
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '600000') // 10 minutes
  }
};

// Validation
function validateConfig(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'JWT_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Warning: Missing recommended environment variables: ${missingVars.join(', ')}`);
    console.warn('Using default values for development. Set these variables for production.');
  }

  // Validate numeric values
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error('Invalid PORT value. Must be between 1 and 65535.');
  }

  if (config.ai.maxTokens < 1 || config.ai.maxTokens > 32000) {
    throw new Error('Invalid AI_MAX_TOKENS value. Must be between 1 and 32000.');
  }

  if (config.ai.temperature < 0 || config.ai.temperature > 2) {
    throw new Error('Invalid AI_TEMPERATURE value. Must be between 0 and 2.');
  }
}

// Validate configuration on import
validateConfig();

export default config;
