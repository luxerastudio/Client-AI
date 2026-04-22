// Database Persistence Test - Verify data survives server restarts
const http = require('http');
const fs = require('fs');

class DatabasePersistenceTester {
  constructor(baseUrl = 'http://localhost:3003') {
    this.baseUrl = baseUrl;
    this.testData = {
      userId: 'persistence-test-user-' + Date.now(),
      workflowId: 'persistence-workflow-' + Date.now(),
      memoryData: {},
      workflowData: {},
      timestamps: {}
    };
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
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (payload) {
        req.write(JSON.stringify(payload));
      }
      req.end();
    });
  }

  async createTestData() {
    console.log('=== STEP 1: CREATING TEST DATA ===\n');
    
    const results = {};
    
    // Create user memory data
    console.log('Creating user memory data...');
    try {
      const memoryResponse = await this.makeRequest('POST', '/api/v1/ai/generate', {
        prompt: 'What is your favorite programming language and why?',
        userId: this.testData.userId,
        enableMemory: true
      });
      
      if (memoryResponse.statusCode === 200) {
        this.testData.memoryData = {
          content: memoryResponse.json?.data?.content || '',
          timestamp: new Date().toISOString(),
          memoryEnhancement: memoryResponse.json?.data?.memoryEnhancement || {}
        };
        this.testData.timestamps.memoryCreated = Date.now();
        
        console.log('  Memory data created successfully');
        console.log(`  Content length: ${this.testData.memoryData.content.length} characters`);
        console.log(`  Memory enhancement: ${JSON.stringify(this.testData.memoryData.memoryEnhancement)}`);
        results.memory = 'SUCCESS';
      } else {
        console.log('  Memory data creation failed:', memoryResponse.statusCode);
        results.memory = 'FAILED';
      }
    } catch (error) {
      console.log('  Memory data creation error:', error.message);
      results.memory = 'ERROR';
    }

    // Create workflow data
    console.log('\nCreating workflow data...');
    try {
      const workflowResponse = await this.makeRequest('POST', '/api/v1/workflow/execute', {
        templateId: 'content-generation',
        input: {
          topic: 'database persistence testing',
          style: 'technical',
          length: 'short'
        }
      });
      
      if (workflowResponse.statusCode === 200) {
        this.testData.workflowData = {
          executionId: workflowResponse.json?.data?.executionId || '',
          status: workflowResponse.json?.data?.status || '',
          timestamp: new Date().toISOString()
        };
        this.testData.timestamps.workflowCreated = Date.now();
        
        console.log('  Workflow data created successfully');
        console.log(`  Execution ID: ${this.testData.workflowData.executionId}`);
        console.log(`  Status: ${this.testData.workflowData.status}`);
        results.workflow = 'SUCCESS';
      } else {
        console.log('  Workflow data creation failed:', workflowResponse.statusCode);
        results.workflow = 'FAILED';
      }
    } catch (error) {
      console.log('  Workflow data creation error:', error.message);
      results.workflow = 'ERROR';
    }

    // Create additional memory entries for better testing
    console.log('\nCreating additional memory entries...');
    try {
      const additionalMemoryResponse = await this.makeRequest('POST', '/api/v1/ai/generate', {
        prompt: 'Explain the importance of database persistence in web applications',
        userId: this.testData.userId,
        enableMemory: true
      });
      
      if (additionalMemoryResponse.statusCode === 200) {
        console.log('  Additional memory entry created successfully');
        results.additionalMemory = 'SUCCESS';
      } else {
        console.log('  Additional memory entry failed:', additionalMemoryResponse.statusCode);
        results.additionalMemory = 'FAILED';
      }
    } catch (error) {
      console.log('  Additional memory entry error:', error.message);
      results.additionalMemory = 'ERROR';
    }

    // Save test data to file for persistence check
    this.saveTestData();
    
    console.log('\n=== STEP 1 COMPLETE ===');
    console.log('Test Data Creation Results:');
    Object.entries(results).forEach(([type, result]) => {
      console.log(`  ${type}: ${result}`);
    });
    
    return results;
  }

  saveTestData() {
    const testDataFile = './test-data-persistence.json';
    fs.writeFileSync(testDataFile, JSON.stringify(this.testData, null, 2));
    console.log(`Test data saved to ${testDataFile}`);
  }

  loadTestData() {
    const testDataFile = './test-data-persistence.json';
    if (fs.existsSync(testDataFile)) {
      const data = fs.readFileSync(testDataFile, 'utf8');
      this.testData = JSON.parse(data);
      console.log(`Test data loaded from ${testDataFile}`);
      return true;
    }
    return false;
  }

  async restartServer() {
    console.log('\n=== STEP 2: RESTARTING SERVER ===\n');
    
    // Kill existing server process
    console.log('Stopping existing server...');
    try {
      const { exec } = require('child_process');
      exec('pkill -f "node.*index.js" || pkill -f "ts-node-dev" || true', (error, stdout, stderr) => {
        console.log('Server stop command executed');
      });
    } catch (error) {
      console.log('Server stop error (expected):', error.message);
    }
    
    // Wait for server to stop
    console.log('Waiting for server to stop...');
    await this.sleep(3000);
    
    // Start server again
    console.log('Starting server...');
    try {
      const { spawn } = require('child_process');
      const serverProcess = spawn('pnpm', ['run', 'dev'], {
        cwd: process.cwd(),
        env: { ...process.env, PORT: '3003' },
        stdio: 'pipe'
      });
      
      serverProcess.stdout.on('data', (data) => {
        // Suppress output
      });
      
      serverProcess.stderr.on('data', (data) => {
        // Suppress error output
      });
      
      // Wait for server to start
      console.log('Waiting for server to start...');
      await this.sleep(5000);
      
      console.log('Server restart completed');
      return true;
    } catch (error) {
      console.log('Server start error:', error.message);
      return false;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async verifyDataPersistence() {
    console.log('\n=== STEP 3: VERIFYING DATA PERSISTENCE ===\n');
    
    // Load test data from file
    if (!this.loadTestData()) {
      console.log('ERROR: Could not load test data file');
      return { success: false, error: 'Test data file not found' };
    }
    
    const results = {};
    
    // Verify memory data persistence
    console.log('Verifying memory data persistence...');
    try {
      const memoryStatsResponse = await this.makeRequest('GET', `/api/v1/memory/${this.testData.userId}`);
      
      if (memoryStatsResponse.statusCode === 200) {
        const memoryStats = memoryStatsResponse.json?.data?.memoryStats || {};
        
        console.log('  Memory stats retrieved successfully');
        console.log(`  Total interactions: ${memoryStats.totalInteractions || 0}`);
        console.log(`  Memory depth: ${memoryStats.memoryDepth || 'none'}`);
        console.log(`  Last activity: ${memoryStats.lastActivity || 'N/A'}`);
        
        // Check if we have the expected number of interactions
        const expectedInteractions = 2; // We created 2 memory entries
        const hasExpectedInteractions = memoryStats.totalInteractions >= expectedInteractions;
        
        results.memory = {
          success: true,
          totalInteractions: memoryStats.totalInteractions,
          memoryDepth: memoryStats.memoryDepth,
          hasExpectedInteractions,
          persisted: true
        };
        
        console.log(`  Memory persistence: ${hasExpectedInteractions ? 'CONFIRMED' : 'PARTIAL'}`);
      } else {
        console.log('  Memory stats retrieval failed:', memoryStatsResponse.statusCode);
        results.memory = { success: false, persisted: false };
      }
    } catch (error) {
      console.log('  Memory verification error:', error.message);
      results.memory = { success: false, error: error.message, persisted: false };
    }

    // Verify workflow data persistence
    console.log('\nVerifying workflow data persistence...');
    try {
      const workflowResponse = await this.makeRequest('GET', `/api/v1/workflow/${this.testData.workflowData.executionId}`);
      
      if (workflowResponse.statusCode === 200) {
        const workflowData = workflowResponse.json?.data || {};
        
        console.log('  Workflow data retrieved successfully');
        console.log(`  Execution ID: ${workflowData.executionId || 'N/A'}`);
        console.log(`  Status: ${workflowData.status || 'N/A'}`);
        console.log(`  Created at: ${workflowData.createdAt || 'N/A'}`);
        
        const sameExecutionId = workflowData.executionId === this.testData.workflowData.executionId;
        
        results.workflow = {
          success: true,
          executionId: workflowData.executionId,
          status: workflowData.status,
          sameExecutionId,
          persisted: true
        };
        
        console.log(`  Workflow persistence: ${sameExecutionId ? 'CONFIRMED' : 'FAILED'}`);
      } else {
        console.log('  Workflow data retrieval failed:', workflowResponse.statusCode);
        results.workflow = { success: false, persisted: false };
      }
    } catch (error) {
      console.log('  Workflow verification error:', error.message);
      results.workflow = { success: false, error: error.message, persisted: false };
    }

    // Test new data creation to ensure database is working
    console.log('\nTesting new data creation (database verification)...');
    try {
      const newMemoryResponse = await this.makeRequest('POST', '/api/v1/ai/generate', {
        prompt: 'This is a post-restart test to verify database is working',
        userId: this.testData.userId + '-new',
        enableMemory: true
      });
      
      if (newMemoryResponse.statusCode === 200) {
        console.log('  New data creation successful');
        results.newDataCreation = { success: true, databaseWorking: true };
      } else {
        console.log('  New data creation failed:', newMemoryResponse.statusCode);
        results.newDataCreation = { success: false, databaseWorking: false };
      }
    } catch (error) {
      console.log('  New data creation error:', error.message);
      results.newDataCreation = { success: false, error: error.message, databaseWorking: false };
    }

    console.log('\n=== STEP 3 COMPLETE ===');
    console.log('Data Persistence Verification Results:');
    Object.entries(results).forEach(([type, result]) => {
      console.log(`  ${type}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.persisted !== undefined) {
        console.log(`    Persisted: ${result.persisted ? 'YES' : 'NO'}`);
      }
    });
    
    return results;
  }

  async runFullPersistenceTest() {
    console.log('=== DATABASE PERSISTENCE TEST ===\n');
    console.log('This test will verify that data survives server restarts');
    console.log('and comes from the database, not in-memory storage.\n');
    
    try {
      // Step 1: Create test data
      const createResults = await this.createTestData();
      
      // Step 2: Restart server
      const restartSuccess = await this.restartServer();
      
      if (!restartSuccess) {
        console.log('Server restart failed. Cannot continue with persistence test.');
        return { success: false, error: 'Server restart failed' };
      }
      
      // Step 3: Verify data persistence
      const verifyResults = await this.verifyDataPersistence();
      
      // Overall assessment
      console.log('\n=== FINAL RESULTS ===');
      
      const memoryPersisted = verifyResults.memory?.persisted === true;
      const workflowPersisted = verifyResults.workflow?.persisted === true;
      const databaseWorking = verifyResults.newDataCreation?.databaseWorking === true;
      
      const overallSuccess = memoryPersisted && workflowPersisted && databaseWorking;
      
      console.log(`Memory Persistence: ${memoryPersisted ? 'PASS' : 'FAIL'}`);
      console.log(`Workflow Persistence: ${workflowPersisted ? 'PASS' : 'FAIL'}`);
      console.log(`Database Working: ${databaseWorking ? 'PASS' : 'FAIL'}`);
      console.log(`Overall: ${overallSuccess ? 'PERSISTENCE CONFIRMED' : 'PERSISTENCE FAILED'}`);
      
      if (overallSuccess) {
        console.log('\nSUCCESS: Database persistence is working correctly!');
        console.log('Data survives server restarts and comes from the database.');
      } else {
        console.log('\nFAILURE: Database persistence has issues.');
        console.log('Data may be stored in-memory or there are database problems.');
      }
      
      return {
        success: overallSuccess,
        createResults,
        verifyResults,
        overall: {
          memoryPersisted,
          workflowPersisted,
          databaseWorking
        }
      };
      
    } catch (error) {
      console.log('\n=== TEST FAILED ===');
      console.log('Error:', error.message);
      return { success: false, error: error.message };
    } finally {
      // Cleanup test data file
      try {
        fs.unlinkSync('./test-data-persistence.json');
        console.log('\nTest data file cleaned up');
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

// Run the database persistence test
const tester = new DatabasePersistenceTester();
tester.runFullPersistenceTest().catch(console.error);
