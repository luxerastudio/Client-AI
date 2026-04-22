import { config } from '../../config';

export interface Metric {
  name: string;
  value: number | number[];
  labels?: Record<string, string>;
  timestamp: Date;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface MetricFamily {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  metrics: Metric[];
}

export class MetricsCollector {
  private metrics: Map<string, MetricFamily> = new Map();
  private config: any;
  private collectInterval?: NodeJS.Timeout;

  constructor(metricsConfig?: any) {
    this.config = metricsConfig || config.metrics;
    
    if (this.config.enabled) {
      this.initializeDefaultMetrics();
      this.startCollection();
    }
  }

  private initializeDefaultMetrics(): void {
    // HTTP request counter
    this.registerMetric('http_requests_total', 'counter', 'Total number of HTTP requests');
    
    // Response time histogram
    this.registerMetric('http_request_duration_seconds', 'histogram', 'HTTP request duration in seconds');
    
    // Active connections gauge
    this.registerMetric('active_connections', 'gauge', 'Number of active connections');
    
    // AI operations counter
    this.registerMetric('ai_operations_total', 'counter', 'Total number of AI operations');
    
    // Workflow executions counter
    this.registerMetric('workflow_executions_total', 'counter', 'Total number of workflow executions');
    
    // Scoring operations counter
    this.registerMetric('scoring_operations_total', 'counter', 'Total number of scoring operations');
    
    // Memory usage gauge
    this.registerMetric('memory_usage_bytes', 'gauge', 'Memory usage in bytes');
    
    // CPU usage gauge
    this.registerMetric('cpu_usage_percent', 'gauge', 'CPU usage percentage');
  }

  private startCollection(): void {
    if (this.config.collectDefaultMetrics) {
      this.collectInterval = setInterval(() => {
        this.collectSystemMetrics();
      }, this.config.collectInterval);
    }
  }

  registerMetric(name: string, type: 'counter' | 'gauge' | 'histogram' | 'summary', help: string): void {
    if (this.metrics.has(name)) {
      return; // Already registered
    }

    const metricFamily: MetricFamily = {
      name,
      type,
      help,
      metrics: []
    };

    this.metrics.set(name, metricFamily);
  }

  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const metricFamily = this.metrics.get(name);
    if (!metricFamily || metricFamily.type !== 'counter') {
      return;
    }

    const existingMetric = metricFamily.metrics.find(m => 
      this.matchLabels(m.labels, labels)
    );

    if (existingMetric) {
      if (typeof existingMetric.value === 'number') {
        existingMetric.value += value;
      }
      existingMetric.timestamp = new Date();
    } else {
      metricFamily.metrics.push({
        name,
        value,
        labels,
        timestamp: new Date(),
        type: 'counter'
      });
    }
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metricFamily = this.metrics.get(name);
    if (!metricFamily || metricFamily.type !== 'gauge') {
      return;
    }

    const existingMetric = metricFamily.metrics.find(m => 
      this.matchLabels(m.labels, labels)
    );

    if (existingMetric) {
      existingMetric.value = value;
      existingMetric.timestamp = new Date();
    } else {
      metricFamily.metrics.push({
        name,
        value,
        labels,
        timestamp: new Date(),
        type: 'gauge'
      });
    }
  }

  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const metricFamily = this.metrics.get(name);
    if (!metricFamily || metricFamily.type !== 'histogram') {
      return;
    }

    const existingMetric = metricFamily.metrics.find(m => 
      this.matchLabels(m.labels, labels)
    );

    if (existingMetric) {
      // For histograms, we store the value as an array of observations
      if (!Array.isArray(existingMetric.value)) {
        existingMetric.value = [];
      }
      existingMetric.value.push(value);
      existingMetric.timestamp = new Date();
    } else {
      metricFamily.metrics.push({
        name,
        value: [value],
        labels,
        timestamp: new Date(),
        type: 'histogram'
      });
    }
  }

  recordResponseTime(method: string, path: string, duration: number): void {
    this.observeHistogram('http_request_duration_seconds', duration / 1000, {
      method,
      path
    });
  }

  incrementRequest(method: string, path: string, statusCode: number): void {
    this.incrementCounter('http_requests_total', {
      method,
      path,
      status_code: statusCode.toString()
    });
  }

  incrementAIOperation(provider: string, model: string, operation: string): void {
    this.incrementCounter('ai_operations_total', {
      provider,
      model,
      operation
    });
  }

  incrementWorkflowExecution(workflowId: string, status: string): void {
    this.incrementCounter('workflow_executions_total', {
      workflow_id: workflowId,
      status
    });
  }

  incrementScoringOperation(algorithm: string, entityType: string): void {
    this.incrementCounter('scoring_operations_total', {
      algorithm,
      entity_type: entityType
    });
  }

  private collectSystemMetrics(): void {
    // Memory usage
    const memUsage = process.memoryUsage();
    this.setGauge('memory_usage_bytes', memUsage.heapUsed, { type: 'heap' });
    this.setGauge('memory_usage_bytes', memUsage.external, { type: 'external' });
    this.setGauge('memory_usage_bytes', memUsage.rss, { type: 'rss' });

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    this.setGauge('cpu_usage_percent', cpuUsage.user / 1000000, { type: 'user' });
    this.setGauge('cpu_usage_percent', cpuUsage.system / 1000000, { type: 'system' });

    // Active connections (placeholder - would need actual connection tracking)
    this.setGauge('active_connections', 0, { type: 'http' });
  }

  private matchLabels(labels1?: Record<string, string>, labels2?: Record<string, string>): boolean {
    if (!labels1 && !labels2) return true;
    if (!labels1 || !labels2) return false;
    
    const keys1 = Object.keys(labels1);
    const keys2 = Object.keys(labels2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => labels1[key] === labels2[key]);
  }

  getMetrics(): string {
    if (!this.config.enabled) {
      return '# Metrics collection is disabled\n';
    }

    const output: string[] = [];

    for (const metricFamily of this.metrics.values()) {
      output.push(`# HELP ${metricFamily.name} ${metricFamily.help}`);
      output.push(`# TYPE ${metricFamily.name} ${metricFamily.type}`);

      for (const metric of metricFamily.metrics) {
        const labelsStr = this.formatLabels(metric.labels);
        const valueStr = this.formatValue(metric);
        output.push(`${metricFamily.name}${labelsStr} ${valueStr}`);
      }
    }

    return output.join('\n') + '\n';
  }

  private formatLabels(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }

    const labelPairs = Object.entries(labels)
      .map(([key, value]) => `${key}="${this.escapeLabelValue(value)}"`)
      .join(',');

    return `{${labelPairs}}`;
  }

  private formatValue(metric: Metric): string {
    if (metric.type === 'histogram' && Array.isArray(metric.value)) {
      // For histograms, calculate basic statistics
      const values = metric.value as number[];
      const count = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = count > 0 ? sum / count : 0;
      
      return `${count}_${mean.toFixed(3)}`;
    }

    return metric.value.toString();
  }

  private escapeLabelValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  getMetricFamily(name: string): MetricFamily | undefined {
    return this.metrics.get(name);
  }

  getAllMetricFamilies(): Map<string, MetricFamily> {
    return new Map(this.metrics);
  }

  reset(): void {
    for (const metricFamily of this.metrics.values()) {
      metricFamily.metrics = [];
    }
  }

  removeMetric(name: string): boolean {
    return this.metrics.delete(name);
  }

  // Health check
  healthCheck(): { healthy: boolean; details: any } {
    return {
      healthy: this.config.enabled,
      details: {
        enabled: this.config.enabled,
        metricCount: this.metrics.size,
        totalMetrics: Array.from(this.metrics.values())
          .reduce((sum, family) => sum + family.metrics.length, 0),
        collectInterval: this.config.collectInterval,
        collectDefaultMetrics: this.config.collectDefaultMetrics
      }
    };
  }

  getStats(): any {
    const stats = {
      enabled: this.config.enabled,
      metricFamilies: this.metrics.size,
      totalMetrics: 0,
      metricsByType: {
        counter: 0,
        gauge: 0,
        histogram: 0,
        summary: 0
      }
    };

    for (const metricFamily of this.metrics.values()) {
      stats.totalMetrics += metricFamily.metrics.length;
      stats.metricsByType[metricFamily.type] += metricFamily.metrics.length;
    }

    return stats;
  }

  stop(): void {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = undefined;
    }
  }
}

// Singleton instance
const metricsCollector = new MetricsCollector();

export default metricsCollector;
