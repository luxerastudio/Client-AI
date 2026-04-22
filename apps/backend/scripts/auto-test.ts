#!/usr/bin/env ts-node

import { performance } from 'perf_hooks';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

interface TestResult {
  name: string;
  passed: boolean;
  reason?: string;
  responseTime?: number;
  details?: any;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

class AutoTester {
  private baseUrl: string;
  private summary: TestSummary;

  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3002';
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      results: []
    };
  }

  private async makeRequest(method: string, path: string, body?: any, headers?: Record<string, string>): Promise<{
    status: number;
    data: any;
    responseTime: number;
    headers: Record<string, string>;
  }> {
    const startTime = performance.now();
    
    try {
      const url = `${this.baseUrl}${path}`;
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const endTime = performance.now();
      const responseTime = Math.round((endTime - startTime) * 100) / 100;

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Convert headers object to plain record
      const headersRecord: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersRecord[key] = value;
      });

      return {
        status: response.status,
        data,
        responseTime,
        headers: headersRecord
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round((endTime - startTime) * 100) / 100;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      throw {
        status: 0,
        data: { error: errorMessage },
        responseTime,
        headers: {}
      };
    }
  }

  private logResult(result: TestResult): void {
    const icon = result.passed ? '  ' : '  ';
    const status = result.passed ? 
      `${colors.green}PASS${colors.reset}` : 
      `${colors.red}FAIL${colors.reset}`;
    
    console.log(`${icon}${status}: ${result.name}`);
    
    if (!result.passed && result.reason) {
      console.log(`   ${colors.yellow}Reason:${colors.reset} ${result.reason}`);
    }
    
    if (result.responseTime !== undefined) {
      console.log(`   ${colors.blue}Time:${colors.reset} ${result.responseTime}ms`);
    }
  }

  private addTest(result: TestResult): void {
    this.summary.total++;
    if (result.passed) {
      this.summary.passed++;
    } else {
      this.summary.failed++;
    }
    this.summary.results.push(result);
    this.logResult(result);
  }

  private isMockResponse(data: any): boolean {
    if (typeof data === 'string') {
      return data.toLowerCase().includes('mock') || 
             data.toLowerCase().includes('placeholder') ||
             data.toLowerCase().includes('example');
    }
    
    if (typeof data === 'object' && data !== null) {
      const dataStr = JSON.stringify(data).toLowerCase();
      return dataStr.includes('mock') || 
             dataStr.includes('placeholder') ||
             dataStr.includes('example');
    }
    
    return false;
  }

  private isRealJWT(token: string): boolean {
    if (typeof token !== 'string') return false;
    
    // Basic JWT structure check
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    try {
      // Check if parts are valid base64
      JSON.parse(Buffer.from(parts[0], 'base64').toString());
      JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return true;
    } catch {
      return false;
    }
  }

  async testHealthCheck(): Promise<void> {
    try {
      const { status, data, responseTime } = await this.makeRequest('GET', '/health');
      
      const passed = status === 200 && 
                    data && 
                    (data.status === 'ok' || data.status === 'healthy');
      
      this.addTest({
        name: 'Health Check',
        passed,
        reason: !passed ? `Expected status "ok" or "healthy", got ${data?.status}` : undefined,
        responseTime,
        details: { status, data: data?.status }
      });
    } catch (error) {
      this.addTest({
        name: 'Health Check',
        passed: false,
        reason: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: (error as any).responseTime
      });
    }
  }

  async testAIGenerate(): Promise<void> {
    try {
      const { status, data, responseTime } = await this.makeRequest('POST', '/api/v1/ai/generate', {
        prompt: 'Test prompt for AI generation',
        userId: 'auto-test-user',
        sessionId: 'auto-test-session'
      });
      
      const passed = status === 200 && 
                    data && 
                    data.data && 
                    data.data.content && 
                    !this.isMockResponse(data.data.content);
      
      this.addTest({
        name: 'AI Generate',
        passed,
        reason: !passed ? this.isMockResponse(data?.data?.content) ? 
          'Response contains mock data' : 
          'Invalid response structure' : undefined,
        responseTime,
        details: { 
          status, 
          contentLength: data?.data?.content?.length || 0,
          isMock: this.isMockResponse(data?.data?.content)
        }
      });
    } catch (error) {
      this.addTest({
        name: 'AI Generate',
        passed: false,
        reason: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: (error as any).responseTime
      });
    }
  }

  async testAuthentication(): Promise<void> {
    try {
      // Try login endpoint first
      let authData: any;
      let token: string = '';
      
      try {
        const { data } = await this.makeRequest('POST', '/api/v1/security/auth/login', {
          email: 'test@example.com',
          password: 'testpassword'
        });
        authData = data;
        token = data?.data?.token || data?.token || '';
      } catch (loginError) {
        // If login fails, try token generation
        try {
          const { data } = await this.makeRequest('POST', '/api/v1/security/auth/token', {
            userId: 'auto-test-user',
            payload: { role: 'user' }
          });
          authData = data;
          token = data?.data?.token || data?.token || '';
        } catch (tokenError) {
          // If both fail, test fails
          throw new Error('Neither login nor token endpoint worked');
        }
      }
      
      const passed = Boolean(token && this.isRealJWT(token) && !this.isMockResponse(token));
      
      this.addTest({
        name: 'Authentication',
        passed,
        reason: !passed ? !token ? 'No token returned' : 
          this.isMockResponse(token) ? 'Token contains mock data' :
          'Invalid JWT format' : undefined,
        details: { 
          hasToken: !!token,
          tokenLength: token.length,
          isRealJWT: this.isRealJWT(token),
          isMock: this.isMockResponse(token)
        }
      });
    } catch (error) {
      this.addTest({
        name: 'Authentication',
        passed: false,
        reason: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: (error as any).responseTime
      });
    }
  }

  async testProtectedRoute(): Promise<void> {
    let token = '';
    
    // Try to get a token first
    try {
      const { data } = await this.makeRequest('POST', '/api/v1/security/auth/token', {
        userId: 'auto-test-user',
        payload: { role: 'user' }
      });
      token = data?.data?.token || data?.token || '';
    } catch (error) {
      // Continue without token
    }
    
    // Test without token
    try {
      const { status: statusWithoutToken } = await this.makeRequest('GET', '/api/v1/security/health');
      
      // Test with token
      let statusWithToken = 0;
      if (token) {
        const { status } = await this.makeRequest('GET', '/api/v1/security/health', undefined, {
          'Authorization': `Bearer ${token}`
        });
        statusWithToken = status;
      }
      
      const passed = statusWithoutToken === 401 && (statusWithToken === 200 || statusWithToken === 0);
      
      this.addTest({
        name: 'Protected Route',
        passed,
        reason: !passed ? 
          statusWithoutToken !== 401 ? 'Should reject without token (401)' :
          statusWithToken !== 200 && statusWithToken !== 0 ? 'Should accept with token (200)' :
          'Unexpected behavior' : undefined,
        details: { 
          statusWithoutToken,
          statusWithToken,
          hasToken: !!token
        }
      });
    } catch (error) {
      this.addTest({
        name: 'Protected Route',
        passed: false,
        reason: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: (error as any).responseTime
      });
    }
  }

  async testWorkflowExecution(): Promise<void> {
    try {
      // Try different workflow endpoints
      let workflowData: any;
      let endpoint = '';
      
      // Try workflow execution endpoint
      try {
        const { data } = await this.makeRequest('POST', '/api/v1/workflows/test-workflow/execute', {
          input: { message: 'Test workflow input' }
        });
        workflowData = data;
        endpoint = '/api/v1/workflows/test-workflow/execute';
      } catch (error) {
        // Try AI endpoint as workflow proxy
        try {
          const { data } = await this.makeRequest('POST', '/api/v1/ai/generate', {
            prompt: 'Test workflow processing',
            userId: 'auto-test-user',
            context: JSON.stringify({ type: 'workflow' })
          });
          workflowData = data;
          endpoint = '/api/v1/ai/generate (workflow proxy)';
        } catch (aiError) {
          throw new Error('No workflow endpoint available');
        }
      }
      
      const passed = workflowData && 
                    workflowData.data && 
                    (workflowData.data.executionId || workflowData.data.content) &&
                    !this.isMockResponse(workflowData.data.content || workflowData.data);
      
      this.addTest({
        name: 'Workflow Execution',
        passed,
        reason: !passed ? 
          !workflowData?.data ? 'No response data' :
          !(workflowData.data.executionId || workflowData.data.content) ? 'No executionId or content' :
          this.isMockResponse(workflowData.data.content) ? 'Response contains mock data' :
          'Invalid response' : undefined,
        details: { 
          endpoint,
          hasExecutionId: !!workflowData?.data?.executionId,
          hasContent: !!workflowData?.data?.content,
          isMock: this.isMockResponse(workflowData?.data?.content)
        }
      });
    } catch (error) {
      this.addTest({
        name: 'Workflow Execution',
        passed: false,
        reason: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: (error as any).responseTime
      });
    }
  }

  async testScoringSystem(): Promise<void> {
    try {
      // Test different scoring endpoints
      let scoreData: any;
      let endpoint = '';
      
      // Try scoring calculate endpoint
      try {
        const { data } = await this.makeRequest('POST', '/api/v1/scoring/calculate', {
          entityType: 'content',
          entityId: 'test-score',
          factors: [
            { name: 'quality', value: 0.8, weight: 0.5 },
            { name: 'relevance', value: 0.7, weight: 0.5 }
          ],
          algorithm: 'weighted'
        });
        scoreData = data;
        endpoint = '/api/v1/scoring/calculate';
      } catch (error) {
        // Try direct scoring endpoint
        try {
          const { data } = await this.makeRequest('POST', '/api/v1/score', {
            content: 'Test content for scoring'
          });
          scoreData = data;
          endpoint = '/api/v1/score';
        } catch (scoreError) {
          throw new Error('No scoring endpoint available');
        }
      }
      
      // Test determinism by making the same request twice
      let secondScoreData: any;
      try {
        const { data } = await this.makeRequest('POST', endpoint, endpoint === '/api/v1/scoring/calculate' ? {
          entityType: 'content',
          entityId: 'test-score',
          factors: [
            { name: 'quality', value: 0.8, weight: 0.5 },
            { name: 'relevance', value: 0.7, weight: 0.5 }
          ],
          algorithm: 'weighted'
        } : {
          content: 'Test content for scoring'
        });
        secondScoreData = data;
      } catch (error) {
        // If second request fails, we can't test determinism
      }
      
      const score1 = scoreData?.data?.score || scoreData?.score;
      const score2 = secondScoreData?.data?.score || secondScoreData?.score;
      
      const passed = typeof score1 === 'number' && 
                    (!score2 || score1 === score2); // Deterministic if second request succeeds
      
      this.addTest({
        name: 'Scoring System',
        passed,
        reason: !passed ? 
          typeof score1 !== 'number' ? 'Score is not a number' :
          score2 !== undefined && score1 !== score2 ? 'Scores are not deterministic' :
          'Invalid response' : undefined,
        details: { 
          endpoint,
          score1,
          score2,
          isDeterministic: score2 !== undefined ? score1 === score2 : 'unknown',
          isMock: this.isMockResponse(scoreData)
        }
      });
    } catch (error) {
      this.addTest({
        name: 'Scoring System',
        passed: false,
        reason: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: (error as any).responseTime
      });
    }
  }

  async runAllTests(): Promise<void> {
    console.log(`${colors.cyan}${colors.bold}=== Automated Backend Testing System ===${colors.reset}`);
    console.log(`${colors.blue}Testing against: ${this.baseUrl}${colors.reset}\n`);
    
    // Run all tests
    await this.testHealthCheck();
    await this.testAIGenerate();
    await this.testAuthentication();
    await this.testProtectedRoute();
    await this.testWorkflowExecution();
    await this.testScoringSystem();
    
    // Print summary
    this.printSummary();
  }

  private printSummary(): void {
    console.log(`\n${colors.cyan}${colors.bold}=== Test Summary ===${colors.reset}`);
    
    const realModules = this.summary.results.filter(r => r.passed && !r.details?.isMock);
    const mockModules = this.summary.results.filter(r => r.passed && r.details?.isMock);
    const failedModules = this.summary.results.filter(r => !r.passed);
    
    console.log(`TOTAL: ${this.summary.total}`);
    console.log(`${colors.green}PASSED: ${this.summary.passed}${colors.reset}`);
    console.log(`${colors.red}FAILED: ${this.summary.failed}${colors.reset}\n`);
    
    console.log(`${colors.cyan}${colors.bold}=== Module Analysis ===${colors.reset}`);
    console.log(`${colors.green}Real Modules: ${realModules.length}${colors.reset}`);
    realModules.forEach(result => {
      console.log(`  ${colors.green}  ${colors.reset}${result.name}`);
    });
    
    if (mockModules.length > 0) {
      console.log(`${colors.yellow}Mock Modules: ${mockModules.length}${colors.reset}`);
      mockModules.forEach(result => {
        console.log(`  ${colors.yellow}  ${colors.reset}${result.name}`);
      });
    }
    
    if (failedModules.length > 0) {
      console.log(`${colors.red}Failed Modules: ${failedModules.length}${colors.reset}`);
      failedModules.forEach(result => {
        console.log(`  ${colors.red}  ${colors.reset}${result.name} - ${result.reason}`);
      });
    }
    
    console.log(`\n${colors.cyan}${colors.bold}=== Production Readiness ===${colors.reset}`);
    
    const isProductionReady = this.summary.failed === 0 && mockModules.length === 0;
    
    if (isProductionReady) {
      console.log(`${colors.green}  ${colors.bold}READY FOR PRODUCTION${colors.reset}`);
      console.log(`  All modules are real and functional`);
    } else if (this.summary.failed === 0 && mockModules.length > 0) {
      console.log(`${colors.yellow}  ${colors.bold}DEVELOPMENT MODE${colors.reset}`);
      console.log(`  System works but uses mock implementations`);
    } else {
      console.log(`${colors.red}  ${colors.bold}NOT READY${colors.reset}`);
      console.log(`  Some modules are failing or non-functional`);
    }
    
    // Exit with appropriate code
    process.exit(this.summary.failed > 0 ? 1 : 0);
  }
}

// Run the tests
if (require.main === module) {
  const tester = new AutoTester();
  tester.runAllTests().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
}

export { AutoTester };
