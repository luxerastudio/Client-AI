import { FastifyInstance } from 'fastify';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';

export interface IntegrationTestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  details: any;
  errors?: string[];
}

export interface SystemFlowTest {
  endpoint: string;
  method: string;
  payload: any;
  expectedFlow: string[];
  validation: (response: any) => boolean;
}

export class SystemIntegrationTest {
  private server: FastifyInstance;
  private container: DependencyContainer;
  private testResults: IntegrationTestResult[] = [];

  constructor(server: FastifyInstance, container: DependencyContainer) {
    this.server = server;
    this.container = container;
  }

  async runFullIntegrationSuite(): Promise<{
    overall: 'PASS' | 'FAIL';
    results: IntegrationTestResult[];
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      totalDuration: number;
    };
  }> {
    console.log('Starting Full System Integration Validation...\n');
    
    const startTime = Date.now();
    
    // Test 1: Basic Health Check
    await this.testHealthEndpoint();
    
    // Test 2: AI Generation with Memory
    await this.testAIGenerationWithMemory();
    
    // Test 3: Workflow Execution
    await this.testWorkflowExecution();
    
    // Test 4: Scoring System
    await this.testScoringSystem();
    
    // Test 5: Full Pipeline Flow
    await this.testFullPipelineFlow();
    
    // Test 6: Memory Persistence
    await this.testMemoryPersistence();
    
    // Test 7: Service Integration
    await this.testServiceIntegration();
    
    const totalDuration = Date.now() - startTime;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    
    const result = {
      overall: failedTests === 0 ? 'PASS' : 'FAIL' as 'PASS' | 'FAIL',
      results: this.testResults,
      summary: {
        totalTests: this.testResults.length,
        passedTests,
        failedTests,
        totalDuration
      }
    };
    
    this.printResults(result);
    return result;
  }

  private async testHealthEndpoint(): Promise<void> {
    const startTime = Date.now();
    let result: IntegrationTestResult;
    
    try {
      const response = await this.server.inject({
        method: 'GET',
        url: '/health'
      });
      
      const jsonResponse = response.json as any;
      const isValid = response.statusCode === 200 && 
                     jsonResponse?.status === 'healthy' &&
                     jsonResponse?.services;
      
      result = {
        testName: 'Health Endpoint',
        status: isValid ? 'PASS' : 'FAIL',
        duration: Date.now() - startTime,
        details: {
          statusCode: response.statusCode,
          services: jsonResponse?.services || [],
          memoryStats: jsonResponse?.memory || {}
        }
      };
      
      if (!isValid) {
        result.errors = ['Health endpoint not responding correctly'];
      }
    } catch (error) {
      result = {
        testName: 'Health Endpoint',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: (error as Error).message },
        errors: [(error as Error).message]
      };
    }
    
    this.testResults.push(result);
  }

  private async testAIGenerationWithMemory(): Promise<void> {
    const startTime = Date.now();
    let result: IntegrationTestResult;
    
    try {
      const testUserId = 'integration-test-user-' + Date.now();
      const testPrompt = 'Write a short poem about artificial intelligence';
      
      const response = await this.server.inject({
        method: 'POST',
        url: '/ai/generate',
        payload: {
          prompt: testPrompt,
          userId: testUserId,
          enableMemory: true,
          enablePersonalization: true
        }
      });
      
      const jsonResponse = response.json as any;
      const isValid = response.statusCode === 200 &&
                     jsonResponse?.success === true &&
                     jsonResponse?.data?.content &&
                     jsonResponse?.data?.memoryEnhancement;
      
      result = {
        testName: 'AI Generation with Memory',
        status: isValid ? 'PASS' : 'FAIL',
        duration: Date.now() - startTime,
        details: {
          statusCode: response.statusCode,
          hasContent: !!jsonResponse?.data?.content,
          memoryEnhancement: jsonResponse?.data?.memoryEnhancement || {},
          userId: testUserId
        }
      };
      
      if (!isValid) {
        result.errors = ['AI generation with memory failed'];
      }
    } catch (error) {
      result = {
        testName: 'AI Generation with Memory',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: (error as Error).message },
        errors: [(error as Error).message]
      };
    }
    
    this.testResults.push(result);
  }

  private async testWorkflowExecution(): Promise<void> {
    const startTime = Date.now();
    let result: IntegrationTestResult;
    
    try {
      const response = await this.server.inject({
        method: 'POST',
        url: '/workflow/execute',
        payload: {
          templateId: 'content-generation',
          input: {
            topic: 'machine learning',
            style: 'technical',
            length: 'medium'
          }
        }
      });
      
      const jsonResponse = response.json as any;
      const isValid = response.statusCode === 200 &&
                     jsonResponse?.success === true &&
                     jsonResponse?.data?.executionId;
      
      result = {
        testName: 'Workflow Execution',
        status: isValid ? 'PASS' : 'FAIL',
        duration: Date.now() - startTime,
        details: {
          statusCode: response.statusCode,
          executionId: jsonResponse?.data?.executionId,
          status: jsonResponse?.data?.status
        }
      };
      
      if (!isValid) {
        result.errors = ['Workflow execution failed'];
      }
    } catch (error) {
      result = {
        testName: 'Workflow Execution',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: (error as Error).message },
        errors: [(error as Error).message]
      };
    }
    
    this.testResults.push(result);
  }

  private async testScoringSystem(): Promise<void> {
    const startTime = Date.now();
    let result: IntegrationTestResult;
    
    try {
      const testContent = 'This is a well-written, comprehensive article about artificial intelligence that covers all important aspects of the topic in a clear and engaging manner.';
      
      const response = await this.server.inject({
        method: 'POST',
        url: '/scoring/calculate',
        payload: {
          content: testContent,
          factors: [
            { name: 'readability', weight: 0.3, value: 0.8 },
            { name: 'coherence', weight: 0.4, value: 0.9 },
            { name: 'accuracy', weight: 0.3, value: 0.85 }
          ]
        }
      });
      
      const jsonResponse = response.json as any;
      const isValid = response.statusCode === 200 &&
                     jsonResponse?.success === true &&
                     typeof jsonResponse?.data?.score === 'number' &&
                     jsonResponse?.data?.breakdown;
      
      result = {
        testName: 'Scoring System',
        status: isValid ? 'PASS' : 'FAIL',
        duration: Date.now() - startTime,
        details: {
          statusCode: response.statusCode,
          score: jsonResponse?.data?.score,
          hasBreakdown: !!jsonResponse?.data?.breakdown,
          isRealScore: typeof jsonResponse?.data?.score === 'number'
        }
      };
      
      if (!isValid) {
        result.errors = ['Scoring system failed'];
      }
    } catch (error) {
      result = {
        testName: 'Scoring System',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: (error as Error).message },
        errors: [(error as Error).message]
      };
    }
    
    this.testResults.push(result);
  }

  private async testFullPipelineFlow(): Promise<void> {
    const startTime = Date.now();
    let result: IntegrationTestResult;
    
    try {
      const testUserId = 'pipeline-test-user-' + Date.now();
      
      // Step 1: Generate AI content with memory
      const aiResponse = await this.server.inject({
        method: 'POST',
        url: '/ai/generate',
        payload: {
          prompt: 'Explain the concept of machine learning in simple terms',
          userId: testUserId,
          enableMemory: true
        }
      });
      
      // Step 2: Score the generated content
      const aiJson = aiResponse.json as any;
      const scoringResponse = await this.server.inject({
        method: 'POST',
        url: '/scoring/calculate',
        payload: {
          content: aiJson?.data?.content || '',
          factors: [
            { name: 'clarity', weight: 0.4, value: 0.8 },
            { name: 'completeness', weight: 0.6, value: 0.9 }
          ]
        }
      });
      
      // Step 3: Execute workflow with the content
      const scoringJson = scoringResponse.json as any;
      const workflowResponse = await this.server.inject({
        method: 'POST',
        url: '/workflow/execute',
        payload: {
          templateId: 'content-refinement',
          input: {
            originalContent: aiJson?.data?.content || '',
            targetScore: scoringJson?.data?.score || 0.8
          }
        }
      });
      
      // Step 4: Check memory persistence
      const memoryResponse = await this.server.inject({
        method: 'GET',
        url: `/ai/memory/${testUserId}`
      });
      
      const workflowJson = workflowResponse.json as any;
      const memoryJson = memoryResponse.json as any;
      const isValid = aiResponse.statusCode === 200 &&
                     scoringResponse.statusCode === 200 &&
                     workflowResponse.statusCode === 200 &&
                     memoryResponse.statusCode === 200 &&
                     aiJson?.data?.content &&
                     typeof scoringJson?.data?.score === 'number' &&
                     workflowJson?.data?.executionId;
      
      result = {
        testName: 'Full Pipeline Flow',
        status: isValid ? 'PASS' : 'FAIL',
        duration: Date.now() - startTime,
        details: {
          aiGeneration: aiResponse.statusCode,
          scoring: scoringResponse.statusCode,
          workflow: workflowResponse.statusCode,
          memory: memoryResponse.statusCode,
          userId: testUserId,
          pipelineComplete: isValid
        }
      };
      
      if (!isValid) {
        result.errors = ['Full pipeline flow failed at one or more stages'];
      }
    } catch (error) {
      result = {
        testName: 'Full Pipeline Flow',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: (error as Error).message },
        errors: [(error as Error).message]
      };
    }
    
    this.testResults.push(result);
  }

  private async testMemoryPersistence(): Promise<void> {
    const startTime = Date.now();
    let result: IntegrationTestResult;
    
    try {
      const testUserId = 'memory-test-user-' + Date.now();
      
      // First interaction
      await this.server.inject({
        method: 'POST',
        url: '/ai/generate',
        payload: {
          prompt: 'What is the capital of France?',
          userId: testUserId,
          enableMemory: true
        }
      });
      
      // Second interaction - should remember previous context
      const secondResponse = await this.server.inject({
        method: 'POST',
        url: '/ai/generate',
        payload: {
          prompt: 'Tell me more about that city',
          userId: testUserId,
          enableMemory: true
        }
      });
      
      // Check memory stats
      const memoryStats = await this.server.inject({
        method: 'GET',
        url: `/ai/memory/${testUserId}`
      });
      
      const memoryJson = memoryStats.json as any;
      const isValid = secondResponse.statusCode === 200 &&
                     memoryStats.statusCode === 200 &&
                     memoryJson?.data?.memoryStats?.totalInteractions >= 2;
      
      result = {
        testName: 'Memory Persistence',
        status: isValid ? 'PASS' : 'FAIL',
        duration: Date.now() - startTime,
        details: {
          secondInteraction: secondResponse.statusCode,
          memoryStats: memoryStats.statusCode,
          interactionCount: memoryJson?.data?.memoryStats?.totalInteractions,
          memoryDepth: memoryJson?.data?.memoryStats?.memoryDepth
        }
      };
      
      if (!isValid) {
        result.errors = ['Memory persistence failed'];
      }
    } catch (error) {
      result = {
        testName: 'Memory Persistence',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: (error as Error).message },
        errors: [(error as Error).message]
      };
    }
    
    this.testResults.push(result);
  }

  private async testServiceIntegration(): Promise<void> {
    const startTime = Date.now();
    let result: IntegrationTestResult;
    
    try {
      // Test DI container health
      const healthInfo = this.container.getHealthInfo();
      const registeredServices = this.container.getRegisteredServices();
      
      // Validate critical services are available
      const criticalServices = [
        'dbConnection',
        'aiEngine',
        'userMemoryService',
        'scoringEngine',
        'workflowEngine'
      ];
      
      const allCriticalAvailable = criticalServices.every(service => 
        registeredServices.includes(service)
      );
      
      const isValid = allCriticalAvailable &&
                     healthInfo.totalServices > 0 &&
                     healthInfo.initializedServices > 0;
      
      result = {
        testName: 'Service Integration',
        status: isValid ? 'PASS' : 'FAIL',
        duration: Date.now() - startTime,
        details: {
          totalServices: healthInfo.totalServices,
          initializedServices: healthInfo.initializedServices,
          criticalServicesAvailable: allCriticalAvailable,
          healthInfo
        }
      };
      
      if (!isValid) {
        result.errors = ['Service integration validation failed'];
      }
    } catch (error) {
      result = {
        testName: 'Service Integration',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: (error as Error).message },
        errors: [(error as Error).message]
      };
    }
    
    this.testResults.push(result);
  }

  private printResults(result: any): void {
    console.log('\n=== SYSTEM INTEGRATION TEST RESULTS ===');
    console.log(`Overall Status: ${result.overall}`);
    console.log(`Total Tests: ${result.summary.totalTests}`);
    console.log(`Passed: ${result.summary.passedTests}`);
    console.log(`Failed: ${result.summary.failedTests}`);
    console.log(`Duration: ${result.summary.totalDuration}ms\n`);
    
    console.log('=== Individual Test Results ===');
    result.results.forEach((test: IntegrationTestResult) => {
      console.log(`${test.status}: ${test.testName} (${test.duration}ms)`);
      if (test.status === 'FAIL' && test.errors) {
        console.log(`  Errors: ${test.errors.join(', ')}`);
      }
      console.log(`  Details: ${JSON.stringify(test.details, null, 2)}\n`);
    });
  }
}
