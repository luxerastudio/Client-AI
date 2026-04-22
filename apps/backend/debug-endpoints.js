// Debug script to get detailed error information from endpoints
const http = require('http');

async function debugEndpoint(method, path, payload = null) {
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

    console.log(`\n=== DEBUG: ${method} ${path} ===`);
    if (payload) {
      console.log('Payload:', JSON.stringify(payload, null, 2));
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Headers:', res.headers);
        
        try {
          const jsonData = data ? JSON.parse(data) : {};
          console.log('Response Body:', JSON.stringify(jsonData, null, 2));
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            json: jsonData,
            raw: data
          });
        } catch (e) {
          console.log('Raw Response:', data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            json: null,
            raw: data
          });
        }
      });
    });

    req.on('error', (error) => {
      console.log('Request Error:', error.message);
      reject(error);
    });

    if (payload) {
      req.write(JSON.stringify(payload));
    }
    req.end();
  });
}

async function runDebugTests() {
  console.log('Starting endpoint debugging...\n');

  // Test 1: Health Endpoint
  await debugEndpoint('GET', '/health');

  // Test 2: AI Generation
  await debugEndpoint('POST', '/ai/generate', {
    prompt: 'Write a short poem about artificial intelligence',
    userId: 'debug-test-user',
    enableMemory: true
  });

  // Test 3: Scoring System
  await debugEndpoint('POST', '/scoring/calculate', {
    content: 'This is a comprehensive article about artificial intelligence.',
    factors: [
      { name: 'readability', weight: 0.3, value: 0.8 },
      { name: 'coherence', weight: 0.4, value: 0.9 },
      { name: 'accuracy', weight: 0.3, value: 0.85 }
    ]
  });

  // Test 4: Workflow Execution
  await debugEndpoint('POST', '/workflow/execute', {
    templateId: 'content-generation',
    input: {
      topic: 'machine learning',
      style: 'technical',
      length: 'medium'
    }
  });

  // Test 5: Memory Stats
  await debugEndpoint('GET', '/ai/memory/debug-test-user');

  console.log('\n=== DEBUG COMPLETE ===');
}

runDebugTests().catch(console.error);
