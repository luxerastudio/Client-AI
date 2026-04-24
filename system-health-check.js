#!/usr/bin/env node

/**
 * Full System Health Check for AI Client Acquisition System
 * Tests: Authentication, Database, Groq API, End-to-End Logic
 */

const https = require('https');
const http = require('http');

// Configuration
const TEST_CONFIG = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  testUser: {
    email: 'healthcheck@test.com',
    password: 'Test123456!'
  },
  groqApiKey: process.env.GROQ_API_KEY,
  databaseUrl: process.env.DATABASE_URL
};

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

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
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

// Test 1: Environment Configuration Check
async function testEnvironmentConfig() {
  logSection('ENVIRONMENT CONFIGURATION CHECK');
  
  const checks = [
    {
      name: 'GROQ_API_KEY',
      value: !!TEST_CONFIG.groqApiKey,
      critical: true
    },
    {
      name: 'DATABASE_URL', 
      value: !!TEST_CONFIG.databaseUrl,
      critical: true
    },
    {
      name: 'BACKEND_URL',
      value: !!TEST_CONFIG.backendUrl,
      critical: false
    }
  ];

  let allPassed = true;
  checks.forEach(check => {
    const status = check.value ? 'PASS' : 'FAIL';
    const details = check.critical ? '(Critical)' : '(Optional)';
    logTest(check.name, status, details);
    if (check.critical && !check.value) allPassed = false;
  });

  return allPassed;
}

// Test 2: Groq API Live Test
async function testGroqAPI() {
  logSection('GROQ API LIVE TEST');
  
  if (!TEST_CONFIG.groqApiKey) {
    logTest('GROQ_API_KEY Available', 'FAIL', 'API key not found in environment');
    return false;
  }

  try {
    const postData = JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: "Hello! Please respond with exactly: 'Groq API is working correctly.'"
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    });

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.groqApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      },
      body: postData
    };

    logTest('Groq API Request', 'INFO', 'Sending test request to https://api.groq.com/openai/v1/chat/completions...');
    
    const response = await makeRequest('https://api.groq.com/openai/v1/chat/completions', options);
    const result = JSON.parse(response.body);

    if (response.statusCode === 200 && result.choices && result.choices[0]) {
      const content = result.choices[0].message.content;
      logTest('Groq API Response', 'PASS', `Status: ${response.statusCode}`);
      logTest('Groq API Content', 'PASS', `Response: "${content.substring(0, 100)}..."`);
      logTest('Groq API Model', 'PASS', `Model: ${result.model}`);
      logTest('Groq API Usage', 'PASS', `Tokens: ${result.usage?.total_tokens || 'N/A'}`);
      return true;
    } else {
      logTest('Groq API Response', 'FAIL', `Status: ${response.statusCode}`);
      logTest('Groq API Error', 'FAIL', response.body);
      return false;
    }
  } catch (error) {
    logTest('Groq API Connection', 'FAIL', error.message);
    return false;
  }
}

// Test 3: Backend Server Health Check
async function testBackendServer() {
  logSection('BACKEND SERVER HEALTH CHECK');
  
  try {
    logTest('Backend Server Check', 'INFO', `Testing: ${TEST_CONFIG.backendUrl}`);
    
    const response = await makeRequest(`${TEST_CONFIG.backendUrl}/health`);
    
    if (response.statusCode === 200) {
      logTest('Backend Health Endpoint', 'PASS', `Status: ${response.statusCode}`);
      
      try {
        const healthData = JSON.parse(response.body);
        logTest('Backend Health Response', 'PASS', 'Valid JSON response');
        
        if (healthData.status === 'healthy' || healthData.healthy === true) {
          logTest('Backend Health Status', 'PASS', 'Server reports healthy');
        } else {
          logTest('Backend Health Status', 'WARN', 'Server reports issues');
        }
        
        return true;
      } catch (parseError) {
        logTest('Backend Health Response', 'FAIL', 'Invalid JSON response');
        return false;
      }
    } else {
      logTest('Backend Health Endpoint', 'FAIL', `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Backend Server Connection', 'FAIL', error.message);
    return false;
  }
}

// Test 4: Database Connection Check (via backend API)
async function testDatabaseConnection() {
  logSection('DATABASE INTEGRATION CHECK');
  
  try {
    // Test database health endpoint
    const response = await makeRequest(`${TEST_CONFIG.backendUrl}/api/v1/health`);
    
    if (response.statusCode === 200) {
      logTest('Database Health Endpoint', 'PASS', `Status: ${response.statusCode}`);
      
      try {
        const healthData = JSON.parse(response.body);
        
        if (healthData.database && healthData.database.status === 'connected') {
          logTest('Database Connection', 'PASS', 'Database reports connected');
        } else {
          logTest('Database Connection', 'WARN', 'Database status unclear');
        }
        
        return true;
      } catch (parseError) {
        logTest('Database Health Response', 'FAIL', 'Invalid JSON response');
        return false;
      }
    } else {
      logTest('Database Health Endpoint', 'FAIL', `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Database Connection Test', 'FAIL', error.message);
    return false;
  }
}

// Test 5: Authentication Flow Test
async function testAuthentication() {
  logSection('AUTHENTICATION CHECK');
  
  try {
    // Test registration endpoint
    const registerData = JSON.stringify({
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password,
      name: 'Health Check User'
    });

    const registerOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: registerData
    };

    logTest('User Registration', 'INFO', 'Testing user registration endpoint...');
    
    let registerResponse;
    try {
      registerResponse = await makeRequest(`${TEST_CONFIG.backendUrl}/api/v1/auth/register`, registerOptions);
    } catch (error) {
      // If registration fails, user might already exist - that's OK for health check
      logTest('User Registration', 'WARN', 'User might already exist or endpoint unavailable');
    }

    // Test login endpoint
    const loginData = JSON.stringify({
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password
    });

    const loginOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: loginData
    };

    logTest('User Login', 'INFO', 'Testing user login endpoint...');
    
    const loginResponse = await makeRequest(`${TEST_CONFIG.backendUrl}/api/v1/auth/login`, loginOptions);
    
    if (loginResponse.statusCode === 200) {
      logTest('User Login', 'PASS', `Status: ${loginResponse.statusCode}`);
      
      try {
        const loginData = JSON.parse(loginResponse.body);
        
        if (loginData.token || loginData.data?.token) {
          logTest('Authentication Token', 'PASS', 'Token received successfully');
          return loginData.token || loginData.data?.token;
        } else {
          logTest('Authentication Token', 'FAIL', 'No token in response');
          return false;
        }
      } catch (parseError) {
        logTest('Login Response', 'FAIL', 'Invalid JSON response');
        return false;
      }
    } else {
      logTest('User Login', 'FAIL', `Status: ${loginResponse.statusCode}`);
      logTest('Login Error', 'FAIL', loginResponse.body);
      return false;
    }
  } catch (error) {
    logTest('Authentication Test', 'FAIL', error.message);
    return false;
  }
}

// Test 6: Credits System Check
async function testCreditsSystem(authToken) {
  logSection('CREDITS SYSTEM CHECK');
  
  if (!authToken) {
    logTest('Credits Check', 'SKIP', 'No authentication token available');
    return false;
  }

  try {
    // Test user credits endpoint
    const creditOptions = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    logTest('Credits Endpoint', 'INFO', 'Testing user credits endpoint...');
    
    const response = await makeRequest(`${TEST_CONFIG.backendUrl}/api/v1/user/credits`, creditOptions);
    
    if (response.statusCode === 200) {
      logTest('Credits Endpoint', 'PASS', `Status: ${response.statusCode}`);
      
      try {
        const creditsData = JSON.parse(response.body);
        
        if (creditsData.credits !== undefined || creditsData.data?.credits !== undefined) {
          const credits = creditsData.credits || creditsData.data?.credits;
          logTest('Credits Retrieved', 'PASS', `Current credits: ${credits}`);
          return credits;
        } else {
          logTest('Credits Retrieved', 'FAIL', 'Credits data not found in response');
          return false;
        }
      } catch (parseError) {
        logTest('Credits Response', 'FAIL', 'Invalid JSON response');
        return false;
      }
    } else {
      logTest('Credits Endpoint', 'FAIL', `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Credits System Test', 'FAIL', error.message);
    return false;
  }
}

// Test 7: End-to-End Content Generation Test
async function testContentGeneration(authToken) {
  logSection('END-TO-END CONTENT GENERATION TEST');
  
  if (!authToken) {
    logTest('Content Generation', 'SKIP', 'No authentication token available');
    return false;
  }

  try {
    // Test content generation endpoint
    const generateData = JSON.stringify({
      prompt: "Write a short marketing slogan for a coffee shop",
      maxTokens: 50,
      temperature: 0.7,
      model: "llama-3.3-70b-versatile"
    });

    const generateOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: generateData
    };

    logTest('Content Generation', 'INFO', 'Testing AI content generation...');
    
    const startTime = Date.now();
    const response = await makeRequest(`${TEST_CONFIG.backendUrl}/api/v1/ai/generate`, generateOptions);
    const endTime = Date.now();
    
    if (response.statusCode === 200) {
      logTest('Content Generation', 'PASS', `Status: ${response.statusCode}, Time: ${endTime - startTime}ms`);
      
      try {
        const result = JSON.parse(response.body);
        
        if (result.data && result.data.content) {
          logTest('AI Content Generated', 'PASS', `Content: "${result.data.content.substring(0, 100)}..."`);
          logTest('AI Model Used', 'PASS', `Model: ${result.data.model || 'N/A'}`);
          logTest('Token Usage', 'PASS', `Usage: ${JSON.stringify(result.data.usage || 'N/A')}`);
          return true;
        } else {
          logTest('AI Content Generated', 'FAIL', 'No content in response');
          return false;
        }
      } catch (parseError) {
        logTest('Content Generation Response', 'FAIL', 'Invalid JSON response');
        return false;
      }
    } else {
      logTest('Content Generation', 'FAIL', `Status: ${response.statusCode}`);
      logTest('Generation Error', 'FAIL', response.body);
      return false;
    }
  } catch (error) {
    logTest('Content Generation Test', 'FAIL', error.message);
    return false;
  }
}

// Main execution function
async function runFullHealthCheck() {
  console.log('\n🚀 STARTING FULL SYSTEM HEALTH CHECK');
  console.log('=====================================');
  
  const results = {
    environment: await testEnvironmentConfig(),
    groqApi: await testGroqAPI(),
    backend: await testBackendServer(),
    database: await testDatabaseConnection(),
    authentication: false,
    credits: false,
    contentGeneration: false
  };

  // Only run auth-dependent tests if basic services are working
  if (results.environment && results.groqApi && results.backend) {
    const authToken = await testAuthentication();
    results.authentication = !!authToken;
    
    if (authToken) {
      const credits = await testCreditsSystem(authToken);
      results.credits = credits !== false;
      
      if (results.credits) {
        results.contentGeneration = await testContentGeneration(authToken);
      }
    }
  }

  // Final Summary
  console.log('\n' + '='.repeat(60));
  log('🏁 HEALTH CHECK SUMMARY', 'cyan');
  console.log('='.repeat(60));
  
  const testResults = [
    { name: 'Environment Config', status: results.environment },
    { name: 'Groq API', status: results.groqApi },
    { name: 'Backend Server', status: results.backend },
    { name: 'Database Connection', status: results.database },
    { name: 'Authentication', status: results.authentication },
    { name: 'Credits System', status: results.credits },
    { name: 'Content Generation', status: results.contentGeneration }
  ];

  let passedTests = 0;
  testResults.forEach(test => {
    const status = test.status ? 'PASS' : 'FAIL';
    const icon = test.status ? '✅' : '❌';
    log(`${icon} ${test.name}: ${status}`, test.status ? 'green' : 'red');
    if (test.status) passedTests++;
  });

  console.log('\n' + '-'.repeat(60));
  log(`Overall Result: ${passedTests}/${testResults.length} tests passed`, 
      passedTests === testResults.length ? 'green' : 'yellow');
  
  if (passedTests === testResults.length) {
    log('🎉 ALL SYSTEMS OPERATIONAL - Ready for production!', 'green');
  } else {
    log('⚠️  Some systems need attention before production deployment', 'yellow');
  }
  
  console.log('='.repeat(60));
}

// Run the health check
runFullHealthCheck().catch(error => {
  log('💥 Health check failed with error:', 'red');
  log(error.message, 'red');
  process.exit(1);
});
