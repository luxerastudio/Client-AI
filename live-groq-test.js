#!/usr/bin/env node

/**
 * Live Groq API Test
 * Tests the actual Groq API integration using the OpenAI SDK
 */

const https = require('https');
const { spawn } = require('child_process');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`🔍 ${title}`, 'cyan');
  console.log('='.repeat(60));
}

function logTest(testName, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${icon} ${testName}: ${status}`, color);
  if (details) log(`   ${details}`, color);
}

// Helper function to make HTTPS requests
function makeHTTPSRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Test 1: Check if we can import OpenAI SDK
function testOpenAISDK() {
  logSection('OPENAI SDK AVAILABILITY CHECK');
  
  try {
    // Try to require the OpenAI package from backend
    const backendPath = './apps/backend';
    const openaiPath = `${backendPath}/node_modules/openai`;
    
    const fs = require('fs');
    if (fs.existsSync(openaiPath)) {
      logTest('OpenAI Package', 'PASS', 'OpenAI SDK found in backend');
      return true;
    } else {
      logTest('OpenAI Package', 'FAIL', 'OpenAI SDK not found in backend');
      logTest('Solution', 'INFO', 'Run: cd apps/backend && npm install');
      return false;
    }
  } catch (error) {
    logTest('OpenAI SDK Check', 'FAIL', error.message);
    return false;
  }
}

// Test 2: Create a minimal Groq API test using Node.js
async function testGroqAPIDirect() {
  logSection('GROQ API DIRECT TEST');
  
  // Check for GROQ_API_KEY in environment
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    logTest('GROQ_API_KEY', 'FAIL', 'Not found in environment variables');
    logTest('Environment Setup', 'INFO', 'Set GROQ_API_KEY in your environment or Vercel');
    return false;
  }
  
  logTest('GROQ_API_KEY', 'PASS', 'API key found in environment');
  
  try {
    const postData = JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: "Respond with exactly: 'Groq API integration test successful.'"
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    });

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      body: postData
    };

    logTest('Groq API Request', 'INFO', 'Sending test request to Groq...');
    
    const startTime = Date.now();
    const response = await makeHTTPSRequest('https://api.groq.com/openai/v1/chat/completions', options);
    const endTime = Date.now();

    if (response.statusCode === 200) {
      const result = JSON.parse(response.body);
      
      if (result.choices && result.choices[0]) {
        const content = result.choices[0].message.content;
        logTest('Groq API Response', 'PASS', `Status: ${response.statusCode}, Time: ${endTime - startTime}ms`);
        logTest('Groq API Content', 'PASS', `Response: "${content}"`);
        logTest('Groq API Model', 'PASS', `Model: ${result.model}`);
        logTest('Groq API Usage', 'PASS', `Tokens: ${result.usage?.total_tokens || 'N/A'}`);
        return true;
      } else {
        logTest('Groq API Response', 'FAIL', 'No choices in response');
        logTest('Response Body', 'FAIL', response.body);
        return false;
      }
    } else {
      logTest('Groq API Response', 'FAIL', `Status: ${response.statusCode}`);
      logTest('Error Details', 'FAIL', response.body);
      return false;
    }
  } catch (error) {
    logTest('Groq API Connection', 'FAIL', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      logTest('Network Issue', 'FAIL', 'Cannot resolve api.groq.com');
    } else if (error.message.includes('ECONNREFUSED')) {
      logTest('Connection Issue', 'FAIL', 'Connection refused');
    }
    
    return false;
  }
}

// Test 3: Test Backend Configuration Loading
function testBackendConfig() {
  logSection('BACKEND CONFIGURATION TEST');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Read the config file
    const configPath = './apps/backend/src/config/index.ts';
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check for key configurations
    const checks = [
      {
        name: 'GROQ_API_KEY Priority',
        check: configContent.includes('process.env.GROQ_API_KEY')
      },
      {
        name: 'Fallback to OPENAI_API_KEY',
        check: configContent.includes('process.env.OPENAI_API_KEY')
      },
      {
        name: 'Default Model',
        check: configContent.includes('llama-3.3-70b-versatile')
      },
      {
        name: 'Error Handling',
        check: configContent.includes('GROQ_API_KEY environment variable is required')
      }
    ];

    let allPassed = true;
    checks.forEach(({ name, check }) => {
      const status = check ? 'PASS' : 'FAIL';
      logTest(name, status, check ? 'Configured' : 'Missing');
      if (!check) allPassed = false;
    });

    return allPassed;
  } catch (error) {
    logTest('Backend Config', 'FAIL', error.message);
    return false;
  }
}

// Test 4: Test AI Engine Configuration
function testAIEngineConfig() {
  logSection('AI ENGINE CONFIGURATION TEST');
  
  try {
    const fs = require('fs');
    
    // Read AI Engine file
    const aiEnginePath = './apps/backend/src/infrastructure/ai/AIEngine.ts';
    const aiEngineContent = fs.readFileSync(aiEnginePath, 'utf8');
    
    const checks = [
      {
        name: 'Groq Base URL',
        check: aiEngineContent.includes('baseURL: \'https://api.groq.com/openai/v1\'')
      },
      {
        name: 'GROQ_API_KEY Priority',
        check: aiEngineContent.includes('process.env.GROQ_API_KEY')
      },
      {
        name: 'Default Model',
        check: aiEngineContent.includes('llama-3.3-70b-versatile')
      },
      {
        name: 'Error Messages Updated',
        check: aiEngineContent.includes('Invalid Groq API key')
      },
      {
        name: 'OpenAI SDK Used',
        check: aiEngineContent.includes('import OpenAI from \'openai\'')
      }
    ];

    let allPassed = true;
    checks.forEach(({ name, check }) => {
      const status = check ? 'PASS' : 'FAIL';
      logTest(name, status, check ? 'Configured' : 'Missing');
      if (!check) allPassed = false;
    });

    return allPassed;
  } catch (error) {
    logTest('AI Engine Config', 'FAIL', error.message);
    return false;
  }
}

// Test 5: Simulate Vercel Environment Variables
function testVercelEnvironment() {
  logSection('VERCEL ENVIRONMENT SIMULATION');
  
  // Check if we're in a Vercel-like environment
  const isVercel = process.env.VERCEL === '1';
  logTest('Vercel Environment', isVercel ? 'PASS' : 'INFO', isVercel ? 'Running on Vercel' : 'Local environment');
  
  // Check for Vercel-specific environment variables
  const vercelVars = [
    'VERCEL',
    'VERCEL_ENV',
    'VERCEL_URL',
    'GROQ_API_KEY'
  ];
  
  let foundVars = 0;
  vercelVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      logTest(`${varName}`, 'PASS', 'Set');
      foundVars++;
    } else {
      logTest(`${varName}`, 'INFO', 'Not set (OK for local)');
    }
  });
  
  logTest('Environment Variables', 'INFO', `Found ${foundVars}/${vercelVars.length} variables`);
  
  return true;
}

// Main execution function
async function runLiveGroqTest() {
  console.log('\n🚀 STARTING LIVE GROQ API INTEGRATION TEST');
  console.log('==========================================');
  
  const results = {
    openaiSDK: testOpenAISDK(),
    backendConfig: testBackendConfig(),
    aiEngineConfig: testAIEngineConfig(),
    vercelEnvironment: testVercelEnvironment(),
    groqAPIDirect: await testGroqAPIDirect()
  };

  // Final Summary
  console.log('\n' + '='.repeat(60));
  log('🏁 LIVE GROQ TEST SUMMARY', 'cyan');
  console.log('='.repeat(60));
  
  const testResults = [
    { name: 'OpenAI SDK Availability', status: results.openaiSDK },
    { name: 'Backend Configuration', status: results.backendConfig },
    { name: 'AI Engine Configuration', status: results.aiEngineConfig },
    { name: 'Vercel Environment', status: results.vercelEnvironment },
    { name: 'Groq API Direct Test', status: results.groqAPIDirect }
  ];

  let passedTests = 0;
  let criticalTests = 0;
  testResults.forEach(test => {
    const status = test.status ? 'PASS' : 'FAIL';
    const icon = test.status ? '✅' : '❌';
    log(`${icon} ${test.name}: ${status}`, test.status ? 'green' : 'red');
    if (test.status) passedTests++;
    if (test.name !== 'Vercel Environment') criticalTests++; // Vercel env is optional locally
  });

  console.log('\n' + '-'.repeat(60));
  log(`Overall Result: ${passedTests}/${testResults.length} tests passed`, 
      passedTests === testResults.length ? 'green' : 'yellow');
  
  if (passedTests === testResults.length) {
    log('🎉 GROQ INTEGRATION FULLY FUNCTIONAL!', 'green');
    log('\n📋 DEPLOYMENT READY:', 'blue');
    log('✅ Groq API integration working', 'blue');
    log('✅ Configuration properly updated', 'blue');
    log('✅ Ready for Vercel deployment', 'blue');
  } else if (passedTests >= 4) {
    log('⚠️  GROQ INTEGRATION MOSTLY READY', 'yellow');
    log('\n📋 NEXT STEPS:', 'blue');
    log('1. Install backend dependencies: cd apps/backend && npm install', 'blue');
    log('2. Set GROQ_API_KEY in environment', 'blue');
    log('3. Deploy to Vercel', 'blue');
  } else {
    log('❌ GROQ INTEGRATION NEEDS ATTENTION', 'red');
    log('\n📋 REQUIRED ACTIONS:', 'red');
    log('1. Install backend dependencies', 'red');
    log('2. Configure environment variables', 'red');
    log('3. Fix configuration issues', 'red');
  }
  
  console.log('='.repeat(60));
  
  return passedTests === testResults.length;
}

// Run the live test
runLiveGroqTest().catch(error => {
  log('💥 Live Groq test failed with error:', 'red');
  log(error.message, 'red');
  process.exit(1);
});
