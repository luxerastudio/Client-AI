// Simple integration test script for system validation
const http = require('http');

class IntegrationTester {
  constructor(baseUrl = 'http://localhost:3002') {
    this.baseUrl = baseUrl;
    this.testResults = [];
  }

  async makeRequest(method, path, payload = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3002,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({
              statusCode: res.statusCode,
              json: jsonData
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              json: { raw: data }
            });
          }
        });
      });

      req.on('error', reject);

      if (payload) {
        req.write(JSON.stringify(payload));
      }
      req.end();
    });
  }

  async runTest(testName, testFunction) {
    console.log(`Running: ${testName}`);
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        status: result.success ? 'PASS' : 'FAIL',
        duration,
        details: result.details || {},
        errors: result.errors || []
      });
      
      console.log(`${result.success ? 'PASS' : 'FAIL'}: ${testName} (${duration}ms)`);
      if (!result.success && result.errors) {
        console.log(`  Errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        testName,
        status: 'FAIL',
        duration,
        details: { error: error.message },
        errors: [error.message]
      });
      
      console.log(`FAIL: ${testName} (${duration}ms)`);
      console.log(`  Error: ${error.message}`);
    }
  }

  async testHealthEndpoint() {
    return this.runTest('Health Endpoint', async () => {
      const response = await this.makeRequest('GET', '/health');
      
      return {
        success: response.statusCode === 200 && 
                response.json?.status === 'healthy',
        details: {
          statusCode: response.statusCode,
          status: response.json?.status,
          services: response.json?.services || []
        },
        errors: response.statusCode !== 200 ? ['Health check failed'] : []
      };
    });
  }

  async testAIGeneration() {
    return this.runTest('AI Generation', async () => {
      const testUserId = 'integration-test-user-' + Date.now();
      
      const response = await this.makeRequest('POST', '/api/v1/ai/generate', {
        prompt: 'Write a short poem about artificial intelligence',
        userId: testUserId,
        enableMemory: true
      });
      
      return {
        success: response.statusCode === 200 && 
                response.json?.success === true &&
                response.json?.data?.content,
        details: {
          statusCode: response.statusCode,
          hasContent: !!response.json?.data?.content,
          memoryEnhancement: response.json?.data?.memoryEnhancement || {},
          userId: testUserId
        },
        errors: response.statusCode !== 200 ? ['AI generation failed'] : []
      };
    });
  }

  async testScoringSystem() {
    return this.runTest('Scoring System', async () => {
      const response = await this.makeRequest('POST', '/api/v1/scoring/calculate', {
        content: 'This is a comprehensive article about artificial intelligence.',
        factors: [
          { name: 'readability', weight: 0.3, value: 0.8 },
          { name: 'coherence', weight: 0.4, value: 0.9 },
          { name: 'accuracy', weight: 0.3, value: 0.85 }
        ]
      });
      
      return {
        success: response.statusCode === 200 && 
                response.json?.success === true &&
                typeof response.json?.data?.score === 'number',
        details: {
          statusCode: response.statusCode,
          score: response.json?.data?.score,
          hasBreakdown: !!response.json?.data?.breakdown,
          isRealScore: typeof response.json?.data?.score === 'number'
        },
        errors: response.statusCode !== 200 ? ['Scoring failed'] : []
      };
    });
  }

  async testWorkflowExecution() {
    return this.runTest('Workflow Execution', async () => {
      const response = await this.makeRequest('POST', '/api/v1/workflow/execute', {
        templateId: 'content-generation',
        input: {
          topic: 'machine learning',
          style: 'technical',
          length: 'medium'
        }
      });
      
      return {
        success: response.statusCode === 200 && 
                response.json?.success === true,
        details: {
          statusCode: response.statusCode,
          executionId: response.json?.data?.executionId,
          status: response.json?.data?.status
        },
        errors: response.statusCode !== 200 ? ['Workflow execution failed'] : []
      };
    });
  }

  async testMemorySystem() {
    return this.runTest('Memory System', async () => {
      const testUserId = 'memory-test-user-' + Date.now();
      
      // First interaction
      const response1 = await this.makeRequest('POST', '/api/v1/ai/generate', {
        prompt: 'What is the capital of France?',
        userId: testUserId,
        enableMemory: true
      });
      
      // Second interaction
      const response2 = await this.makeRequest('POST', '/api/v1/ai/generate', {
        prompt: 'Tell me more about that city',
        userId: testUserId,
        enableMemory: true
      });
      
      // Check memory stats
      const memoryResponse = await this.makeRequest('GET', `/api/v1/memory/${testUserId}`);
      
      return {
        success: response1.statusCode === 200 && 
                response2.statusCode === 200 &&
                memoryResponse.statusCode === 200,
        details: {
          firstInteraction: response1.statusCode,
          secondInteraction: response2.statusCode,
          memoryStats: memoryResponse.statusCode,
          interactionCount: memoryResponse.json?.data?.memoryStats?.totalInteractions
        },
        errors: response1.statusCode !== 200 || response2.statusCode !== 200 || memoryResponse.statusCode !== 200 
          ? ['Memory system failed'] : []
      };
    });
  }

  async testFullPipeline() {
    return this.runTest('Full Pipeline Flow', async () => {
      const testUserId = 'pipeline-test-user-' + Date.now();
      
      // Step 1: Generate AI content
      const aiResponse = await this.makeRequest('POST', '/api/v1/ai/generate', {
        prompt: 'Explain machine learning in simple terms',
        userId: testUserId,
        enableMemory: true
      });
      
      // Step 2: Score the content
      const scoringResponse = await this.makeRequest('POST', '/api/v1/scoring/calculate', {
        content: aiResponse.json?.data?.content || '',
        factors: [
          { name: 'clarity', weight: 0.4, value: 0.8 },
          { name: 'completeness', weight: 0.6, value: 0.9 }
        ]
      });
      
      // Step 3: Execute workflow
      const workflowResponse = await this.makeRequest('POST', '/api/v1/workflow/execute', {
        templateId: 'content-refinement',
        input: {
          originalContent: aiResponse.json?.data?.content || '',
          targetScore: scoringResponse.json?.data?.score || 0.8
        }
      });
      
      const allSuccessful = aiResponse.statusCode === 200 &&
                          scoringResponse.statusCode === 200 &&
                          workflowResponse.statusCode === 200;
      
      return {
        success: allSuccessful,
        details: {
          aiGeneration: aiResponse.statusCode,
          scoring: scoringResponse.statusCode,
          workflow: workflowResponse.statusCode,
          hasContent: !!aiResponse.json?.data?.content,
          hasScore: typeof scoringResponse.json?.data?.score === 'number',
          hasExecutionId: !!workflowResponse.json?.data?.executionId
        },
        errors: allSuccessful ? [] : ['Pipeline flow failed at one or more stages']
      };
    });
  }

  async runFullIntegrationSuite() {
    console.log('Starting Full System Integration Validation...\n');
    
    const startTime = Date.now();
    
    // Run all tests
    await this.testHealthEndpoint();
    await this.testAIGeneration();
    await this.testScoringSystem();
    await this.testWorkflowExecution();
    await this.testMemorySystem();
    await this.testFullPipeline();
    
    const totalDuration = Date.now() - startTime;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    
    // Print results
    console.log('\n=== SYSTEM INTEGRATION TEST RESULTS ===');
    console.log(`Overall Status: ${failedTests === 0 ? 'PASS' : 'FAIL'}`);
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Duration: ${totalDuration}ms\n`);
    
    console.log('=== Individual Test Results ===');
    this.testResults.forEach(test => {
      console.log(`${test.status}: ${test.testName} (${test.duration}ms)`);
      if (test.status === 'FAIL' && test.errors.length > 0) {
        console.log(`  Errors: ${test.errors.join(', ')}`);
      }
    });
    
    return {
      overall: failedTests === 0 ? 'PASS' : 'FAIL',
      results: this.testResults,
      summary: {
        totalTests: this.testResults.length,
        passedTests,
        failedTests,
        totalDuration
      }
    };
  }
}

// Run the integration test
const tester = new IntegrationTester();
tester.runFullIntegrationSuite().catch(console.error);
