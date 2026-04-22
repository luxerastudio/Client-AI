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

// Test user memory persistence
async function testUserMemoryPersistence() {
  console.log('=== User Memory Persistence Test ===');
  
  const baseUrl = 'http://localhost:3001';
  const testUserId = 'user123';
  const sessionId = 'test-session-' + Date.now();
  const memoryResults = [];
  
  try {
    // Step 1: Send first AI request with userId
    console.log('1. Sending first AI request with userId...');
    
    const aiOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/ai/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const firstRequest = {
      prompt: 'My name is John and I work in marketing. I need help with social media campaigns.',
      userId: testUserId,
      sessionId: sessionId,
      enableMemory: true,
      enablePersonalization: true
    };
    
    const firstResponse = await makeRequest(aiOptions, firstRequest);
    console.log(`   First AI request response: ${firstResponse.statusCode}`);
    
    if (firstResponse.statusCode === 200) {
      const firstResult = JSON.parse(firstResponse.body);
      console.log('   First AI request successful');
      
      if (firstResult.data?.content) {
        console.log(`   Response: ${firstResult.data.content.substring(0, 150)}...`);
        
        memoryResults.push({
          type: 'first_request',
          prompt: firstRequest.prompt,
          response: firstResult.data.content,
          memoryEnhancement: firstResult.data.memoryEnhancement,
          timestamp: new Date().toISOString()
        });
        
        if (firstResult.data.memoryEnhancement) {
          console.log(`   Memory enhancement: ${JSON.stringify(firstResult.data.memoryEnhancement)}`);
        } else {
          console.log('   WARNING: No memory enhancement detected');
        }
      }
    } else {
      console.log(`   First AI request failed: ${firstResponse.body}`);
      return;
    }
    
    // Small delay to ensure memory is stored
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Send second AI request with same userId
    console.log('2. Sending second AI request with same userId...');
    
    const secondRequest = {
      prompt: 'Can you suggest some specific campaign ideas for me?',
      userId: testUserId,
      sessionId: sessionId,
      enableMemory: true,
      enablePersonalization: true
    };
    
    const secondResponse = await makeRequest(aiOptions, secondRequest);
    console.log(`   Second AI request response: ${secondResponse.statusCode}`);
    
    if (secondResponse.statusCode === 200) {
      const secondResult = JSON.parse(secondResponse.body);
      console.log('   Second AI request successful');
      
      if (secondResult.data?.content) {
        console.log(`   Response: ${secondResult.data.content.substring(0, 150)}...`);
        
        memoryResults.push({
          type: 'second_request',
          prompt: secondRequest.prompt,
          response: secondResult.data.content,
          memoryEnhancement: secondResult.data.memoryEnhancement,
          timestamp: new Date().toISOString()
        });
        
        if (secondResult.data.memoryEnhancement) {
          console.log(`   Memory enhancement: ${JSON.stringify(secondResult.data.memoryEnhancement)}`);
        } else {
          console.log('   WARNING: No memory enhancement detected');
        }
      }
    } else {
      console.log(`   Second AI request failed: ${secondResponse.body}`);
      return;
    }
    
    // Step 3: Send third AI request to test memory persistence
    console.log('3. Sending third AI request to test memory persistence...');
    
    const thirdRequest = {
      prompt: 'What do you remember about my background?',
      userId: testUserId,
      sessionId: sessionId,
      enableMemory: true,
      enablePersonalization: true
    };
    
    const thirdResponse = await makeRequest(aiOptions, thirdRequest);
    console.log(`   Third AI request response: ${thirdResponse.statusCode}`);
    
    if (thirdResponse.statusCode === 200) {
      const thirdResult = JSON.parse(thirdResponse.body);
      console.log('   Third AI request successful');
      
      if (thirdResult.data?.content) {
        console.log(`   Response: ${thirdResult.data.content.substring(0, 150)}...`);
        
        memoryResults.push({
          type: 'memory_test',
          prompt: thirdRequest.prompt,
          response: thirdResult.data.content,
          memoryEnhancement: thirdResult.data.memoryEnhancement,
          timestamp: new Date().toISOString()
        });
        
        if (thirdResult.data.memoryEnhancement) {
          console.log(`   Memory enhancement: ${JSON.stringify(thirdResult.data.memoryEnhancement)}`);
        } else {
          console.log('   WARNING: No memory enhancement detected');
        }
      }
    } else {
      console.log(`   Third AI request failed: ${thirdResponse.body}`);
      return;
    }
    
    // Step 4: Check if previous context is used
    console.log('4. Checking if previous context is used...');
    
    const firstResponseContent = memoryResults[0].response.toLowerCase();
    const secondResponseContent = memoryResults[1].response.toLowerCase();
    const thirdResponseContent = memoryResults[2].response.toLowerCase();
    
    // Check if second response references information from first request
    const contextIndicators = [
      'john',
      'marketing',
      'social media',
      'campaign',
      'work in marketing',
      'based on what you told me',
      'remembering that',
      'from our conversation'
    ];
    
    let secondResponseUsesContext = false;
    let thirdResponseUsesContext = false;
    
    for (const indicator of contextIndicators) {
      if (secondResponseContent.includes(indicator)) {
        secondResponseUsesContext = true;
        console.log(`   Second response uses context: "${indicator}"`);
      }
      
      if (thirdResponseContent.includes(indicator)) {
        thirdResponseUsesContext = true;
        console.log(`   Third response uses context: "${indicator}"`);
      }
    }
    
    if (secondResponseUsesContext) {
      console.log('   SUCCESS: Second response uses previous context');
    } else {
      console.log('   WARNING: Second response may not use previous context');
    }
    
    if (thirdResponseUsesContext) {
      console.log('   SUCCESS: Third response uses previous context');
    } else {
      console.log('   WARNING: Third response may not use previous context');
    }
    
    // Step 5: Test memory retrieval directly
    console.log('5. Testing memory retrieval directly...');
    
    try {
      const memoryOptions = {
        hostname: 'localhost',
        port: 3001,
        path: `/api/v1/memory/${testUserId}/preferences`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const memoryResponse = await makeRequest(memoryOptions);
      console.log(`   Memory retrieval response: ${memoryResponse.statusCode}`);
      
      if (memoryResponse.statusCode === 200) {
        const memoryData = JSON.parse(memoryResponse.body);
        console.log('   Memory retrieval successful');
        console.log(`   Memory data: ${JSON.stringify(memoryData).substring(0, 200)}...`);
      } else {
        console.log(`   Memory retrieval failed: ${memoryResponse.body}`);
      }
    } catch (error) {
      console.log(`   Memory retrieval error: ${error.message}`);
    }
    
    // Step 6: Test prompt history
    console.log('6. Testing prompt history...');
    
    try {
      const historyOptions = {
        hostname: 'localhost',
        port: 3001,
        path: `/api/v1/memory/${testUserId}/prompt-history`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const historyResponse = await makeRequest(historyOptions);
      console.log(`   Prompt history response: ${historyResponse.statusCode}`);
      
      if (historyResponse.statusCode === 200) {
        const historyData = JSON.parse(historyResponse.body);
        console.log('   Prompt history retrieval successful');
        
        if (historyData.data && Array.isArray(historyData.data)) {
          console.log(`   History entries: ${historyData.data.length}`);
          historyData.data.slice(0, 3).forEach((entry, index) => {
            console.log(`     Entry ${index + 1}: ${entry.prompt?.substring(0, 50)}...`);
          });
        } else {
          console.log('   No history entries found');
        }
      } else {
        console.log(`   Prompt history failed: ${historyResponse.body}`);
      }
    } catch (error) {
      console.log(`   Prompt history error: ${error.message}`);
    }
    
    // Step 7: Test memory stats
    console.log('7. Testing memory stats...');
    
    try {
      const statsOptions = {
        hostname: 'localhost',
        port: 3001,
        path: `/api/v1/ai/memory/${testUserId}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const statsResponse = await makeRequest(statsOptions);
      console.log(`   Memory stats response: ${statsResponse.statusCode}`);
      
      if (statsResponse.statusCode === 200) {
        const statsData = JSON.parse(statsResponse.body);
        console.log('   Memory stats retrieval successful');
        console.log(`   Memory stats: ${JSON.stringify(statsData.data).substring(0, 200)}...`);
      } else {
        console.log(`   Memory stats failed: ${statsResponse.body}`);
      }
    } catch (error) {
      console.log(`   Memory stats error: ${error.message}`);
    }
    
    // Step 8: Analyze response quality improvement
    console.log('8. Analyzing response quality improvement...');
    
    const responseLengths = memoryResults.map(r => r.response.length);
    const avgResponseLength = responseLengths.reduce((sum, len) => sum + len, 0) / responseLengths.length;
    
    console.log(`   Average response length: ${Math.round(avgResponseLength)} characters`);
    console.log(`   First response length: ${responseLengths[0]} characters`);
    console.log(`   Second response length: ${responseLengths[1]} characters`);
    console.log(`   Third response length: ${responseLengths[2]} characters`);
    
    // Check if responses become more personalized over time
    const personalizationIndicators = [
      'john',
      'your',
      'you',
      'specifically for you',
      'based on your',
      'tailored to'
    ];
    
    let personalizationScore = 0;
    memoryResults.forEach((result, index) => {
      let score = 0;
      const content = result.response.toLowerCase();
      
      personalizationIndicators.forEach(indicator => {
        if (content.includes(indicator)) {
          score++;
        }
      });
      
      personalizationScore += score;
      console.log(`   Response ${index + 1} personalization score: ${score}`);
    });
    
    console.log(`   Total personalization score: ${personalizationScore}`);
    
    // Summary
    console.log('\n=== User Memory Persistence Test Results ===');
    console.log(`First AI request: ${firstResponse.statusCode === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Second AI request: ${secondResponse.statusCode === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Third AI request: ${thirdResponse.statusCode === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Context usage (2nd): ${secondResponseUsesContext ? 'SUCCESS' : 'WARNING'}`);
    console.log(`Context usage (3rd): ${thirdResponseUsesContext ? 'SUCCESS' : 'WARNING'}`);
    console.log(`Personalization: ${personalizationScore >= 2 ? 'SUCCESS' : 'PARTIAL'}`);
    
    const memoryWorking = 
      firstResponse.statusCode === 200 &&
      secondResponse.statusCode === 200 &&
      thirdResponse.statusCode === 200 &&
      (secondResponseUsesContext || thirdResponseUsesContext);
    
    console.log(`\nOverall: ${memoryWorking ? 'MEMORY SYSTEM WORKING' : 'MEMORY SYSTEM ISSUES DETECTED'}`);
    
    // Show sample results
    console.log('\n=== Sample Memory Results ===');
    memoryResults.forEach((result, index) => {
      console.log(`Request ${index + 1} (${result.type}):`);
      console.log(`  Prompt: "${result.prompt}"`);
      console.log(`  Response: ${result.response.substring(0, 200)}...`);
      console.log(`  Memory Enhancement: ${result.memoryEnhancement ? 'YES' : 'NO'}`);
      console.log('');
    });
    
    return memoryWorking;
    
  } catch (error) {
    console.error('Error during user memory persistence test:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('Server is not running. Please start the server first.');
    }
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testUserMemoryPersistence()
    .then((success) => {
      if (success) {
        console.log('User memory persistence test PASSED');
        process.exit(0);
      } else {
        console.log('User memory persistence test FAILED');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('User memory persistence test failed:', error);
      process.exit(1);
    });
}

module.exports = { testUserMemoryPersistence };
