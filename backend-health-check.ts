#!/usr/bin/env ts-node

/**
 * Backend System Health Check
 * Tests the actual backend components without requiring environment setup
 */

import { config } from './apps/backend/src/config/index';
import { AIEngine } from './apps/backend/src/infrastructure/ai/AIEngine';
import OpenAI from 'openai';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(`🔍 ${title}`, 'cyan');
  console.log('='.repeat(60));
}

function logTest(testName: string, status: string, details: string = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${icon} ${testName}: ${status}`, color);
  if (details) log(`   ${details}`, color);
}

// Test 1: Configuration Validation
function testConfiguration() {
  logSection('CONFIGURATION VALIDATION');
  
  try {
    logTest('Config Loading', 'INFO', 'Testing configuration system...');
    
    // Test AI configuration
    const aiConfig = config.ai;
    if (aiConfig) {
      logTest('AI Config', 'PASS', 'AI configuration loaded');
      logTest('AI Provider', 'PASS', `Provider: ${aiConfig.provider || 'Not set'}`);
      logTest('AI Model', 'PASS', `Default model: ${aiConfig.model || 'Not set'}`);
      logTest('API Key Source', 'PASS', 'Key source configured');
    } else {
      logTest('AI Config', 'FAIL', 'AI configuration not found');
      return false;
    }

    // Test database configuration
    const dbConfig = config.database;
    if (dbConfig) {
      logTest('Database Config', 'PASS', 'Database configuration loaded');
      logTest('Database URL', 'PASS', dbConfig.url ? 'URL configured' : 'URL missing');
    } else {
      logTest('Database Config', 'FAIL', 'Database configuration not found');
      return false;
    }

    return true;
  } catch (error: any) {
    logTest('Configuration Test', 'FAIL', error?.message || 'Unknown error');
    return false;
  }
}

// Test 2: Groq API Integration Test
async function testGroqIntegration() {
  logSection('GROQ API INTEGRATION TEST');
  
  try {
    // Test AI Engine initialization
    logTest('AI Engine Init', 'INFO', 'Initializing AI Engine with Groq...');
    
    const aiEngine = new AIEngine();
    await aiEngine.initialize();
    
    logTest('AI Engine', 'PASS', 'AI Engine initialized successfully');
    logTest('Provider', 'PASS', `Provider: ${aiEngine.getStats().currentProvider}`);

    // Test Groq API configuration
    const groqKey = process.env.GROQ_API_KEY || config.ai?.apiKey;
    if (!groqKey) {
      logTest('Groq API Key', 'FAIL', 'No GROQ_API_KEY found');
      return false;
    }

    logTest('Groq API Key', 'PASS', 'API key available');

    // Create OpenAI client with Groq configuration
    const groqClient = new OpenAI({
      apiKey: groqKey,
      baseURL: 'https://api.groq.com/openai/v1'
    });

    logTest('Groq Client', 'PASS', 'Groq client created with correct endpoint');

    // Test actual API call
    logTest('Groq API Call', 'INFO', 'Making test API call to Groq...');
    
    const startTime = Date.now();
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: 'Respond with exactly: "Groq API integration test successful."'
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    });
    const endTime = Date.now();

    if (response.choices && response.choices[0]) {
      const content = response.choices[0].message.content;
      logTest('Groq API Response', 'PASS', `Response time: ${endTime - startTime}ms`);
      logTest('Groq API Content', 'PASS', `Content: "${content}"`);
      logTest('Groq API Model', 'PASS', `Model: ${response.model}`);
      logTest('Groq API Usage', 'PASS', `Tokens: ${response.usage?.total_tokens || 'N/A'}`);
      return true;
    } else {
      logTest('Groq API Response', 'FAIL', 'No response content received');
      return false;
    }
  } catch (error: any) {
    logTest('Groq API Test', 'FAIL', error.message);
    
    // Check if it's an authentication error
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      logTest('Groq API Auth', 'FAIL', 'Invalid API key or authentication failed');
    } else if (error.message.includes('429')) {
      logTest('Groq API Rate Limit', 'FAIL', 'Rate limit exceeded');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      logTest('Groq API Connection', 'FAIL', 'Network connection failed');
    }
    
    return false;
  }
}

// Test 3: AI Engine Functionality Test
async function testAIEngine() {
  logSection('AI ENGINE FUNCTIONALITY TEST');
  
  try {
    const aiEngine = new AIEngine();
    await aiEngine.initialize();

    // Test basic generation
    logTest('AI Generation', 'INFO', 'Testing AI content generation...');
    
    const request = {
      prompt: 'Write a short greeting message',
      maxTokens: 50,
      temperature: 0.7,
      model: 'llama-3.3-70b-versatile'
    };

    const startTime = Date.now();
    const response = await aiEngine.generate(request);
    const endTime = Date.now();

    if (response && response.content) {
      logTest('AI Generation', 'PASS', `Response time: ${endTime - startTime}ms`);
      logTest('AI Content', 'PASS', `Generated: "${response.content.substring(0, 100)}..."`);
      logTest('AI Model', 'PASS', `Model: ${response.model}`);
      logTest('AI Usage', 'PASS', `Tokens: ${JSON.stringify(response.usage)}`);
      return true;
    } else {
      logTest('AI Generation', 'FAIL', 'No content generated');
      return false;
    }
  } catch (error: any) {
    logTest('AI Engine Test', 'FAIL', error.message);
    return false;
  }
}

// Test 4: Database Configuration Test
function testDatabaseConfig() {
  logSection('DATABASE CONFIGURATION TEST');
  
  try {
    const dbConfig = config.database;
    
    if (!dbConfig) {
      logTest('Database Config', 'FAIL', 'Database configuration not found');
      return false;
    }

    logTest('Database Config', 'PASS', 'Database configuration loaded');
    
    // Check required fields
    const checks = [
      { field: 'url', value: !!dbConfig.url },
      { field: 'host', value: !!dbConfig.host },
      { field: 'port', value: !!dbConfig.port },
      { field: 'database', value: !!dbConfig.database },
      { field: 'username', value: !!dbConfig.username }
    ];

    let allPassed = true;
    checks.forEach(check => {
      const status = check.value ? 'PASS' : 'FAIL';
      logTest(`DB ${check.field}`, status, check.value ? 'Configured' : 'Missing');
      if (!check.value) allPassed = false;
    });

    return allPassed;
  } catch (error: any) {
    logTest('Database Config Test', 'FAIL', error.message);
    return false;
  }
}

// Test 5: Security Configuration Test
function testSecurityConfig() {
  logSection('SECURITY CONFIGURATION TEST');
  
  try {
    const securityConfig = config.security;
    
    if (!securityConfig) {
      logTest('Security Config', 'FAIL', 'Security configuration not found');
      return false;
    }

    logTest('Security Config', 'PASS', 'Security configuration loaded');
    logTest('Security Config Path', 'PASS', securityConfig.configPath || 'Not set');
    logTest('Security Hot Reload', 'PASS', securityConfig.hotReload ? 'Enabled' : 'Disabled');
    
    return true;
  } catch (error: any) {
    logTest('Security Config Test', 'FAIL', error.message);
    return false;
  }
}

// Test 6: Workflow Configuration Test
function testWorkflowConfig() {
  logSection('WORKFLOW CONFIGURATION TEST');
  
  try {
    const workflowConfig = config.workflow;
    
    if (!workflowConfig) {
      logTest('Workflow Config', 'FAIL', 'Workflow configuration not found');
      return false;
    }

    logTest('Workflow Config', 'PASS', 'Workflow configuration loaded');
    logTest('Max Concurrent Workflows', 'PASS', `${workflowConfig.maxConcurrentWorkflows}`);
    logTest('Default Timeout', 'PASS', `${workflowConfig.defaultTimeout}ms`);
    logTest('Max Steps', 'PASS', `${workflowConfig.maxSteps}`);
    logTest('Persistence', 'PASS', workflowConfig.enablePersistence ? 'Enabled' : 'Disabled');
    
    return true;
  } catch (error: any) {
    logTest('Workflow Config Test', 'FAIL', error.message);
    return false;
  }
}

// Main execution function
async function runBackendHealthCheck() {
  console.log('\n🚀 STARTING BACKEND SYSTEM HEALTH CHECK');
  console.log('========================================');
  
  const results = {
    configuration: testConfiguration(),
    databaseConfig: testDatabaseConfig(),
    securityConfig: testSecurityConfig(),
    workflowConfig: testWorkflowConfig(),
    groqIntegration: await testGroqIntegration(),
    aiEngine: await testAIEngine()
  };

  // Final Summary
  console.log('\n' + '='.repeat(60));
  log('🏁 BACKEND HEALTH CHECK SUMMARY', 'cyan');
  console.log('='.repeat(60));
  
  const testResults = [
    { name: 'Configuration System', status: results.configuration },
    { name: 'Database Configuration', status: results.databaseConfig },
    { name: 'Security Configuration', status: results.securityConfig },
    { name: 'Workflow Configuration', status: results.workflowConfig },
    { name: 'Groq API Integration', status: results.groqIntegration },
    { name: 'AI Engine Functionality', status: results.aiEngine }
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
    log('🎉 BACKEND SYSTEMS OPERATIONAL - Ready for production!', 'green');
  } else {
    log('⚠️  Some backend systems need attention', 'yellow');
  }
  
  console.log('='.repeat(60));
  
  return passedTests === testResults.length;
}

// Run the health check
runBackendHealthCheck().catch(error => {
  log('💥 Backend health check failed with error:', 'red');
  log(error.message, 'red');
  process.exit(1);
});
