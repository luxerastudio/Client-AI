
import * as dotenv from 'dotenv';

// Load environment variables based on environment
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.dev';
dotenv.config({ path: envFile });

export const config = {
  environment: process.env.NODE_ENV || 'development',
  server: {
    host: process.env.HOST || (() => {
      if (process.env.NODE_ENV === 'production') {
        if (!process.env.HOST) throw new Error('HOST environment variable is required in production');
        return process.env.HOST;
      }
      return '0.0.0.0';
    })(),
    port: (() => {
      const port = parseInt(process.env.PORT || '');
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error('PORT environment variable must be a valid port number (1-65535)');
      }
      if (process.env.NODE_ENV === 'production' && !process.env.PORT) {
        throw new Error('PORT environment variable is required in production');
      }
      return port || 3001;
    })(),
    bodyLimit: (() => {
      const limit = parseInt(process.env.BODY_LIMIT || '');
      if (isNaN(limit) || limit < 1024 || limit > 10485760) {
        throw new Error('BODY_LIMIT must be between 1024 and 10485760 bytes');
      }
      return limit || 10485760;
    })(),
    keepAliveTimeout: (() => {
      const timeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT || '');
      if (isNaN(timeout) || timeout < 1000 || timeout > 300000) {
        throw new Error('KEEP_ALIVE_TIMEOUT must be between 1000 and 300000ms');
      }
      return timeout || 65000;
    })()
  },
  database: {
    url: (() => {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error('DATABASE_URL environment variable is required');
      if (process.env.NODE_ENV === 'production' && url.includes('localhost')) {
        throw new Error('DATABASE_URL cannot contain localhost in production');
      }
      return url;
    })(),
    host: process.env.DB_HOST,
    port: (() => {
      const port = parseInt(process.env.DB_PORT || '');
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error('DB_PORT must be a valid port number (1-65535)');
      }
      return port || 5432;
    })(),
    database: (() => {
      const name = process.env.DB_NAME;
      if (!name) throw new Error('DB_NAME environment variable is required');
      return name;
    })(),
    username: (() => {
      const username = process.env.DB_USER;
      if (!username) throw new Error('DB_USER environment variable is required');
      return username;
    })(),
    password: (() => {
      const password = process.env.DB_PASSWORD;
      if (password === undefined) throw new Error('DB_PASSWORD environment variable is required');
      return password;
    })(),
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000')
  },
  ai: {
    provider: (() => {
      const provider = process.env.AI_PROVIDER;
      if (!provider) throw new Error('AI_PROVIDER environment variable is required');
      return provider;
    })(),
    apiKey: (() => {
      const key = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
      if (!key) throw new Error('GROQ_API_KEY environment variable is required');
      return key;
    })(),
    model: (() => {
      const model = process.env.AI_MODEL || 'llama-3.3-70b-versatile';
      return model;
    })(),
    maxTokens: (() => {
      const tokens = parseInt(process.env.AI_MAX_TOKENS || '');
      if (isNaN(tokens) || tokens < 1 || tokens > 32000) {
        throw new Error('AI_MAX_TOKENS must be a valid number between 1 and 32000');
      }
      return tokens;
    })(),
    temperature: (() => {
      const temp = parseFloat(process.env.AI_TEMPERATURE || '');
      if (isNaN(temp) || temp < 0 || temp > 2) {
        throw new Error('AI_TEMPERATURE must be a valid number between 0 and 2');
      }
      return temp;
    })(),
    timeout: (() => {
      const timeout = parseInt(process.env.AI_TIMEOUT || '');
      if (isNaN(timeout) || timeout < 1000 || timeout > 300000) {
        throw new Error('AI_TIMEOUT must be a valid number between 1000 and 300000ms');
      }
      return timeout;
    })(),
    retryAttempts: (() => {
      const attempts = parseInt(process.env.AI_RETRY_ATTEMPTS || '');
      if (isNaN(attempts) || attempts < 1 || attempts > 10) {
        throw new Error('AI_RETRY_ATTEMPTS must be a valid number between 1 and 10');
      }
      return attempts;
    })(),
    rateLimitPerMinute: (() => {
      const limit = parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '');
      if (isNaN(limit) || limit < 1 || limit > 1000) {
        throw new Error('AI_RATE_LIMIT_PER_MINUTE must be a valid number between 1 and 1000');
      }
      return limit;
    })()
  },
  workflow: {
    maxConcurrentWorkflows: (() => {
      const value = parseInt(process.env.MAX_CONCURRENT_WORKFLOWS || '');
      if (isNaN(value) || value < 1 || value > 100) {
        throw new Error('MAX_CONCURRENT_WORKFLOWS must be a valid number between 1 and 100');
      }
      return value;
    })(),
    defaultTimeout: (() => {
      const value = parseInt(process.env.WORKFLOW_DEFAULT_TIMEOUT || '');
      if (isNaN(value) || value < 60000 || value > 600000) {
        throw new Error('WORKFLOW_DEFAULT_TIMEOUT must be a valid number between 60000 and 600000ms');
      }
      return value;
    })(),
    maxSteps: (() => {
      const value = parseInt(process.env.WORKFLOW_MAX_STEPS || '');
      if (isNaN(value) || value < 1 || value > 1000) {
        throw new Error('WORKFLOW_MAX_STEPS must be a valid number between 1 and 1000');
      }
      return value;
    })(),
    checkpointInterval: (() => {
      const value = parseInt(process.env.WORKFLOW_CHECKPOINT_INTERVAL || '');
      if (isNaN(value) || value < 1000 || value > 60000) {
        throw new Error('WORKFLOW_CHECKPOINT_INTERVAL must be a valid number between 1000 and 60000ms');
      }
      return value;
    })(),
    enablePersistence: process.env.WORKFLOW_ENABLE_PERSISTENCE === 'true',
    storagePath: (() => {
      const path = process.env.WORKFLOW_STORAGE_PATH;
      if (!path) throw new Error('WORKFLOW_STORAGE_PATH environment variable is required');
      if (process.env.NODE_ENV === 'production' && path.includes('./')) {
        throw new Error('WORKFLOW_STORAGE_PATH cannot be relative path in production');
      }
      return path;
    })()
  },
  scoring: {
    algorithm: (() => {
      const algo = process.env.SCORING_ALGORITHM;
      if (!algo || !['weighted', 'exponential'].includes(algo)) {
        throw new Error('SCORING_ALGORITHM must be either "weighted" or "exponential"');
      }
      return algo;
    })(),
    weights: {
      relevance: (() => {
        const value = parseFloat(process.env.SCORING_WEIGHT_RELEVANCE || '');
        if (isNaN(value) || value < 0 || value > 1) {
          throw new Error('SCORING_WEIGHT_RELEVANCE must be a valid number between 0 and 1');
        }
        return value;
      })(),
      quality: (() => {
        const value = parseFloat(process.env.SCORING_WEIGHT_QUALITY || '');
        if (isNaN(value) || value < 0 || value > 1) {
          throw new Error('SCORING_WEIGHT_QUALITY must be a valid number between 0 and 1');
        }
        return value;
      })(),
      engagement: (() => {
        const value = parseFloat(process.env.SCORING_WEIGHT_ENGAGEMENT || '');
        if (isNaN(value) || value < 0 || value > 1) {
          throw new Error('SCORING_WEIGHT_ENGAGEMENT must be a valid number between 0 and 1');
        }
        return value;
      })(),
      conversion: (() => {
        const value = parseFloat(process.env.SCORING_WEIGHT_CONVERSION || '');
        if (isNaN(value) || value < 0 || value > 1) {
          throw new Error('SCORING_WEIGHT_CONVERSION must be a valid number between 0 and 1');
        }
        return value;
      })()
    },
    cacheEnabled: process.env.SCORING_CACHE_ENABLED === 'true',
    cacheTTL: (() => {
      const value = parseInt(process.env.SCORING_CACHE_TTL || '');
      if (isNaN(value) || value < 60000 || value > 86400000) {
        throw new Error('SCORING_CACHE_TTL must be a valid number between 60000 and 86400000ms');
      }
      return value;
    })(),
    batchSize: (() => {
      const value = parseInt(process.env.SCORING_BATCH_SIZE || '');
      if (isNaN(value) || value < 1 || value > 10000) {
        throw new Error('SCORING_BATCH_SIZE must be a valid number between 1 and 10000');
      }
      return value;
    })()
  },
  versioning: {
    enabled: process.env.VERSIONING_ENABLED === 'true',
    maxVersions: (() => {
      const value = parseInt(process.env.VERSIONING_MAX_VERSIONS || '');
      if (isNaN(value) || value < 1 || value > 1000) {
        throw new Error('VERSIONING_MAX_VERSIONS must be a valid number between 1 and 1000');
      }
      return value;
    })(),
    autoVersioning: process.env.VERSIONING_AUTO_VERSIONING === 'true',
    storagePath: (() => {
      const path = process.env.VERSIONING_STORAGE_PATH;
      if (!path) throw new Error('VERSIONING_STORAGE_PATH environment variable is required');
      if (process.env.NODE_ENV === 'production' && path.includes('./')) {
        throw new Error('VERSIONING_STORAGE_PATH cannot be relative path in production');
      }
      return path;
    })(),
    compressionEnabled: process.env.VERSIONING_COMPRESSION_ENABLED === 'true'
  },
  userMemory: {
    maxPromptHistory: (() => {
      const value = parseInt(process.env.USER_MEMORY_MAX_PROMPT_HISTORY || '');
      if (isNaN(value) || value < 1 || value > 10000) {
        throw new Error('USER_MEMORY_MAX_PROMPT_HISTORY must be a valid number between 1 and 10000');
      }
      return value;
    })(),
    maxInteractionHistory: (() => {
      const value = parseInt(process.env.USER_MEMORY_MAX_INTERACTION_HISTORY || '');
      if (isNaN(value) || value < 1 || value > 50000) {
        throw new Error('USER_MEMORY_MAX_INTERACTION_HISTORY must be a valid number between 1 and 50000');
      }
      return value;
    })(),
    patternDetectionThreshold: (() => {
      const value = parseFloat(process.env.USER_MEMORY_PATTERN_DETECTION_THRESHOLD || '');
      if (isNaN(value) || value < 0 || value > 1) {
        throw new Error('USER_MEMORY_PATTERN_DETECTION_THRESHOLD must be a valid number between 0 and 1');
      }
      return value;
    })(),
    adaptationConfidenceThreshold: (() => {
      const value = parseFloat(process.env.USER_MEMORY_ADAPTATION_CONFIDENCE_THRESHOLD || '');
      if (isNaN(value) || value < 0 || value > 1) {
        throw new Error('USER_MEMORY_ADAPTATION_CONFIDENCE_THRESHOLD must be a valid number between 0 and 1');
      }
      return value;
    })(),
    personalizationEnabled: process.env.USER_MEMORY_PERSONALIZATION_ENABLED === 'true',
    autoAdaptation: process.env.USER_MEMORY_AUTO_ADAPTATION === 'true',
    retentionPeriod: (() => {
      const value = parseInt(process.env.USER_MEMORY_RETENTION_PERIOD || '');
      if (isNaN(value) || value < 86400000 || value > 31536000000) {
        throw new Error('USER_MEMORY_RETENTION_PERIOD must be a valid number between 86400000 and 31536000000ms');
      }
      return value;
    })(),
    storagePath: (() => {
      const path = process.env.USER_MEMORY_STORAGE_PATH;
      if (!path) throw new Error('USER_MEMORY_STORAGE_PATH environment variable is required');
      if (process.env.NODE_ENV === 'production' && path.includes('./')) {
        throw new Error('USER_MEMORY_STORAGE_PATH cannot be relative path in production');
      }
      return path;
    })()
  },
  security: {
    configPath: (() => {
      const path = process.env.SECURITY_CONFIG_PATH;
      if (!path) throw new Error('SECURITY_CONFIG_PATH environment variable is required');
      if (process.env.NODE_ENV === 'production' && path.includes('./')) {
        throw new Error('SECURITY_CONFIG_PATH cannot be relative path in production');
      }
      return path;
    })(),
    hotReload: process.env.SECURITY_HOT_RELOAD === 'true'
  },
  logging: {
    enabled: process.env.LOGGING_ENABLED === 'true',
    level: (() => {
      const level = process.env.LOG_LEVEL;
      if (!level || !['debug', 'info', 'warn', 'error'].includes(level)) {
        throw new Error('LOG_LEVEL must be one of: debug, info, warn, error');
      }
      return level;
    })(),
    format: (() => {
      const format = process.env.LOG_FORMAT;
      if (!format || !['json', 'text'].includes(format)) {
        throw new Error('LOG_FORMAT must be either "json" or "text"');
      }
      return format;
    })(),
    fileEnabled: process.env.LOG_FILE_ENABLED === 'true',
    filePath: (() => {
      const path = process.env.LOG_FILE_PATH;
      if (!path) throw new Error('LOG_FILE_PATH environment variable is required');
      if (process.env.NODE_ENV === 'production' && path.includes('./')) {
        throw new Error('LOG_FILE_PATH cannot be relative path in production');
      }
      return path;
    })(),
    maxFileSize: (() => {
      const size = parseInt(process.env.LOG_MAX_FILE_SIZE || '');
      if (isNaN(size) || size < 1048576 || size > 104857600) {
        throw new Error('LOG_MAX_FILE_SIZE must be between 1048576 and 104857600 bytes');
      }
      return size;
    })(),
    maxFiles: (() => {
      const files = parseInt(process.env.LOG_MAX_FILES || '');
      if (isNaN(files) || files < 1 || files > 100) {
        throw new Error('LOG_MAX_FILES must be between 1 and 100');
      }
      return files;
    })(),
    consoleEnabled: process.env.LOG_CONSOLE_ENABLED !== 'false'
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    port: (() => {
      const port = parseInt(process.env.METRICS_PORT || '');
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error('METRICS_PORT must be a valid port number (1-65535)');
      }
      return port || 9090;
    })(),
    path: (() => {
      const path = process.env.METRICS_PATH;
      if (!path) throw new Error('METRICS_PATH environment variable is required');
      return path;
    })(),
    collectDefaultMetrics: process.env.METRICS_COLLECT_DEFAULT === 'true',
    collectInterval: (() => {
      const interval = parseInt(process.env.METRICS_COLLECT_INTERVAL || '');
      if (isNaN(interval) || interval < 1000 || interval > 300000) {
        throw new Error('METRICS_COLLECT_INTERVAL must be between 1000 and 300000ms');
      }
      return interval;
    })()
  },
  redis: {
    url: (() => {
      const url = process.env.REDIS_URL;
      if (!url) throw new Error('REDIS_URL environment variable is required');
      if (process.env.NODE_ENV === 'production' && url.includes('localhost')) {
        throw new Error('REDIS_URL cannot contain localhost in production');
      }
      return url;
    })(),
    host: process.env.REDIS_HOST,
    port: (() => {
      const port = parseInt(process.env.REDIS_PORT || '');
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error('REDIS_PORT must be a valid port number (1-65535)');
      }
      return port || 6379;
    })(),
    password: (() => {
      const password = process.env.REDIS_PASSWORD;
      if (password === undefined) throw new Error('REDIS_PASSWORD environment variable is required');
      return password;
    })(),
    db: (() => {
      const db = parseInt(process.env.REDIS_DB || '');
      if (isNaN(db) || db < 0 || db > 15) {
        throw new Error('REDIS_DB must be a valid number between 0 and 15');
      }
      return db;
    })(),
    keyPrefix: (() => {
      const prefix = process.env.REDIS_KEY_PREFIX;
      if (!prefix) throw new Error('REDIS_KEY_PREFIX environment variable is required');
      return prefix;
    })(),
    maxRetries: (() => {
      const retries = parseInt(process.env.REDIS_MAX_RETRIES || '');
      if (isNaN(retries) || retries < 0 || retries > 10) {
        throw new Error('REDIS_MAX_RETRIES must be between 0 and 10');
      }
      return retries;
    })(),
    retryDelay: (() => {
      const delay = parseInt(process.env.REDIS_RETRY_DELAY || '');
      if (isNaN(delay) || delay < 100 || delay > 10000) {
        throw new Error('REDIS_RETRY_DELAY must be between 100 and 10000ms');
      }
      return delay;
    })()
  },
  cache: {
    provider: (() => {
      const provider = process.env.CACHE_PROVIDER;
      if (!provider || !['redis', 'memory'].includes(provider)) {
        throw new Error('CACHE_PROVIDER must be either "redis" or "memory"');
      }
      return provider;
    })(),
    ttl: (() => {
      const ttl = parseInt(process.env.CACHE_TTL || '');
      if (isNaN(ttl) || ttl < 60000 || ttl > 86400000) {
        throw new Error('CACHE_TTL must be between 60000 and 86400000ms');
      }
      return ttl;
    })(),
    maxSize: (() => {
      const size = parseInt(process.env.CACHE_MAX_SIZE || '');
      if (isNaN(size) || size < 100 || size > 100000) {
        throw new Error('CACHE_MAX_SIZE must be between 100 and 100000');
      }
      return size;
    })(),
    checkPeriod: (() => {
      const period = parseInt(process.env.CACHE_CHECK_PERIOD || '');
      if (isNaN(period) || period < 60000 || period > 3600000) {
        throw new Error('CACHE_CHECK_PERIOD must be between 60000 and 3600000ms');
      }
      return period;
    })()
  }
};

// Production-safe validation
function validateConfig(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Critical environment variables for all environments
  const criticalEnvVars = [
    'GROQ_API_KEY',
    'DATABASE_URL',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
  ];

  // Additional production-only requirements
  const productionOnlyVars = [
    'HOST',
    'PORT',
    'WORKFLOW_STORAGE_PATH',
    'VERSIONING_STORAGE_PATH',
    'USER_MEMORY_STORAGE_PATH',
    'SECURITY_CONFIG_PATH',
    'LOG_FILE_PATH',
    'METRICS_PATH',
    'REDIS_URL',
    'REDIS_PASSWORD',
    'REDIS_KEY_PREFIX',
    'CACHE_PROVIDER'
  ];

  const requiredEnvVars = isProduction 
    ? [...criticalEnvVars, ...productionOnlyVars]
    : criticalEnvVars;

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    if (isProduction) {
      throw new Error(`CRITICAL: Missing required environment variables for production: ${missingVars.join(', ')}. Server cannot start without these variables.`);
    } else {
      console.warn(`Warning: Missing recommended environment variables: ${missingVars.join(', ')}`);
      console.warn('Set these variables for production deployment.');
    }
  }

  // Production-specific security validations
  if (isProduction) {
    // Ensure no localhost URLs in production
    const localhostUrls = [
      process.env.DATABASE_URL,
      process.env.REDIS_URL,
      process.env.FRONTEND_URL
    ].filter(url => url && url.includes('localhost'));

    if (localhostUrls.length > 0) {
      throw new Error(`CRITICAL: Localhost URLs detected in production environment. This is a security risk. URLs: ${localhostUrls.join(', ')}`);
    }

    // Ensure SSL is enabled for database in production
    if (process.env.DB_SSL !== 'true') {
      throw new Error('CRITICAL: DB_SSL must be "true" in production for secure database connections.');
    }

    // Ensure logging is enabled in production
    if (process.env.LOGGING_ENABLED !== 'true') {
      throw new Error('CRITICAL: LOGGING_ENABLED must be "true" in production for monitoring and debugging.');
    }
  }

  // Validate configuration consistency
  if (config.scoring.weights.relevance + config.scoring.weights.quality + 
      config.scoring.weights.engagement + config.scoring.weights.conversion !== 1.0) {
    throw new Error('CRITICAL: Scoring weights must sum to 1.0. Current sum: ' + 
      (config.scoring.weights.relevance + config.scoring.weights.quality + 
       config.scoring.weights.engagement + config.scoring.weights.conversion));
  }
}

// Validate configuration on import with error handling
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error instanceof Error ? error.message : error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.warn('Configuration validation failed in development mode. Server may not function correctly.');
  }
}

export default config;
