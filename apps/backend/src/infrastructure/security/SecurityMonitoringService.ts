import { 
  ISecurityMonitoringService,
  SecurityEventSchema,
  SecurityContext,
  SecurityMetricsSchema,
  ThreatDetectionSchema,
  ThreatLevel,
  SecurityEventTypeEnum,
  ThreatTypeEnum
} from '@/domain/security/entities/Security';
import { ErrorHandler, ErrorReport } from './ErrorHandler';
import { SecurityConfig } from '@/domain/security/entities/Security';

export class SecurityMonitoringService implements ISecurityMonitoringService {
  private events: any[] = [];
  private threats: any[] = [];
  private metrics: any[] = [];
  private alertCallbacks: ((threat: any) => void)[] = [];
  private config: SecurityConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.startMonitoring();
  }

  async logEvent(event: Omit<any, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent = SecurityEventSchema.parse({
      ...event,
      id: this.generateId(),
      timestamp: new Date()
    });

    this.events.push(securityEvent);

    // Check for immediate threats
    await this.checkForThreats(securityEvent);

    // Log if enabled
    if (this.config.logging.logSecurity) {
      this.logSecurityEvent(securityEvent);
    }
  }

  async getEvents(filters?: Partial<any>): Promise<any[]> {
    return this.events.filter(event => {
      if (filters?.type && event.type !== filters.type) return false;
      if (filters?.severity && event.severity !== filters.severity) return false;
      if (filters?.userId && event.userId !== filters.userId) return false;
      if (filters?.startDate && event.timestamp < filters.startDate) return false;
      if (filters?.endDate && event.timestamp > filters.endDate) return false;
      return true;
    });
  }

  async detectAnomalies(context: SecurityContext, request: any): Promise<any[]> {
    const anomalies: any[] = [];

    // Check for suspicious patterns
    const suspiciousPatterns = await this.detectSuspiciousPatterns(context, request);
    anomalies.push(...suspiciousPatterns);

    // Check for rate limit violations
    const rateLimitAnomalies = await this.detectRateLimitAnomalies(context, request);
    anomalies.push(...rateLimitAnomalies);

    // Check for authentication anomalies
    const authAnomalies = await this.detectAuthenticationAnomalies(context, request);
    anomalies.push(...authAnomalies);

    // Check for geographic anomalies
    const geoAnomalies = await this.detectGeographicAnomalies(context, request);
    anomalies.push(...geoAnomalies);

    // Check for time-based anomalies
    const timeAnomalies = await this.detectTimeBasedAnomalies(context, request);
    anomalies.push(...timeAnomalies);

    return anomalies;
  }

  async getMetrics(timeRange: { start: Date; end: Date }): Promise<any> {
    const filteredEvents = this.events.filter(event => 
      event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );

    const totalRequests = this.getTotalRequests(timeRange);
    const successfulRequests = this.getSuccessfulRequests(timeRange);
    const failedRequests = this.getFailedRequests(timeRange);
    const blockedRequests = this.getBlockedRequests(timeRange);
    const rateLimitHits = this.getRateLimitHits(timeRange);
    const authenticationFailures = this.getAuthenticationFailures(timeRange);
    const authorizationFailures = this.getAuthorizationFailures(timeRange);
    const validationErrors = this.getValidationErrors(timeRange);
    const securityEvents = filteredEvents.length;
    const threatsDetected = this.getThreatsDetected(timeRange);
    const activeUsers = this.getActiveUsers(timeRange);
    const activeSessions = this.getActiveSessions(timeRange);
    const averageResponseTime = this.getAverageResponseTime(timeRange);
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;

    const topEndpoints = this.getTopEndpoints(timeRange);
    const topErrors = this.getTopErrors(timeRange);

    return SecurityMetricsSchema.parse({
      timestamp: new Date(),
      totalRequests,
      successfulRequests,
      failedRequests,
      blockedRequests,
      rateLimitHits,
      authenticationFailures,
      authorizationFailures,
      validationErrors,
      securityEvents,
      threatsDetected,
      activeUsers,
      activeSessions,
      averageResponseTime,
      errorRate,
      topEndpoints,
      topErrors
    });
  }

  async generateSecurityReport(timeRange: { start: Date; end: Date }): Promise<any> {
    const metrics = await this.getMetrics(timeRange);
    const events = await this.getEvents({ startDate: timeRange.start, endDate: timeRange.end });
    const threats = this.threats.filter(threat => 
      threat.detectedAt >= timeRange.start && threat.detectedAt <= timeRange.end
    );

    return {
      timeRange,
      summary: {
        totalEvents: events.length,
        totalThreats: threats.length,
        overallSecurityScore: this.calculateSecurityScore(metrics),
        riskLevel: this.calculateRiskLevel(metrics, threats)
      },
      metrics,
      events: {
        byType: this.groupEventsByType(events),
        bySeverity: this.groupEventsBySeverity(events),
        byHour: this.groupEventsByHour(events),
        topSources: this.getTopEventSources(events)
      },
      threats: {
        byType: this.groupThreatsByType(threats),
        byLevel: this.groupThreatsByLevel(threats),
        bySource: this.groupThreatsBySource(threats),
        resolved: this.getThreatResolutionStats(threats)
      },
      recommendations: this.generateSecurityRecommendations(metrics, events, threats),
      alerts: this.getActiveAlerts(timeRange)
    };
  }

  async alertOnThreat(threat: any): Promise<void> {
    // Store threat
    this.threats.push(threat);

    // Trigger alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(threat);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });

    // Log threat
    if (this.config.logging.logSecurity) {
      console.error('SECURITY THREAT DETECTED:', JSON.stringify(threat, null, 2));
    }

    // Check if immediate action is needed
    if (threat.level === 'critical') {
      await this.handleCriticalThreat(threat);
    }
  }

  // Alert management
  onAlert(callback: (threat: any) => void): void {
    this.alertCallbacks.push(callback);
  }

  removeAlertCallback(callback: (threat: any) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  // Private helper methods

  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async checkForThreats(event: any): Promise<void> {
    // Check if event indicates a threat
    const threatLevel = this.assessThreatLevel(event);
    
    if (threatLevel !== 'low') {
      const threat = ThreatDetectionSchema.parse({
        id: this.generateId(),
        type: this.mapEventToThreatType(event.type),
        level: threatLevel,
        confidence: this.calculateThreatConfidence(event),
        source: event.ipAddress || 'unknown',
        target: event.endpoint || 'unknown',
        userId: event.userId,
        ipAddress: event.ipAddress,
        details: {
          originalEvent: event,
          severity: event.severity,
          context: event.context
        },
        detectedAt: event.timestamp,
        isResolved: false
      });

      await this.alertOnThreat(threat);
    }
  }

  private assessThreatLevel(event: any): ThreatLevel {
    // Critical threats
    if (event.type === SecurityEventTypeEnum.BRUTE_FORCE_ATTEMPT ||
        event.type === SecurityEventTypeEnum.DATA_BREACH_ATTEMPT ||
        event.type === SecurityEventTypeEnum.SQL_INJECTION_ATTEMPT ||
        event.type === SecurityEventTypeEnum.XSS_ATTEMPT ||
        event.type === SecurityEventTypeEnum.CSRF_ATTEMPT) {
      return 'critical';
    }

    // High threats
    if (event.type === SecurityEventTypeEnum.SECURITY_VIOLATION ||
        event.type === SecurityEventTypeEnum.SUSPICIOUS_ACTIVITY ||
        event.type === SecurityEventTypeEnum.UNAUTHORIZED_ACCESS ||
        event.type === SecurityEventTypeEnum.FORBIDDEN_ACCESS) {
      return 'high';
    }

    // Medium threats
    if (event.type === SecurityEventTypeEnum.RATE_LIMIT_EXCEEDED ||
        event.type === SecurityEventTypeEnum.INVALID_API_KEY ||
        event.type === SecurityEventTypeEnum.VALIDATION_ERROR) {
      return 'medium';
    }

    return 'low';
  }

  private mapEventToThreatType(eventType: string): string {
    const mapping: Record<string, string> = {
      [SecurityEventTypeEnum.BRUTE_FORCE_ATTEMPT]: ThreatTypeEnum.BRUTE_FORCE,
      [SecurityEventTypeEnum.DATA_BREACH_ATTEMPT]: ThreatTypeEnum.DATA_EXFILTRATION,
      [SecurityEventTypeEnum.SQL_INJECTION_ATTEMPT]: ThreatTypeEnum.INJECTION_ATTACK,
      [SecurityEventTypeEnum.XSS_ATTEMPT]: ThreatTypeEnum.INJECTION_ATTACK,
      [SecurityEventTypeEnum.CSRF_ATTEMPT]: ThreatTypeEnum.INJECTION_ATTACK,
      [SecurityEventTypeEnum.SECURITY_VIOLATION]: ThreatTypeEnum.MALICIOUS_PAYLOAD,
      [SecurityEventTypeEnum.SUSPICIOUS_ACTIVITY]: ThreatTypeEnum.ANOMALOUS_BEHAVIOR,
      [SecurityEventTypeEnum.UNAUTHORIZED_ACCESS]: ThreatTypeEnum.UNAUTHORIZED_ACCESS,
      [SecurityEventTypeEnum.FORBIDDEN_ACCESS]: ThreatTypeEnum.UNAUTHORIZED_ACCESS,
      [SecurityEventTypeEnum.RATE_LIMIT_EXCEEDED]: ThreatTypeEnum.DDOS_ATTACK,
      [SecurityEventTypeEnum.INVALID_API_KEY]: ThreatTypeEnum.RECONNAISSANCE,
      [SecurityEventTypeEnum.VALIDATION_ERROR]: ThreatTypeEnum.ANOMALOUS_BEHAVIOR
    };

    return mapping[eventType] || ThreatTypeEnum.ANOMALOUS_BEHAVIOR;
  }

  private calculateThreatConfidence(event: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence for high severity events
    if (event.severity === 'critical') confidence += 0.3;
    else if (event.severity === 'high') confidence += 0.2;

    // Increase confidence for repeated events
    const recentSimilarEvents = this.events.filter(e => 
      e.type === event.type && 
      e.ipAddress === event.ipAddress &&
      Date.now() - e.timestamp.getTime() < 3600000 // Last hour
    );
    confidence += Math.min(recentSimilarEvents.length * 0.1, 0.3);

    return Math.min(confidence, 1.0);
  }

  private async detectSuspiciousPatterns(context: SecurityContext, request: any): Promise<any[]> {
    const anomalies: any[] = [];

    // Check for unusual request patterns
    if (this.isUnusualRequestPattern(context, request)) {
      anomalies.push({
        type: ThreatTypeEnum.SUSPICIOUS_PATTERN,
        level: 'medium',
        confidence: 0.7,
        details: 'Unusual request pattern detected'
      });
    }

    // Check for abnormal header combinations
    if (this.hasAbnormalHeaders(request)) {
      anomalies.push({
        type: ThreatTypeEnum.SUSPICIOUS_PATTERN,
        level: 'low',
        confidence: 0.6,
        details: 'Abnormal header combination detected'
      });
    }

    return anomalies;
  }

  private async detectRateLimitAnomalies(context: SecurityContext, request: any): Promise<any[]> {
    const anomalies: any[] = [];

    // Check for rapid successive requests
    const recentRequests = this.getRecentRequests(context.ipAddress || 'unknown', 60000); // Last minute
    if (recentRequests.length > 100) {
      anomalies.push({
        type: ThreatTypeEnum.DDOS_ATTACK,
        level: 'high',
        confidence: 0.8,
        details: `High request frequency: ${recentRequests.length} requests in last minute`
      });
    }

    return anomalies;
  }

  private async detectAuthenticationAnomalies(context: SecurityContext, request: any): Promise<any[]> {
    const anomalies: any[] = [];

    // Check for multiple failed authentication attempts
    const recentFailures = this.getRecentAuthFailures(context.ipAddress || 'unknown', 300000); // Last 5 minutes
    if (recentFailures.length > 5) {
      anomalies.push({
        type: ThreatTypeEnum.BRUTE_FORCE,
        level: 'high',
        confidence: 0.9,
        details: `Multiple authentication failures: ${recentFailures.length} in last 5 minutes`
      });
    }

    return anomalies;
  }

  private async detectGeographicAnomalies(context: SecurityContext, request: any): Promise<any[]> {
    const anomalies: any[] = [];

    // Check for unusual geographic locations (simplified implementation)
    const userLocation = this.getUserLocation(context.ipAddress || 'unknown');
    const usualLocations = this.getUsualUserLocations(context.user?.id);

    if (userLocation && usualLocations.length > 0 && !usualLocations.includes(userLocation)) {
      anomalies.push({
        type: ThreatTypeEnum.ANOMALOUS_BEHAVIOR,
        level: 'medium',
        confidence: 0.7,
        details: `Unusual geographic location: ${userLocation}`
      });
    }

    return anomalies;
  }

  private async detectTimeBasedAnomalies(context: SecurityContext, request: any): Promise<any[]> {
    const anomalies: any[] = [];

    // Check for unusual access times
    const currentHour = new Date().getHours();
    const usualHours = this.getUsualAccessHours(context.user?.id);

    if (usualHours.length > 0 && !usualHours.includes(currentHour)) {
      anomalies.push({
        type: ThreatTypeEnum.ANOMALOUS_BEHAVIOR,
        level: 'low',
        confidence: 0.6,
        details: `Unusual access time: ${currentHour}:00`
      });
    }

    return anomalies;
  }

  // Helper methods for detection
  private isUnusualRequestPattern(context: SecurityContext, request: any): boolean {
    // Simplified implementation - check for unusual request patterns
    const userAgent = request.headers['user-agent'];
    const contentType = request.headers['content-type'];
    
    // Check for missing user agent
    if (!userAgent) return true;
    
    // Check for unusual content types
    if (contentType && !this.config.validation.allowedMimeTypes.includes(contentType)) {
      return true;
    }

    return false;
  }

  private hasAbnormalHeaders(request: any): boolean {
    const headers = request.headers;
    
    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-originating-ip'
    ];

    return suspiciousHeaders.some(header => headers[header] && headers[header].includes(','));
  }

  private getRecentRequests(ipAddress: string, timeWindowMs: number): any[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.events.filter(event => 
      event.ipAddress === ipAddress && 
      event.timestamp >= cutoff
    );
  }

  private getRecentAuthFailures(ipAddress: string, timeWindowMs: number): any[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.events.filter(event => 
      event.ipAddress === ipAddress &&
      event.type === SecurityEventTypeEnum.AUTHENTICATION_FAILURE &&
      event.timestamp >= cutoff
    );
  }

  private getUserLocation(ipAddress: string): string | null {
    // Simplified implementation - in production, use a GeoIP service
    return null;
  }

  private getUsualUserLocations(userId: string): string[] {
    // Simplified implementation - in production, track user locations
    return [];
  }

  private getUsualAccessHours(userId: string): number[] {
    // Simplified implementation - in production, track user access patterns
    return [];
  }

  // Metrics calculation methods
  private getTotalRequests(timeRange: { start: Date; end: Date }): number {
    return this.events.filter(event => 
      event.timestamp >= timeRange.start && 
      event.timestamp <= timeRange.end
    ).length;
  }

  private getSuccessfulRequests(timeRange: { start: Date; end: Date }): number {
    return this.events.filter(event => 
      event.timestamp >= timeRange.start && 
      event.timestamp <= timeRange.end &&
      event.type !== SecurityEventTypeEnum.AUTHENTICATION_FAILURE &&
      event.type !== SecurityEventTypeEnum.AUTHORIZATION_ERROR &&
      event.type !== SecurityEventTypeEnum.VALIDATION_ERROR &&
      event.type !== SecurityEventTypeEnum.RATE_LIMIT_EXCEEDED
    ).length;
  }

  private getFailedRequests(timeRange: { start: Date; end: Date }): number {
    return this.events.filter(event => 
      event.timestamp >= timeRange.start && 
      event.timestamp <= timeRange.end &&
      (event.type === SecurityEventTypeEnum.AUTHENTICATION_FAILURE ||
       event.type === SecurityEventTypeEnum.FORBIDDEN_ACCESS ||
       event.type === SecurityEventTypeEnum.VALIDATION_ERROR)
    ).length;
  }

  private getBlockedRequests(timeRange: { start: Date; end: Date }): number {
    return this.events.filter(event => 
      event.timestamp >= timeRange.start && 
      event.timestamp <= timeRange.end &&
      (event.type === SecurityEventTypeEnum.RATE_LIMIT_EXCEEDED ||
       event.type === SecurityEventTypeEnum.SECURITY_VIOLATION ||
       event.type === SecurityEventTypeEnum.FORBIDDEN_ACCESS)
    ).length;
  }

  private getRateLimitHits(timeRange: { start: Date; end: Date }): number {
    return this.events.filter(event => 
      event.timestamp >= timeRange.start && 
      event.timestamp <= timeRange.end &&
      event.type === SecurityEventTypeEnum.RATE_LIMIT_EXCEEDED
    ).length;
  }

  private getAuthenticationFailures(timeRange: { start: Date; end: Date }): number {
    return this.events.filter(event => 
      event.timestamp >= timeRange.start && 
      event.timestamp <= timeRange.end &&
      event.type === SecurityEventTypeEnum.AUTHENTICATION_FAILURE
    ).length;
  }

  private getAuthorizationFailures(timeRange: { start: Date; end: Date }): number {
    return this.events.filter(event => 
      event.timestamp >= timeRange.start && 
      event.timestamp <= timeRange.end &&
      event.type === SecurityEventTypeEnum.FORBIDDEN_ACCESS
    ).length;
  }

  private getValidationErrors(timeRange: { start: Date; end: Date }): number {
    return this.events.filter(event => 
      event.timestamp >= timeRange.start && 
      event.timestamp <= timeRange.end &&
      event.type === SecurityEventTypeEnum.VALIDATION_ERROR
    ).length;
  }

  private getThreatsDetected(timeRange: { start: Date; end: Date }): number {
    return this.threats.filter(threat => 
      threat.detectedAt >= timeRange.start && 
      threat.detectedAt <= timeRange.end
    ).length;
  }

  private getActiveUsers(timeRange: { start: Date; end: Date }): number {
    const userIds = new Set();
    this.events.forEach(event => {
      if (event.timestamp >= timeRange.start && 
          event.timestamp <= timeRange.end &&
          event.userId) {
        userIds.add(event.userId);
      }
    });
    return userIds.size;
  }

  private getActiveSessions(timeRange: { start: Date; end: Date }): number {
    // Simplified implementation
    return this.getActiveUsers(timeRange);
  }

  private getAverageResponseTime(timeRange: { start: Date; end: Date }): number {
    // Simplified implementation - in production, track actual response times
    return 150; // 150ms average
  }

  private getTopEndpoints(timeRange: { start: Date; end: Date }): Array<{ endpoint: string; count: number; avgResponseTime: number }> {
    const endpointCounts = new Map<string, number>();
    
    this.events.forEach(event => {
      if (event.timestamp >= timeRange.start && 
          event.timestamp <= timeRange.end &&
          event.endpoint) {
        endpointCounts.set(event.endpoint, (endpointCounts.get(event.endpoint) || 0) + 1);
      }
    });

    return Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({
        endpoint,
        count,
        avgResponseTime: 150 // Simplified
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getTopErrors(timeRange: { start: Date; end: Date }): Array<{ error: string; count: number }> {
    const errorCounts = new Map<string, number>();
    
    this.events.forEach(event => {
      if (event.timestamp >= timeRange.start && 
          event.timestamp <= timeRange.end &&
          event.type) {
        errorCounts.set(event.type, (errorCounts.get(event.type) || 0) + 1);
      }
    });

    return Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Report generation methods
  private calculateSecurityScore(metrics: any): number {
    let score = 100; // Start with perfect score

    // Deduct points for failures
    score -= metrics.authenticationFailures * 2;
    score -= metrics.authorizationFailures * 3;
    score -= metrics.threatsDetected * 5;
    score -= metrics.blockedRequests * 1;

    // Add points for success
    score += metrics.successfulRequests * 0.01;

    return Math.max(0, Math.min(100, score));
  }

  private calculateRiskLevel(metrics: any, threats: any[]): 'low' | 'medium' | 'high' | 'critical' {
    const threatScore = threats.reduce((sum: number, threat: any) => {
      const levelWeight: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
      return sum + (levelWeight[threat.level] || 1) * threat.confidence;
    }, 0);

    if (threatScore > 20 || metrics.threatsDetected > 10) return 'critical';
    if (threatScore > 10 || metrics.threatsDetected > 5) return 'high';
    if (threatScore > 5 || metrics.threatsDetected > 2) return 'medium';
    return 'low';
  }

  private groupEventsByType(events: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    events.forEach(event => {
      groups[event.type] = (groups[event.type] || 0) + 1;
    });
    return groups;
  }

  private groupEventsBySeverity(events: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    events.forEach(event => {
      groups[event.severity] = (groups[event.severity] || 0) + 1;
    });
    return groups;
  }

  private groupEventsByHour(events: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    events.forEach(event => {
      const hour = event.timestamp.getHours().toString();
      groups[hour] = (groups[hour] || 0) + 1;
    });
    return groups;
  }

  private getTopEventSources(events: any[]): Array<{ source: string; count: number }> {
    const sourceCounts = new Map<string, number>();
    
    events.forEach(event => {
      const source = event.ipAddress || 'unknown';
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    });

    return Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private groupThreatsByType(threats: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    threats.forEach(threat => {
      groups[threat.type] = (groups[threat.type] || 0) + 1;
    });
    return groups;
  }

  private groupThreatsByLevel(threats: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    threats.forEach(threat => {
      groups[threat.level] = (groups[threat.level] || 0) + 1;
    });
    return groups;
  }

  private groupThreatsBySource(threats: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    threats.forEach(threat => {
      const source = threat.ipAddress || 'unknown';
      groups[source] = (groups[source] || 0) + 1;
    });
    return groups;
  }

  private getThreatResolutionStats(threats: any[]): { total: number; resolved: number; pending: number } {
    const total = threats.length;
    const resolved = threats.filter(threat => threat.isResolved).length;
    const pending = total - resolved;
    
    return { total, resolved, pending };
  }

  private generateSecurityRecommendations(metrics: any, events: any[], threats: any[]): string[] {
    const recommendations: string[] = [];

    if (metrics.authenticationFailures > 10) {
      recommendations.push('Consider implementing stronger authentication policies');
    }

    if (metrics.authorizationFailures > 5) {
      recommendations.push('Review and update role-based access controls');
    }

    if (metrics.threatsDetected > 0) {
      recommendations.push('Investigate detected security threats and implement preventive measures');
    }

    if (metrics.rateLimitHits > 20) {
      recommendations.push('Consider adjusting rate limiting thresholds');
    }

    if (metrics.errorRate > 0.1) {
      recommendations.push('Investigate high error rate and improve input validation');
    }

    return recommendations;
  }

  private getActiveAlerts(timeRange: { start: Date; end: Date }): any[] {
    return this.threats.filter(threat => 
      threat.detectedAt >= timeRange.start && 
      threat.detectedAt <= timeRange.end &&
      !threat.isResolved &&
      threat.level === 'critical'
    );
  }

  private async handleCriticalThreat(threat: any): Promise<void> {
    // Implement immediate response to critical threats
    console.error('CRITICAL THREAT DETECTED - Immediate action required:', threat);
    
    // In production, this might:
    // - Block the IP address
    // - Disable affected accounts
    // - Notify security team
    // - Trigger automated response
  }

  private logSecurityEvent(event: any): void {
    const logData = {
      type: 'SECURITY_EVENT',
      event: {
        type: event.type,
        severity: event.severity,
        userId: event.userId,
        ipAddress: event.ipAddress,
        endpoint: event.endpoint
      },
      timestamp: event.timestamp
    };

    if (event.severity === 'critical' || event.severity === 'high') {
      console.error('SECURITY EVENT:', JSON.stringify(logData, null, 2));
    } else {
      console.warn('SECURITY EVENT:', JSON.stringify(logData, null, 2));
    }
  }

  private startMonitoring(): void {
    if (!this.config.logging.enabled) {
      return;
    }

    // Cleanup old events every hour
    this.monitoringInterval = setInterval(() => {
      this.cleanupOldEvents();
    }, 60 * 60 * 1000);
  }

  private cleanupOldEvents(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    this.events = this.events.filter(event => event.timestamp >= cutoff);
    this.threats = this.threats.filter(threat => threat.detectedAt >= cutoff);
    this.metrics = this.metrics.filter(metric => metric.timestamp >= cutoff);
  }

  // Additional convenience methods for security routes
  async getMetrics(): Promise<any> {
    // Default to last 24 hours if no time range provided
    const timeRange = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    };
    return this.getMetricsWithTimeRange(timeRange);
  }

  async getMetricsWithTimeRange(timeRange: { start: Date; end: Date }): Promise<any> {
    return {
      timeRange,
      totalEvents: this.events.length,
      criticalEvents: this.events.filter(e => e.severity === 'critical').length,
      threats: this.threats.length,
      activeThreats: this.threats.filter(t => t.status === 'active').length,
      metrics: this.metrics
    };
  }

  async generateReport(options: { startDate?: Date; endDate?: Date; format?: string }): Promise<any> {
    const timeRange = {
      start: options.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: options.endDate || new Date()
    };
    
    const report = await this.generateSecurityReport(timeRange);
    
    if (options.format === 'pdf') {
      // For now, return JSON - PDF generation would require additional dependencies
      return report;
    }
    
    return report;
  }

  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      events: this.events.length,
      threats: this.threats.length,
      metrics: this.metrics.length,
      monitoring: this.monitoringInterval ? 'active' : 'inactive'
    };
  }

  // Public cleanup method
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}
