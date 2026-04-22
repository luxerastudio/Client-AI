export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  details?: any;
  duration?: number;
  timestamp: Date;
}

export interface HealthStatus {
  healthy: boolean;
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheck[];
  timestamp: Date;
  uptime: number;
  version: string;
}

export interface HealthCheckFunction {
  (): Promise<HealthCheck>;
}

export class HealthChecker {
  private checks: Map<string, HealthCheckFunction> = new Map();
  private lastStatus: HealthStatus | null = null;
  private startTime: Date = new Date();

  registerCheck(name: string, checkFunction: HealthCheckFunction): void {
    this.checks.set(name, checkFunction);
  }

  unregisterCheck(name: string): void {
    this.checks.delete(name);
  }

  async checkHealth(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];
    let overallHealthy = true;
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    // Run all health checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFunction]) => {
      const startTime = Date.now();
      try {
        const result = await checkFunction();
        result.duration = Date.now() - startTime;
        result.timestamp = new Date();
        return result;
      } catch (error) {
        return {
          name,
          status: 'unhealthy' as const,
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }
    });

    const results = await Promise.all(checkPromises);
    checks.push(...results);

    // Determine overall status
    const unhealthyCount = checks.filter(check => check.status === 'unhealthy').length;
    const degradedCount = checks.filter(check => check.status === 'degraded').length;

    if (unhealthyCount > 0) {
      overallHealthy = false;
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    }

    const status: HealthStatus = {
      healthy: overallHealthy,
      status: overallStatus,
      checks,
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };

    this.lastStatus = status;
    return status;
  }

  async checkReadiness(): Promise<boolean> {
    // Readiness checks - all critical checks must be healthy
    const criticalChecks = ['database', 'ai_engine', 'workflow_engine'];
    
    for (const checkName of criticalChecks) {
      if (this.checks.has(checkName)) {
        const checkFunction = this.checks.get(checkName)!;
        try {
          const result = await checkFunction();
          if (result.status !== 'healthy') {
            return false;
          }
        } catch (error) {
          return false;
        }
      }
    }

    return true;
  }

  async checkLiveness(): Promise<boolean> {
    // Liveness checks - basic application responsiveness
    const startTime = Date.now();
    
    try {
      // Simple liveness check - can we respond quickly?
      await new Promise(resolve => setTimeout(resolve, 1));
      return Date.now() - startTime < 100; // Should respond within 100ms
    } catch (error) {
      return false;
    }
  }

  getLastStatus(): HealthStatus | null {
    return this.lastStatus;
  }

  getRegisteredChecks(): string[] {
    return Array.from(this.checks.keys());
  }

  // Built-in health checks
  static createDatabaseHealthCheck(db: any): HealthCheckFunction {
    return async (): Promise<HealthCheck> => {
      try {
        const result = await db.healthCheck();
        return {
          name: 'database',
          status: result.healthy ? 'healthy' : 'unhealthy',
          details: result.details,
          timestamp: new Date()
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date()
        };
      }
    };
  }

  static createAIEngineHealthCheck(aiEngine: any): HealthCheckFunction {
    return async (): Promise<HealthCheck> => {
      try {
        const result = await aiEngine.healthCheck();
        return {
          name: 'ai_engine',
          status: result.healthy ? 'healthy' : 'unhealthy',
          details: result.details,
          timestamp: new Date()
        };
      } catch (error) {
        return {
          name: 'ai_engine',
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date()
        };
      }
    };
  }

  static createWorkflowEngineHealthCheck(workflowEngine: any): HealthCheckFunction {
    return async (): Promise<HealthCheck> => {
      try {
        const result = await workflowEngine.healthCheck();
        return {
          name: 'workflow_engine',
          status: result.healthy ? 'healthy' : 'unhealthy',
          details: result.details,
          timestamp: new Date()
        };
      } catch (error) {
        return {
          name: 'workflow_engine',
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date()
        };
      }
    };
  }

  static createScoringEngineHealthCheck(scoringEngine: any): HealthCheckFunction {
    return async (): Promise<HealthCheck> => {
      try {
        const result = await scoringEngine.healthCheck();
        return {
          name: 'scoring_engine',
          status: result.healthy ? 'healthy' : 'unhealthy',
          details: result.details,
          timestamp: new Date()
        };
      } catch (error) {
        return {
          name: 'scoring_engine',
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date()
        };
      }
    };
  }

  static createVersionManagerHealthCheck(versionManager: any): HealthCheckFunction {
    return async (): Promise<HealthCheck> => {
      try {
        const result = await versionManager.healthCheck();
        return {
          name: 'version_manager',
          status: result.healthy ? 'healthy' : 'unhealthy',
          details: result.details,
          timestamp: new Date()
        };
      } catch (error) {
        return {
          name: 'version_manager',
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date()
        };
      }
    };
  }

  static createMemoryHealthCheck(): HealthCheckFunction {
    return async (): Promise<HealthCheck> => {
      try {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

        let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
        
        if (heapUsagePercent > 90) {
          status = 'unhealthy';
        } else if (heapUsagePercent > 80) {
          status = 'degraded';
        }

        return {
          name: 'memory',
          status,
          details: {
            heapUsed: `${heapUsedMB.toFixed(2)}MB`,
            heapTotal: `${heapTotalMB.toFixed(2)}MB`,
            heapUsagePercent: `${heapUsagePercent.toFixed(2)}%`,
            external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
            rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`
          },
          timestamp: new Date()
        };
      } catch (error) {
        return {
          name: 'memory',
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date()
        };
      }
    };
  }

  static createCPUHealthCheck(): HealthCheckFunction {
    return async (): Promise<HealthCheck> => {
      try {
        const cpuUsage = process.cpuUsage();
        const userUsage = cpuUsage.user / 1000000; // Convert to seconds
        const systemUsage = cpuUsage.system / 1000000; // Convert to seconds

        // Simple CPU check - if CPU usage is very high, mark as degraded
        const totalUsage = userUsage + systemUsage;
        let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
        
        // This is a very basic check - in production, you'd want more sophisticated CPU monitoring
        if (totalUsage > 10) { // 10 seconds of CPU time seems high
          status = 'degraded';
        }

        return {
          name: 'cpu',
          status,
          details: {
            user: `${userUsage.toFixed(3)}s`,
            system: `${systemUsage.toFixed(3)}s`,
            total: `${totalUsage.toFixed(3)}s`
          },
          timestamp: new Date()
        };
      } catch (error) {
        return {
          name: 'cpu',
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date()
        };
      }
    };
  }

  static createDiskSpaceHealthCheck(path: string = '/'): HealthCheckFunction {
    return async (): Promise<HealthCheck> => {
      try {
        // Mock disk space check - in production, you'd use fs.statSync or similar
        const mockUsage = Math.random() * 100; // Mock disk usage percentage
        
        let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
        
        if (mockUsage > 95) {
          status = 'unhealthy';
        } else if (mockUsage > 85) {
          status = 'degraded';
        }

        return {
          name: 'disk_space',
          status,
          details: {
            path,
            usage: `${mockUsage.toFixed(2)}%`,
            available: 'Mock data'
          },
          timestamp: new Date()
        };
      } catch (error) {
        return {
          name: 'disk_space',
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date()
        };
      }
    };
  }

  static createSecurityHealthCheck(securityConfig: any): HealthCheckFunction {
    return async (): Promise<HealthCheck> => {
      try {
        // Check if security configuration is valid
        const health = await securityConfig.healthCheck();
        
        return {
          name: 'security',
          status: health.healthy ? 'healthy' : 'unhealthy',
          details: health.details,
          timestamp: new Date()
        };
      } catch (error) {
        return {
          name: 'security',
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date()
        };
      }
    };
  }

  // Utility methods
  getUptime(): number {
    return process.uptime();
  }

  getStartTime(): Date {
    return this.startTime;
  }

  reset(): void {
    this.lastStatus = null;
    this.startTime = new Date();
  }
}
