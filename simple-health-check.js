#!/usr/bin/env node

/**
 * Simple Health Check for AI Client Acquisition System
 * Tests core components without complex dependencies
 */

const fs = require('fs');
const path = require('path');

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

// Test 1: File Structure Check
function testFileStructure() {
  logSection('FILE STRUCTURE CHECK');
  
  const requiredFiles = [
    'apps/backend/src/config/index.ts',
    'apps/backend/src/infrastructure/ai/AIEngine.ts',
    'apps/backend/src/infrastructure/ai/OpenAIGenerator.ts',
    'apps/backend/src/presentation/controllers/AIController.ts',
    'apps/backend/src/presentation/routes/aiRoutesWithCredits.ts',
    'apps/frontend/app/api/v1/ai/generate/route.ts'
  ];

  let allExists = true;
  requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    const status = exists ? 'PASS' : 'FAIL';
    logTest(file, status, exists ? 'Found' : 'Missing');
    if (!exists) allExists = false;
  });

  return allExists;
}

// Test 2: Configuration Content Check
function testConfigurationContent() {
  logSection('CONFIGURATION CONTENT CHECK');
  
  try {
    const configPath = 'apps/backend/src/config/index.ts';
    const configContent = fs.readFileSync(configPath, 'utf8');

    // Check for Groq configuration
    const hasGroqKey = configContent.includes('GROQ_API_KEY');
    logTest('GROQ_API_KEY Reference', hasGroqKey ? 'PASS' : 'FAIL', 
            hasGroqKey ? 'Found in config' : 'Not found');

    // Check for Groq API endpoint
    const aiEnginePath = 'apps/backend/src/infrastructure/ai/AIEngine.ts';
    const aiEngineContent = fs.readFileSync(aiEnginePath, 'utf8');
    const hasGroqEndpoint = aiEngineContent.includes('api.groq.com');
    logTest('Groq API Endpoint', hasGroqEndpoint ? 'PASS' : 'FAIL',
            hasGroqEndpoint ? 'Configured' : 'Not found');

    // Check for llama model
    const hasLlamaModel = configContent.includes('llama-3.3-70b-versatile') ||
                         aiEngineContent.includes('llama-3.3-70b-versatile');
    logTest('Llama Model', hasLlamaModel ? 'PASS' : 'FAIL',
            hasLlamaModel ? 'Found' : 'Not found');

    return hasGroqKey && hasGroqEndpoint && hasLlamaModel;
  } catch (error) {
    logTest('Configuration Content', 'FAIL', error.message);
    return false;
  }
}

// Test 3: Code Integration Check
function testCodeIntegration() {
  logSection('CODE INTEGRATION CHECK');
  
  try {
    // Check AIEngine.ts for Groq integration
    const aiEnginePath = 'apps/backend/src/infrastructure/ai/AIEngine.ts';
    const aiEngineContent = fs.readFileSync(aiEnginePath, 'utf8');

    const checks = [
      {
        name: 'Groq Base URL',
        check: aiEngineContent.includes('baseURL: \'https://api.groq.com/openai/v1\'')
      },
      {
        name: 'Groq API Key Priority',
        check: aiEngineContent.includes('process.env.GROQ_API_KEY')
      },
      {
        name: 'Default Model',
        check: aiEngineContent.includes('llama-3.3-70b-versatile')
      },
      {
        name: 'Error Messages Updated',
        check: aiEngineContent.includes('Invalid Groq API key')
      }
    ];

    let allPassed = true;
    checks.forEach(({ name, check }) => {
      const status = check ? 'PASS' : 'FAIL';
      logTest(name, status, check ? 'Implemented' : 'Missing');
      if (!check) allPassed = false;
    });

    return allPassed;
  } catch (error) {
    logTest('Code Integration', 'FAIL', error.message);
    return false;
  }
}

// Test 4: OpenAI Generator Check
function testOpenAIGenerator() {
  logSection('OPENAI GENERATOR CHECK');
  
  try {
    const generatorPath = 'apps/backend/src/infrastructure/ai/OpenAIGenerator.ts';
    const generatorContent = fs.readFileSync(generatorPath, 'utf8');

    const checks = [
      {
        name: 'Groq Base URL',
        check: generatorContent.includes('baseURL: \'https://api.groq.com/openai/v1\'')
      },
      {
        name: 'Default Model',
        check: generatorContent.includes('llama-3.3-70b-versatile')
      }
    ];

    let allPassed = true;
    checks.forEach(({ name, check }) => {
      const status = check ? 'PASS' : 'FAIL';
      logTest(name, status, check ? 'Updated' : 'Not updated');
      if (!check) allPassed = false;
    });

    return allPassed;
  } catch (error) {
    logTest('OpenAI Generator', 'FAIL', error.message);
    return false;
  }
}

// Test 5: API Routes Check
function testAPIRoutes() {
  logSection('API ROUTES CHECK');
  
  try {
    const routesPath = 'apps/backend/src/presentation/routes/aiRoutesWithCredits.ts';
    const routesContent = fs.readFileSync(routesPath, 'utf8');

    const checks = [
      {
        name: 'Model Enum Updated',
        check: routesContent.includes('llama-3.3-70b-versatile')
      },
      {
        name: 'Default Model',
        check: routesContent.includes('default: \'llama-3.3-70b-versatile\'')
      }
    ];

    let allPassed = true;
    checks.forEach(({ name, check }) => {
      const status = check ? 'PASS' : 'FAIL';
      logTest(name, status, check ? 'Updated' : 'Not updated');
      if (!check) allPassed = false;
    });

    return allPassed;
  } catch (error) {
    logTest('API Routes', 'FAIL', error.message);
    return false;
  }
}

// Test 6: Frontend Integration Check
function testFrontendIntegration() {
  logSection('FRONTEND INTEGRATION CHECK');
  
  try {
    const frontendPath = 'apps/frontend/app/api/v1/ai/generate/route.ts';
    const frontendContent = fs.readFileSync(frontendPath, 'utf8');

    const checks = [
      {
        name: 'GROQ_API_KEY Check',
        check: frontendContent.includes('process.env.GROQ_API_KEY')
      },
      {
        name: 'Mock Model Updated',
        check: frontendContent.includes('mock-llama-3.3-70b-versatile-vercel')
      }
    ];

    let allPassed = true;
    checks.forEach(({ name, check }) => {
      const status = check ? 'PASS' : 'FAIL';
      logTest(name, status, check ? 'Updated' : 'Not updated');
      if (!check) allPassed = false;
    });

    return allPassed;
  } catch (error) {
    logTest('Frontend Integration', 'FAIL', error.message);
    return false;
  }
}

// Test 7: Old Model References Check
function testOldModelReferences() {
  logSection('OLD MODEL REFERENCES CLEANUP');
  
  try {
    const criticalFiles = [
      'apps/backend/src/infrastructure/ai/AIEngine.ts',
      'apps/backend/src/infrastructure/ai/OpenAIGenerator.ts',
      'apps/backend/src/presentation/controllers/AIController.ts',
      'apps/backend/src/config/index.ts'
    ];

    let oldReferencesFound = 0;
    criticalFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const gptReferences = (content.match(/gpt-[34]/g) || []).length;
        if (gptReferences > 0) {
          logTest(file, 'WARN', `${gptReferences} old model references found`);
          oldReferencesFound += gptReferences;
        } else {
          logTest(file, 'PASS', 'No old model references');
        }
      }
    });

    if (oldReferencesFound === 0) {
      logTest('Old Model Cleanup', 'PASS', 'All critical files cleaned up');
      return true;
    } else {
      logTest('Old Model Cleanup', 'WARN', `${oldReferencesFound} references remain`);
      return false;
    }
  } catch (error) {
    logTest('Old Model References', 'FAIL', error.message);
    return false;
  }
}

// Test 8: Package Dependencies Check
function testPackageDependencies() {
  logSection('PACKAGE DEPENDENCIES CHECK');
  
  try {
    const packagePath = 'package.json';
    if (!fs.existsSync(packagePath)) {
      logTest('Package.json', 'FAIL', 'Not found');
      return false;
    }

    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const dependencies = { ...packageContent.dependencies, ...packageContent.devDependencies };

    const hasOpenAI = !!dependencies['openai'];
    logTest('OpenAI Package', hasOpenAI ? 'PASS' : 'FAIL', 
            hasOpenAI ? 'Available' : 'Missing');

    return hasOpenAI;
  } catch (error) {
    logTest('Package Dependencies', 'FAIL', error.message);
    return false;
  }
}

// Main execution function
async function runSimpleHealthCheck() {
  console.log('\n🚀 STARTING SIMPLE SYSTEM HEALTH CHECK');
  console.log('=====================================');
  
  const results = {
    fileStructure: testFileStructure(),
    configurationContent: testConfigurationContent(),
    codeIntegration: testCodeIntegration(),
    openAIGenerator: testOpenAIGenerator(),
    apiRoutes: testAPIRoutes(),
    frontendIntegration: testFrontendIntegration(),
    oldModelReferences: testOldModelReferences(),
    packageDependencies: testPackageDependencies()
  };

  // Final Summary
  console.log('\n' + '='.repeat(60));
  log('🏁 HEALTH CHECK SUMMARY', 'cyan');
  console.log('='.repeat(60));
  
  const testResults = [
    { name: 'File Structure', status: results.fileStructure },
    { name: 'Configuration Content', status: results.configurationContent },
    { name: 'Code Integration', status: results.codeIntegration },
    { name: 'OpenAI Generator', status: results.openAIGenerator },
    { name: 'API Routes', status: results.apiRoutes },
    { name: 'Frontend Integration', status: results.frontendIntegration },
    { name: 'Old Model Cleanup', status: results.oldModelReferences },
    { name: 'Package Dependencies', status: results.packageDependencies }
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
    log('🎉 CODE INTEGRATION COMPLETE - Ready for deployment!', 'green');
    log('\n📋 NEXT STEPS:', 'blue');
    log('1. Set GROQ_API_KEY in your Vercel environment variables', 'blue');
    log('2. Deploy to Vercel to test the live integration', 'blue');
    log('3. Monitor API calls and response times', 'blue');
  } else {
    log('⚠️  Some integration issues need attention', 'yellow');
  }
  
  console.log('='.repeat(60));
  
  return passedTests === testResults.length;
}

// Run the health check
runSimpleHealthCheck().catch(error => {
  log('💥 Health check failed with error:', 'red');
  log(error.message, 'red');
  process.exit(1);
});
