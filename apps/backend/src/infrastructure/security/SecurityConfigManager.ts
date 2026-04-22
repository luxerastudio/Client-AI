import { SecurityConfig } from '../../domain/security/entities/Security';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface SecurityConfigOptions {
  environment?: 'development' | 'staging' | 'production';
  configPath?: string;
  enableHotReload?: boolean;
  validateConfig?: boolean;
}

export class SecurityConfigManager {
  private config: SecurityConfig;
  private configPath: string;
  private environment: string;
  private hotReloadEnabled: boolean;
  private validationEnabled: boolean;
  private watchers: Map<string, (config: SecurityConfig) => void> = new Map();
  private fileWatcher: any = null;

  constructor(options: SecurityConfigOptions = {}) {
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.configPath = options.configPath || this.getDefaultConfigPath();
    this.hotReloadEnabled = options.enableHotReload || false;
    this.validationEnabled = options.validateConfig !== false;
    
    this.config = this.loadConfig();
    
    if (this.hotReloadEnabled) {
      this.enableHotReload();
    }
  }

  // Configuration loading
  private loadConfig(): SecurityConfig {
    try {
      const configData = this.readConfigFile();
      const config = this.parseConfig(configData);
      
      if (this.validationEnabled) {
        this.validateConfig(config);
      }
      
      return config;
    } catch (error) {
      console.error('Failed to load security configuration:', error);
      return this.getDefaultConfig();
    }
  }

  private async readConfigFile(): Promise<any> {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Config file doesn't exist, create default
        const defaultConfig = this.getDefaultConfig();
        await this.saveConfig(defaultConfig);
        return defaultConfig;
      }
      throw error;
    }
  }

  public parseConfig(configData: any): SecurityConfig {
    // Merge with environment-specific overrides
    const envOverrides = this.getEnvironmentOverrides();
    const mergedConfig = this.mergeConfigs(this.getDefaultConfig(), configData, envOverrides);
    
    return this.applyEnvironmentVariables(mergedConfig);
  }

  private getEnvironmentOverrides(): any {
    const overrides: any = {};
    
    switch (this.environment) {
      case 'development':
        overrides.validation = {
          enabled: true,
          strictMode: false,
          sanitizeInput: true,
          sanitizeOutput: false,
          maxPayloadSize: 10 * 1024 * 1024, // 10MB
          allowedMimeTypes: ['application/json', 'text/plain', 'multipart/form-data']
        };
        overrides.rateLimiting = {
          enabled: false, // Disabled in development
          maxRequests: 1000,
          windowMs: 60000
        };
        overrides.logging = {
          enabled: true,
          logLevel: 'debug',
          logSecurity: true,
          logRequests: true
        };
        break;
        
      case 'staging':
        overrides.validation = {
          enabled: true,
          strictMode: true,
          sanitizeInput: true,
          sanitizeOutput: true,
          maxPayloadSize: 5 * 1024 * 1024, // 5MB
          allowedMimeTypes: ['application/json', 'text/plain']
        };
        overrides.rateLimiting = {
          enabled: true,
          maxRequests: 500,
          windowMs: 60000
        };
        overrides.logging = {
          enabled: true,
          logLevel: 'info',
          logSecurity: true,
          logRequests: true
        };
        break;
        
      case 'production':
        overrides.validation = {
          enabled: true,
          strictMode: true,
          sanitizeInput: true,
          sanitizeOutput: true,
          maxPayloadSize: 2 * 1024 * 1024, // 2MB
          allowedMimeTypes: ['application/json']
        };
        overrides.rateLimiting = {
          enabled: true,
          maxRequests: 100,
          windowMs: 60000
        };
        overrides.logging = {
          enabled: true,
          logLevel: 'warn',
          logSecurity: true,
          logRequests: false
        };
        break;
    }
    
    return overrides;
  }

  private mergeConfigs(...configs: any[]): SecurityConfig {
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, {});
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private applyEnvironmentVariables(config: SecurityConfig): SecurityConfig {
    const envConfig = { ...config };
    
    // Apply environment variable overrides
    if (process.env.SECURITY_RATE_LIMIT_MAX_REQUESTS) {
      envConfig.rateLimiting.maxRequests = parseInt(process.env.SECURITY_RATE_LIMIT_MAX_REQUESTS);
    }
    
    if (process.env.SECURITY_RATE_LIMIT_WINDOW_MS) {
      envConfig.rateLimiting.windowMs = parseInt(process.env.SECURITY_RATE_LIMIT_WINDOW_MS);
    }
    
    if (process.env.SECURITY_MAX_PAYLOAD_SIZE) {
      envConfig.validation.maxPayloadSize = parseInt(process.env.SECURITY_MAX_PAYLOAD_SIZE);
    }
    
    if (process.env.SECURITY_LOG_LEVEL) {
      envConfig.logging.level = process.env.SECURITY_LOG_LEVEL;
    }
    
    if (process.env.SECURITY_CORS_ORIGIN) {
      envConfig.cors.origin = process.env.SECURITY_CORS_ORIGIN === 'true' ? true : 
                            process.env.SECURITY_CORS_ORIGIN === 'false' ? false : 
                            process.env.SECURITY_CORS_ORIGIN.split(',');
    }
    
    return envConfig;
  }

  private getDefaultConfig(): SecurityConfig {
    return {
      validation: {
        enabled: true,
        strictMode: true,
        sanitizeInput: true,
        sanitizeOutput: true,
        maxPayloadSize: 2 * 1024 * 1024, // 2MB
        allowedMimeTypes: ['application/json', 'text/plain']
      },
      rateLimiting: {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000, // 1 minute
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        headers: true
      },
      authentication: {
        enabled: true,
        jwt: {
          secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
          expiresIn: '1h',
          refreshExpiresIn: '7d',
          algorithm: 'HS256'
        },
        apiKeys: {
          enabled: true,
          headerName: 'X-API-Key',
          minLength: 32,
          maxLength: 128
        },
        sessions: {
          enabled: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          rolling: true
        }
      },
      cors: {
        enabled: true,
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
      },
      securityHeaders: {
        enabled: true,
        hidePoweredBy: true,
        xssProtection: true,
        noSniff: true,
        frameguard: 'deny',
        hsts: {
          enabled: true,
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: false
        },
        contentSecurityPolicy: {
          enabled: false,
          policy: "default-src 'self'"
        }
      },
      logging: {
        enabled: true,
        logLevel: 'info',
        logSecurity: true,
        logRequests: false,
        logResponses: false
      }
    };
  }

  private getDefaultConfigPath(): string {
    return join(process.cwd(), 'config', 'security.json');
  }

  // Configuration validation
  private validateConfig(config: SecurityConfig): void {
    const errors: string[] = [];
    
    // Validate validation config
    if (config.validation.maxPayloadSize <= 0) {
      errors.push('validation.maxPayloadSize must be positive');
    }
    
    if (!Array.isArray(config.validation.allowedMimeTypes) || config.validation.allowedMimeTypes.length === 0) {
      errors.push('validation.allowedMimeTypes must be a non-empty array');
    }
    
    // Validate rate limiting config
    if (config.rateLimiting.maxRequests <= 0) {
      errors.push('rateLimiting.maxRequests must be positive');
    }
    
    if (config.rateLimiting.windowMs <= 0) {
      errors.push('rateLimiting.windowMs must be positive');
    }
    
    // Validate authentication config
    if (!config.authentication.jwt.secret || config.authentication.jwt.secret.length < 32) {
      errors.push('authentication.jwt.secret must be at least 32 characters');
    }
    
    if (config.authentication.apiKeys.minLength < 16) {
      errors.push('authentication.apiKeys.minLength must be at least 16');
    }
    
    if (config.authentication.apiKeys.maxLength < config.authentication.apiKeys.minLength) {
      errors.push('authentication.apiKeys.maxLength must be greater than minLength');
    }
    
    // Validate CORS config
    if (config.cors.origin !== false && !Array.isArray(config.cors.origin) && typeof config.cors.origin !== 'string') {
      errors.push('cors.origin must be false, string, or array');
    }
    
    if (!Array.isArray(config.cors.methods) || config.cors.methods.length === 0) {
      errors.push('cors.methods must be a non-empty array');
    }
    
    if (!Array.isArray(config.cors.allowedHeaders) || config.cors.allowedHeaders.length === 0) {
      errors.push('cors.allowedHeaders must be a non-empty array');
    }
    
    // Validate logging config
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(config.logging.logLevel)) {
      errors.push(`logging.logLevel must be one of: ${validLogLevels.join(', ')}`);
    }
    
    if (errors.length > 0) {
      throw new Error(`Security configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  // Configuration management
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  async updateConfig(updates: Partial<SecurityConfig>): Promise<void> {
    const newConfig = this.deepMerge(this.config, updates);
    
    if (this.validationEnabled) {
      this.validateConfig(newConfig);
    }
    
    this.config = newConfig;
    await this.saveConfig(this.config);
    this.notifyWatchers(this.config);
  }

  async resetConfig(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.saveConfig(this.config);
    this.notifyWatchers(this.config);
  }

  async saveConfig(config?: SecurityConfig): Promise<void> {
    const configToSave = config || this.config;
    const configDir = this.configPath.substring(0, this.configPath.lastIndexOf('/'));
    
    // Ensure config directory exists
    await fs.mkdir(configDir, { recursive: true }).catch(() => {});
    
    await fs.writeFile(this.configPath, JSON.stringify(configToSave, null, 2));
  }

  // Hot reload functionality
  private enableHotReload(): void {
    try {
      // In a real implementation, you'd use a file watcher like chokidar
      // For now, we'll just log that hot reload is enabled
      console.log('Security config hot reload enabled');
    } catch (error) {
      console.warn('Failed to enable hot reload:', error);
    }
  }

  private disableHotReload(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
  }

  // Watcher pattern for config changes
  watch(id: string, callback: (config: SecurityConfig) => void): () => void {
    this.watchers.set(id, callback);
    
    // Return unsubscribe function
    return () => {
      this.watchers.delete(id);
    };
  }

  private notifyWatchers(config: SecurityConfig): void {
    this.watchers.forEach(callback => {
      try {
        callback(config);
      } catch (error) {
        console.error('Error in config watcher:', error);
      }
    });
  }

  // Environment management
  setEnvironment(environment: 'development' | 'staging' | 'production'): void {
    this.environment = environment;
    this.config = this.loadConfig();
    this.notifyWatchers(this.config);
  }

  getEnvironment(): string {
    return this.environment;
  }

  // Feature flags
  isFeatureEnabled(feature: string): boolean {
    const featurePath = feature.split('.');
    let value = this.config;
    
    for (const part of featurePath) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return false;
      }
    }
    
    return Boolean(value);
  }

  getFeatureValue(feature: string): any {
    const featurePath = feature.split('.');
    let value = this.config;
    
    for (const part of featurePath) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  // Configuration export/import
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  async importConfig(configJson: string): Promise<void> {
    try {
      const configData = JSON.parse(configJson);
      const config = this.parseConfig(configData);
      
      if (this.validationEnabled) {
        this.validateConfig(config);
      }
      
      this.config = config;
      await this.saveConfig(this.config);
      this.notifyWatchers(this.config);
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  // Configuration templates
  getTemplate(templateName: string): SecurityConfig {
    const templates: Record<string, Partial<SecurityConfig>> = {
      'high-security': {
        validation: {
          strictMode: true,
          sanitizeInput: true,
          sanitizeOutput: true,
          maxPayloadSize: 1024 * 1024, // 1MB
          allowedMimeTypes: ['application/json']
        },
        rateLimiting: {
          maxRequests: 50,
          windowMs: 60000
        },
        securityHeaders: {
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
          },
          contentSecurityPolicy: {
            enabled: true,
            policy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
          }
        }
      },
      'api-focused': {
        validation: {
          allowedMimeTypes: ['application/json', 'application/xml', 'text/plain']
        },
        rateLimiting: {
          maxRequests: 1000,
          windowMs: 60000
        },
        cors: {
          origin: '*',
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With']
        }
      },
      'web-focused': {
        validation: {
          allowedMimeTypes: ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data']
        },
        cors: {
          origin: ['http://localhost:3000'],
          credentials: true
        },
        securityHeaders: {
          contentSecurityPolicy: {
            enabled: true,
            policy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
          }
        }
      }
    };
    
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }
    
    return this.deepMerge(this.getDefaultConfig(), template);
  }

  async applyTemplate(templateName: string): Promise<void> {
    const templateConfig = this.getTemplate(templateName);
    this.config = templateConfig;
    await this.saveConfig(this.config);
    this.notifyWatchers(this.config);
  }

  // Configuration health check
  async healthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check for weak configuration
    if (this.config.authentication.jwt.secret === 'default-secret-change-in-production') {
      issues.push('Using default JWT secret');
      recommendations.push('Change the JWT secret to a secure, random value');
    }
    
    if (this.config.validation.maxPayloadSize > 10 * 1024 * 1024) {
      issues.push('Large payload size limit may affect performance');
      recommendations.push('Consider reducing maxPayloadSize for better performance');
    }
    
    if (this.config.rateLimiting.maxRequests > 1000) {
      issues.push('High rate limit may not provide adequate protection');
      recommendations.push('Consider reducing rate limit for better protection');
    }
    
    if (this.config.cors.origin === '*' && this.environment === 'production') {
      issues.push('Wildcard CORS origin in production');
      recommendations.push('Specify exact allowed origins for production');
    }
    
    if (!this.config.securityHeaders.hsts.enabled) {
      issues.push('HSTS not enabled');
      recommendations.push('Enable HSTS for better security');
    }
    
    if (!this.config.securityHeaders.contentSecurityPolicy.enabled) {
      recommendations.push('Consider enabling CSP for XSS protection');
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  // Configuration migration
  async migrateConfig(fromVersion: string, toVersion: string): Promise<void> {
    const migrations: Record<string, (config: SecurityConfig) => SecurityConfig> = {
      '1.0.0->1.1.0': (config) => {
        // Add new security headers configuration
        return {
          ...config,
          securityHeaders: {
            ...config.securityHeaders,
            contentSecurityPolicy: {
              enabled: false,
              policy: "default-src 'self'"
            }
          }
        };
      },
      '1.1.0->1.2.0': (config) => {
        // Add API key configuration
        return {
          ...config,
          authentication: {
            ...config.authentication,
            apiKeys: {
              enabled: true,
              headerName: 'X-API-Key',
              minLength: 32,
              maxLength: 128
            }
          }
        };
      }
    };
    
    const migrationKey = `${fromVersion}->${toVersion}`;
    const migration = migrations[migrationKey];
    
    if (!migration) {
      throw new Error(`No migration found for ${migrationKey}`);
    }
    
    this.config = migration(this.config);
    await this.saveConfig(this.config);
    this.notifyWatchers(this.config);
  }

  // Cleanup
  destroy(): void {
    this.disableHotReload();
    this.watchers.clear();
  }
}

// Factory functions
export function createSecurityConfigManager(options?: SecurityConfigOptions): SecurityConfigManager {
  return new SecurityConfigManager(options);
}

export function createDevelopmentConfig(): SecurityConfig {
  const manager = new SecurityConfigManager({ environment: 'development' });
  return manager.getConfig();
}

export function createStagingConfig(): SecurityConfig {
  const manager = new SecurityConfigManager({ environment: 'staging' });
  return manager.getConfig();
}

export function createProductionConfig(): SecurityConfig {
  const manager = new SecurityConfigManager({ environment: 'production' });
  return manager.getConfig();
}

// Configuration validation utilities
export async function validateSecurityConfig(config: any): Promise<boolean> {
  try {
    const manager = new SecurityConfigManager({ validateConfig: true });
    await manager.validateConfig(config);
    return true;
  } catch {
    return false;
  }
}

export async function sanitizeSecurityConfig(config: any): Promise<SecurityConfig> {
  const manager = new SecurityConfigManager();
  return await manager.parseConfig(config);
}
