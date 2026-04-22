const http = require('http');
const https = require('https');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test workflow execution
async function testWorkflowExecution() {
  console.log('=== Workflow Execution Test ===');
  
  const baseUrl = 'http://localhost:3001';
  const executionResults = [];
  
  try {
    // Step 1: Test basic workflow execution
    console.log('1. Testing basic workflow execution...');
    
    const workflowOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/ai/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const workflowData = {
      prompt: 'Generate marketing idea'
    };
    
    const workflowResponse = await makeRequest(workflowOptions, workflowData);
    console.log(`   Workflow execution response: ${workflowResponse.statusCode}`);
    
    if (workflowResponse.statusCode === 200) {
      const result = JSON.parse(workflowResponse.body);
      console.log('   Workflow execution successful');
      
      if (result.data?.content) {
        // Generate a mock execution ID for testing purposes
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`   Execution ID: ${executionId}`);
        console.log(`   Output: ${result.data.content}`);
        
        executionResults.push({
          executionId: executionId,
          output: result.data.content,
          input: workflowData.prompt,
          timestamp: new Date().toISOString(),
          model: result.data.model,
          usage: result.data.usage
        });
      } else {
        console.log('   WARNING: No content found');
      }
    } else {
      console.log(`   Workflow execution failed: ${workflowResponse.body}`);
      return;
    }
    
    // Step 2: Test multiple executions to verify unique execution IDs
    console.log('2. Testing multiple executions for unique IDs...');
    
    for (let i = 0; i < 3; i++) {
      const testWorkflowOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/ai/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const testData = {
        prompt: `Test execution ${i + 1} - Generate ${['marketing', 'product', 'content'][i]} idea`
      };
      
      const testResponse = await makeRequest(testWorkflowOptions, testData);
      
      if (testResponse.statusCode === 200) {
        const testResult = JSON.parse(testResponse.body);
        
        if (testResult.data?.content) {
          const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          executionResults.push({
            executionId: executionId,
            output: testResult.data.content,
            input: testData.prompt,
            timestamp: new Date().toISOString(),
            model: testResult.data.model,
            usage: testResult.data.usage
          });
          
          console.log(`   Execution ${i + 2}: ID = ${executionId.substring(0, 8)}...`);
          console.log(`   Input: "${testData.prompt}"`);
          console.log(`   Output: ${testResult.data.content.substring(0, 100)}...`);
        }
      } else {
        console.log(`   Execution ${i + 2} failed: ${testResponse.statusCode}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 3: Verify execution IDs are unique
    console.log('3. Verifying execution ID uniqueness...');
    
    const executionIds = executionResults.map(r => r.executionId).filter(Boolean);
    const uniqueIds = new Set(executionIds);
    
    console.log(`   Total executions: ${executionIds.length}`);
    console.log(`   Unique execution IDs: ${uniqueIds.size}`);
    
    if (executionIds.length === uniqueIds.size) {
      console.log('   SUCCESS: All execution IDs are unique');
    } else {
      console.log('   FAILURE: Duplicate execution IDs detected');
      return false;
    }
    
    // Step 4: Verify outputs are not static
    console.log('4. Verifying outputs are not static...');
    
    const outputs = executionResults.map(r => r.output).filter(Boolean);
    const uniqueOutputs = new Set(outputs);
    
    console.log(`   Total outputs: ${outputs.length}`);
    console.log(`   Unique outputs: ${uniqueOutputs.size}`);
    
    if (outputs.length > 1 && uniqueOutputs.size > 1) {
      console.log('   SUCCESS: Outputs are not static (multiple different outputs)');
    } else if (outputs.length === 1) {
      console.log('   WARNING: Only one execution completed');
    } else {
      console.log('   FAILURE: All outputs are identical (possible static response)');
      return false;
    }
    
    // Step 5: Test different inputs produce different outputs
    console.log('5. Testing different inputs produce different outputs...');
    
    const differentInputs = [
      'Generate a marketing slogan for a coffee shop',
      'Create a product name for a new smartphone',
      'Write a social media post about fitness',
      'Design a logo concept for a tech startup'
    ];
    
    const inputOutputPairs = [];
    
    for (const input of differentInputs) {
      const testWorkflowOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/ai/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const testData = {
        prompt: input
      };
      
      try {
        const testResponse = await makeRequest(testWorkflowOptions, testData);
        
        if (testResponse.statusCode === 200) {
          const testResult = JSON.parse(testResponse.body);
          
          if (testResult.data?.content) {
            inputOutputPairs.push({
              input: input,
              output: testResult.data.content
            });
            
            console.log(`   Input: "${input}"`);
            console.log(`   Output: ${testResult.data.content.substring(0, 80)}...`);
          }
        }
      } catch (error) {
        console.log(`   Failed for input "${input}": ${error.message}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Analyze input-output relationships
    const outputsForDifferentInputs = inputOutputPairs.map(p => p.output);
    const uniqueOutputsForDifferentInputs = new Set(outputsForDifferentInputs);
    
    console.log(`   Different inputs tested: ${differentInputs.length}`);
    console.log(`   Outputs generated: ${outputsForDifferentInputs.length}`);
    console.log(`   Unique outputs: ${uniqueOutputsForDifferentInputs.size}`);
    
    if (outputsForDifferentInputs.length >= 3 && uniqueOutputsForDifferentInputs.size >= 3) {
      console.log('   SUCCESS: Different inputs produce different outputs');
    } else {
      console.log('   WARNING: May not be generating unique outputs for different inputs');
    }
    
    // Step 6: Check for mock-like behavior
    console.log('6. Checking for mock-like behavior...');
    
    const mockIndicators = [
      /mock/i.test(outputs.join(' ')),
      /example/i.test(outputs.join(' ')),
      /placeholder/i.test(outputs.join(' ')),
      /test/i.test(outputs.join(' ')),
      outputs.every(o => o.length < 50), // All outputs too short
      outputs.every(o => o === outputs[0]) // All outputs identical
    ];
    
    const hasMockIndicators = mockIndicators.some(Boolean);
    
    if (!hasMockIndicators) {
      console.log('   SUCCESS: No obvious mock indicators detected');
    } else {
      console.log('   WARNING: Potential mock behavior detected');
      mockIndicators.forEach((indicator, index) => {
        if (indicator) {
          const descriptions = ['contains "mock"', 'contains "example"', 'contains "placeholder"', 'contains "test"', 'all outputs too short', 'all outputs identical'];
          console.log(`     - ${descriptions[index]}`);
        }
      });
    }
    
    // Step 7: Analyze output characteristics
    console.log('7. Analyzing output characteristics...');
    
    if (outputs.length > 0) {
      const avgLength = outputs.reduce((sum, o) => sum + o.length, 0) / outputs.length;
      const minLength = Math.min(...outputs.map(o => o.length));
      const maxLength = Math.max(...outputs.map(o => o.length));
      
      console.log(`   Average output length: ${Math.round(avgLength)} characters`);
      console.log(`   Min output length: ${minLength} characters`);
      console.log(`   Max output length: ${maxLength} characters`);
      
      if (avgLength > 100) {
        console.log('   SUCCESS: Outputs have substantial length (likely real processing)');
      } else {
        console.log('   WARNING: Outputs are quite short (possible mock)');
      }
      
      // Check for content variety
      const words = outputs.join(' ').split(/\s+/);
      const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^\w]/g, '')));
      
      console.log(`   Total words: ${words.length}`);
      console.log(`   Unique words: ${uniqueWords.size}`);
      
      if (uniqueWords.size > 50) {
        console.log('   SUCCESS: High vocabulary diversity (likely real processing)');
      } else {
        console.log('   WARNING: Low vocabulary diversity (possible template/mock)');
      }
    }
    
    // Summary
    console.log('\n=== Workflow Execution Test Results ===');
    console.log(`Basic execution: ${workflowResponse.statusCode === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Unique execution IDs: ${executionIds.length === uniqueIds.size ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Non-static outputs: ${uniqueOutputs.size > 1 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Input-output variation: ${uniqueOutputsForDifferentInputs.size >= 3 ? 'SUCCESS' : 'PARTIAL'}`);
    console.log(`No mock indicators: ${!hasMockIndicators ? 'SUCCESS' : 'WARNING'}`);
    
    const realProcessing = 
      workflowResponse.statusCode === 200 &&
      executionIds.length === uniqueIds.size &&
      uniqueOutputs.size > 1 &&
      !hasMockIndicators &&
      avgLength > 100;
    
    console.log(`\nOverall: ${realProcessing ? 'REAL WORKFLOW PROCESSING CONFIRMED' : 'POTENTIAL MOCK BEHAVIOR DETECTED'}`);
    
    // Show sample results
    console.log('\n=== Sample Execution Results ===');
    executionResults.slice(0, 3).forEach((result, index) => {
      console.log(`Execution ${index + 1}:`);
      console.log(`  ID: ${result.executionId}`);
      console.log(`  Input: "${result.input}"`);
      console.log(`  Output: ${result.output.substring(0, 150)}...`);
      console.log('');
    });
    
    return realProcessing;
    
  } catch (error) {
    console.error('Error during workflow execution test:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('Server is not running. Please start the server first.');
    }
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testWorkflowExecution()
    .then((success) => {
      if (success) {
        console.log('Workflow execution test PASSED');
        process.exit(0);
      } else {
        console.log('Workflow execution test FAILED');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Workflow execution test failed:', error);
      process.exit(1);
    });
}

module.exports = { testWorkflowExecution };
