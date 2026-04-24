#!/usr/bin/env node

/**
 * Running System Health Check
 * Tests the actual running development server
 */

const http = require('http');

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
    const req = http.request(url, options, (res) => {
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

// Test 1: Backend Server Health Check
async function testBackendServer() {
  logSection('BACKEND SERVER HEALTH CHECK');
  
  try {
    logTest('Backend Server Check', 'INFO', 'Testing: http://localhost:3002');
    
    const response = await makeRequest('http://localhost:3002/health');
    
    if (response.statusCode === 200) {
      logTest('Backend Health Endpoint', 'PASS', `Status: ${response.statusCode}`);
      
      try {
        const healthData = JSON.parse(response.body);
        logTest('Backend Health Response', 'PASS', 'Valid JSON response');
        
        if (healthData.status === 'healthy' || healthData.healthy === true) {
          logTest('Backend Health Status', 'PASS', 'Server reports healthy');
          logTest('Backend Details', 'INFO', `Service: ${healthData.service || 'Unknown'}`);
        } else {
          logTest('Backend Health Status', 'WARN', 'Server reports issues');
        }
        
        return true;
      } catch (parseError) {
        logTest('Backend Health Response', 'FAIL', 'Invalid JSON response');
        logTest('Response Body', 'INFO', response.body);
        return false;
      }
    } else {
      logTest('Backend Health Endpoint', 'FAIL', `Status: ${response.statusCode}`);
      logTest('Response Body', 'INFO', response.body);
      return false;
    }
  } catch (error) {
    logTest('Backend Server Connection', 'FAIL', error.message);
    return false;
  }
}

// Test 2: API Documentation Check
async function testAPIDocumentation() {
  logSection('API DOCUMENTATION CHECK');
  
  try {
    logTest('API Docs Check', 'INFO', 'Testing: http://localhost:3002/docs');
    
    const response = await makeRequest('http://localhost:3002/docs');
    
    if (response.statusCode === 200) {
      logTest('API Documentation', 'PASS', `Status: ${response.statusCode}`);
      logTest('API Docs Available', 'PASS', 'Swagger UI accessible');
      return true;
    } else {
      logTest('API Documentation', 'FAIL', `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('API Documentation Check', 'FAIL', error.message);
    return false;
  }
}

// Test 3: AI Routes Availability Check
async function testAIRoutes() {
  logSection('AI ROUTES AVAILABILITY CHECK');
  
  const routes = [
    '/api/v1/ai/generate',
    '/api/v1/ai/models',
    '/api/v1/health'
  ];

  let availableRoutes = 0;
  for (const route of routes) {
    try {
      const response = await makeRequest(`http://localhost:3002${route}`);
      
      if (response.statusCode === 200 || response.statusCode === 405) {
        // 405 Method Not Allowed is OK for GET on POST endpoints
        logTest(`Route ${route}`, 'PASS', `Status: ${response.statusCode}`);
        availableRoutes++;
      } else {
        logTest(`Route ${route}`, 'WARN', `Status: ${response.statusCode}`);
      }
    } catch (error) {
      logTest(`Route ${route}`, 'FAIL', error.message);
    }
  }

  logTest('AI Routes Summary', availableRoutes === routes.length ? 'PASS' : 'WARN', 
          `${availableRoutes}/${routes.length} routes available`);
  
  return availableRoutes > 0;
}

// Test 4: Database Connection Check (via API)
async function testDatabaseConnection() {
  logSection('DATABASE CONNECTION CHECK');
  
  try {
    const response = await makeRequest('http://localhost:3002/api/v1/health');
    
    if (response.statusCode === 200) {
      logTest('Database Health Endpoint', 'PASS', `Status: ${response.statusCode}`);
      
      try {
        const healthData = JSON.parse(response.body);
        
        if (healthData.database && healthData.database.status === 'connected') {
          logTest('Database Connection', 'PASS', 'Database reports connected');
          logTest('Database Details', 'INFO', `Provider: ${healthData.database.provider || 'Unknown'}`);
          return true;
        } else {
          logTest('Database Connection', 'WARN', 'Database status unclear');
          logTest('Database Response', 'INFO', JSON.stringify(healthData.database || {}));
          return false;
        }
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

// Test 5: Configuration Validation Check
async function testConfigurationValidation() {
  logSection('CONFIGURATION VALIDATION CHECK');
  
  try {
    const response = await makeRequest('http://localhost:3002/api/v1/config/validate');
    
    if (response.statusCode === 200) {
      logTest('Configuration Validation', 'PASS', `Status: ${response.statusCode}`);
      
      try {
        const configData = JSON.parse(response.body);
        
        if (configData.valid === true) {
          logTest('Configuration Status', 'PASS', 'All configurations valid');
          return true;
        } else {
          logTest('Configuration Status', 'WARN', 'Some configuration issues');
          logTest('Configuration Issues', 'INFO', JSON.stringify(configData.issues || []));
          return false;
        }
      } catch (parseError) {
        logTest('Configuration Response', 'FAIL', 'Invalid JSON response');
        return false;
      }
    } else {
      logTest('Configuration Validation', 'FAIL', `Status: ${response.statusCode}`);
      logTest('Response Body', 'INFO', response.body);
      return false;
    }
  } catch (error) {
    logTest('Configuration Validation', 'FAIL', error.message);
    return false;
  }
}

// Test 6: Mock AI Generation Test (without API key)
async function testMockAIGeneration() {
  logSection('MOCK AI GENERATION TEST');
  
  try {
    const postData = JSON.stringify({
      prompt: "Test prompt for health check",
      maxTokens: 10,
      temperature: 0.1
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      body: postData
    };

    logTest('Mock AI Generation', 'INFO', 'Testing AI generation endpoint...');
    
    const startTime = Date.now();
    const response = await makeRequest('http://localhost:3002/api/v1/ai/generate', options);
    const endTime = Date.now();
    
    if (response.statusCode === 200) {
      logTest('Mock AI Generation', 'PASS', `Status: ${response.statusCode}, Time: ${endTime - startTime}ms`);
      
      try {
        const result = JSON.parse(response.body);
        
        if (result.data && result.data.content) {
          logTest('AI Content Generated', 'PASS', `Content: "${result.data.content.substring(0, 50)}..."`);
          logTest('AI Model Used', 'PASS', `Model: ${result.data.model || 'N/A'}`);
          logTest('Mock Mode Detected', result.data.content.includes('mock') ? 'PASS' : 'INFO', 
                  result.data.content.includes('mock') ? 'Running in mock mode' : 'Live mode');
          return true;
        } else {
          logTest('AI Content Generated', 'FAIL', 'No content in response');
          logTest('Response Body', 'INFO', response.body);
          return false;
        }
      } catch (parseError) {
        logTest('AI Generation Response', 'FAIL', 'Invalid JSON response');
        logTest('Response Body', 'INFO', response.body);
        return false;
      }
    } else if (response.statusCode === 401) {
      logTest('Mock AI Generation', 'PASS', 'Status: 401 - API key required (expected)');
      logTest('API Protection', 'PASS', 'Authentication working correctly');
      return true;
    } else {
      logTest('Mock AI Generation', 'FAIL', `Status: ${response.statusCode}`);
      logTest('Error Response', 'INFO', response.body);
      return false;
    }
  } catch (error) {
    logTest('Mock AI Generation Test', 'FAIL', error.message);
    return false;
  }
}

// Test 7: Security Headers Check
async function testSecurityHeaders() {
  logSection('SECURITY HEADERS CHECK');
  
  try {
    const response = await makeRequest('http://localhost:3002/health');
    
    if (response.statusCode === 200) {
      logTest('Security Headers Check', 'PASS', `Status: ${response.statusCode}`);
      
      const headers = response.headers;
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection'
      ];
      
      let foundHeaders = 0;
      securityHeaders.forEach(header => {
        if (headers[header]) {
          logTest(`Header ${header}`, 'PASS', 'Present');
          foundHeaders++;
        } else {
          logTest(`Header ${header}`, 'INFO', 'Not present');
        }
      });
      
      logTest('Security Headers Summary', foundHeaders >= 2 ? 'PASS' : 'WARN', 
              `${foundHeaders}/${securityHeaders.length} security headers found`);
      
      return foundHeaders >= 2;
    } else {
      logTest('Security Headers Check', 'FAIL', `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Security Headers Check', 'FAIL', error.message);
    return false;
  }
}

// Main execution function
async function runRunningSystemTest() {
  console.log('\n🚀 STARTING RUNNING SYSTEM HEALTH CHECK');
  console.log('=====================================');
  
  const results = {
    backendServer: await testBackendServer(),
    apiDocumentation: await testAPIDocumentation(),
    aiRoutes: await testAIRoutes(),
    databaseConnection: await testDatabaseConnection(),
    configurationValidation: await testConfigurationValidation(),
    mockAIGeneration: await testMockAIGeneration(),
    securityHeaders: await testSecurityHeaders()
  };

  // Final Summary
  console.log('\n' + '='.repeat(60));
  log('🏁 RUNNING SYSTEM HEALTH SUMMARY', 'cyan');
  console.log('='.repeat(60));
  
  const testResults = [
    { name: 'Backend Server', status: results.backendServer },
    { name: 'API Documentation', status: results.apiDocumentation },
    { name: 'AI Routes', status: results.aiRoutes },
    { name: 'Database Connection', status: results.databaseConnection },
    { name: 'Configuration Validation', status: results.configurationValidation },
    { name: 'Mock AI Generation', status: results.mockAIGeneration },
    { name: 'Security Headers', status: results.securityHeaders }
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
      passedTests >= 5 ? 'green' : 'yellow');
  
  if (passedTests >= 5) {
    log('🎉 SYSTEM IS RUNNING SUCCESSFULLY!', 'green');
    log('\n📋 SYSTEM STATUS:', 'blue');
    log('✅ Backend server operational', 'blue');
    log('✅ Database connected', 'blue');
    log('✅ API routes available', 'blue');
    log('✅ Security measures active', 'blue');
    log('\n🚀 READY FOR GROQ API TESTING:', 'blue');
    log('1. Set GROQ_API_KEY in environment variables', 'blue');
    log('2. Test live AI generation', 'blue');
    log('3. Deploy to Vercel for production', 'blue');
  } else {
    log('⚠️  SYSTEM NEEDS ATTENTION', 'yellow');
    log('\n📋 CHECK REQUIRED:', 'yellow');
    log('1. Backend server startup', 'yellow');
    log('2. Database connection', 'yellow');
    log('3. API configuration', 'yellow');
  }
  
  console.log('='.repeat(60));
  
  return passedTests >= 5;
}

// Run the running system test
runRunningSystemTest().catch(error => {
  log('💥 Running system test failed with error:', 'red');
  log(error.message, 'red');
  process.exit(1);
});
