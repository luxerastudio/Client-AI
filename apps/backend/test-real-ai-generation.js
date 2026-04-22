// Real AI Generation Test - Verify OpenAI Integration
const http = require('http');

class AIGenerationTester {
  constructor(baseUrl = 'http://localhost:3003') {
    this.baseUrl = baseUrl;
    this.testResults = [];
  }

  async makeRequest(method, path, payload = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3003,
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
              headers: res.headers,
              json: jsonData,
              raw: data
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              json: null,
              raw: data
            });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (payload) {
        req.write(JSON.stringify(payload));
      }
      req.end();
    });
  }

  async testRealAIGeneration() {
    console.log('=== REAL AI GENERATION TEST ===\n');
    
    const testPrompt = 'Explain what is artificial intelligence in simple terms';
    const testPayload = {
      prompt: testPrompt
    };

    console.log('Test Configuration:');
    console.log('Endpoint: POST /api/v1/ai/generate');
    console.log('Prompt:', testPrompt);
    console.log('Expected: Real OpenAI response (not mock)\n');

    try {
      const startTime = Date.now();
      const response = await this.makeRequest('POST', '/api/v1/ai/generate', testPayload);
      const responseTime = Date.now() - startTime;

      console.log(`Response received in ${responseTime}ms`);
      console.log(`Status Code: ${response.statusCode}`);
      
      if (response.statusCode !== 200) {
        console.log('Error Response:', response.json);
        return {
          success: false,
          error: `HTTP ${response.statusCode}`,
          response: response.json
        };
      }

      const data = response.json;
      console.log('\n=== RESPONSE ANALYSIS ===');

      // Check 1: Response structure
      const hasSuccess = data.success === true;
      const hasContent = !!data.data?.content;
      const hasUsage = !!data.data?.usage;
      const hasModel = !!data.data?.model;

      console.log(`Response Structure:`);
      console.log(`  success: ${hasSuccess}`);
      console.log(`  content: ${hasContent}`);
      console.log(`  usage: ${hasUsage}`);
      console.log(`  model: ${hasModel}`);

      // Check 2: Content analysis
      const content = data.data?.content || '';
      const isMock = content.toLowerCase().includes('mock');
      const isMeaningful = content.length > 50 && content.split(' ').length > 10;
      const containsAIClaims = content.toLowerCase().includes('artificial intelligence') || 
                            content.toLowerCase().includes('ai') ||
                            content.toLowerCase().includes('machine learning');

      console.log(`\nContent Analysis:`);
      console.log(`  Length: ${content.length} characters`);
      console.log(`  Words: ${content.split(' ').length}`);
      console.log(`  Contains "mock": ${isMock}`);
      console.log(`  Is meaningful: ${isMeaningful}`);
      console.log(`  Contains AI concepts: ${containsAIClaims}`);

      // Check 3: Token usage analysis
      const usage = data.data?.usage || {};
      const hasTokenInfo = usage.promptTokens && usage.completionTokens && usage.totalTokens;
      const tokensAreRealistic = usage.totalTokens > 0 && usage.totalTokens < 10000;
      const tokensNotStatic = usage.totalTokens !== 100 && usage.totalTokens !== 200;

      console.log(`\nToken Usage Analysis:`);
      console.log(`  Prompt tokens: ${usage.promptTokens || 'N/A'}`);
      console.log(`  Completion tokens: ${usage.completionTokens || 'N/A'}`);
      console.log(`  Total tokens: ${usage.totalTokens || 'N/A'}`);
      console.log(`  Realistic token count: ${tokensAreRealistic}`);
      console.log(`  Not static numbers: ${tokensNotStatic}`);

      // Check 4: Model information
      const model = data.data?.model || '';
      const isRealModel = model && (model.includes('gpt') || model.includes('claude') || model.includes('openai'));

      console.log(`\nModel Information:`);
      console.log(`  Model: ${model}`);
      console.log(`  Real model: ${isRealModel}`);

      // Check 5: Response time analysis
      const isReasonableTime = responseTime > 500 && responseTime < 30000; // Real AI takes time

      console.log(`\nResponse Time Analysis:`);
      console.log(`  Response time: ${responseTime}ms`);
      console.log(`  Reasonable for real AI: ${isReasonableTime}`);

      // Overall assessment
      const checks = {
        hasSuccess,
        hasContent,
        hasUsage,
        hasModel,
        notMock: !isMock,
        isMeaningful,
        containsAIClaims,
        hasTokenInfo,
        tokensAreRealistic,
        tokensNotStatic,
        isRealModel,
        isReasonableTime
      };

      const passedChecks = Object.values(checks).filter(check => check === true).length;
      const totalChecks = Object.keys(checks).length;
      const overallScore = (passedChecks / totalChecks) * 100;

      console.log(`\n=== OVERALL ASSESSMENT ===`);
      console.log(`Checks passed: ${passedChecks}/${totalChecks}`);
      console.log(`Score: ${overallScore.toFixed(1)}%`);
      console.log(`Status: ${overallScore >= 80 ? 'REAL AI' : 'LIKELY MOCK/ERROR'}`);

      const isRealAI = overallScore >= 80 && !isMock;

      return {
        success: isRealAI,
        score: overallScore,
        checks,
        content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        usage,
        model,
        responseTime,
        fullResponse: data
      };

    } catch (error) {
      console.log('Request Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testMultipleRequests() {
    console.log('\n=== MULTIPLE REQUESTS TEST ===');
    console.log('Testing for different responses each time...\n');

    const testPrompt = 'What is the capital of France?';
    const responses = [];

    for (let i = 1; i <= 3; i++) {
      console.log(`Request ${i}:`);
      try {
        const response = await this.makeRequest('POST', '/api/v1/ai/generate', {
          prompt: testPrompt
        });

        if (response.statusCode === 200 && response.json?.data?.content) {
          const content = response.json.data.content;
          responses.push(content);
          console.log(`  Success: ${content.substring(0, 100)}...`);
        } else {
          console.log(`  Failed: ${response.statusCode}`);
          break;
        }
      } catch (error) {
        console.log(`  Error: ${error.message}`);
        break;
      }
    }

    // Check if responses are different
    const responsesAreDifferent = responses.length >= 2 && 
      responses.some((response, index) => {
        if (index === 0) return false;
        return response !== responses[0];
      });

    console.log(`\nMultiple Requests Results:`);
    console.log(`  Responses received: ${responses.length}`);
    console.log(`  Responses are different: ${responsesAreDifferent}`);
    console.log(`  Indicates real AI: ${responsesAreDifferent}`);

    return {
      responsesCount: responses.length,
      responsesAreDifferent,
      responses: responses.map(r => r.substring(0, 100) + '...')
    };
  }

  async runFullTest() {
    console.log('Starting Real AI Generation Test...\n');

    // Test 1: Single request analysis
    const singleResult = await this.testRealAIGeneration();

    // Test 2: Multiple requests for variability
    const multipleResult = await this.testMultipleRequests();

    console.log('\n=== FINAL RESULTS ===');
    console.log(`Single Request Test: ${singleResult.success ? 'PASS' : 'FAIL'}`);
    console.log(`Multiple Requests Test: ${multipleResult.responsesAreDifferent ? 'PASS' : 'FAIL'}`);
    
    const overallSuccess = singleResult.success && multipleResult.responsesAreDifferent;
    console.log(`Overall: ${overallSuccess ? 'REAL AI CONFIRMED' : 'MOCK/ERROR SUSPECTED'}`);

    if (overallSuccess) {
      console.log('\nOpenAI integration is working properly!');
      console.log('Responses are meaningful, varied, and use realistic token counts.');
    } else {
      console.log('\nIssues detected with AI integration.');
      console.log('Check for mock data, configuration issues, or API problems.');
    }

    return {
      overallSuccess,
      singleRequest: singleResult,
      multipleRequests: multipleResult
    };
  }
}

// Run the test
const tester = new AIGenerationTester();
tester.runFullTest().catch(console.error);
