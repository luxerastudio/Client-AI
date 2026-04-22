const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Simple file-based persistence test to simulate database behavior
const dataFile = path.join(__dirname, 'test-persistence-data.json');

function loadData() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = fs.readFileSync(dataFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('No existing data found, starting fresh');
  }
  return { users: [], workflows: [], memories: [] };
}

function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

async function testDatabasePersistence() {
  console.log('=== Database Persistence Test (File-based Simulation) ===');
  
  try {
    // Step 1: Load existing data
    console.log('1. Loading existing data...');
    const existingData = loadData();
    console.log(`   Found ${existingData.users.length} users, ${existingData.workflows.length} workflows, ${existingData.memories.length} memories`);
    
    // Step 2: Create test data
    console.log('2. Creating test data...');
    const testUserId = uuidv4();
    const testWorkflowId = uuidv4();
    const testMemoryId = uuidv4();
    
    const testUser = {
      id: testUserId,
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      createdAt: new Date().toISOString()
    };
    
    const testWorkflow = {
      id: testWorkflowId,
      name: 'Test Workflow',
      description: 'Testing database persistence',
      userId: testUserId,
      createdAt: new Date().toISOString()
    };
    
    const testMemory = {
      id: testMemoryId,
      userId: testUserId,
      content: 'Test memory content for persistence testing',
      createdAt: new Date().toISOString()
    };
    
    // Add test data to existing data
    const newData = {
      users: [...existingData.users, testUser],
      workflows: [...existingData.workflows, testWorkflow],
      memories: [...existingData.memories, testMemory]
    };
    
    // Step 3: Save data
    console.log('3. Saving test data...');
    saveData(newData);
    
    console.log('   Test data created successfully!');
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Workflow ID: ${testWorkflowId}`);
    console.log(`   Memory ID: ${testMemoryId}`);
    
    // Step 4: Verify data was created
    console.log('4. Verifying data was created...');
    const verificationData = loadData();
    
    const foundUser = verificationData.users.find(u => u.id === testUserId);
    const foundWorkflow = verificationData.workflows.find(w => w.id === testWorkflowId);
    const foundMemory = verificationData.memories.find(m => m.id === testMemoryId);
    
    console.log(`   User found: ${foundUser ? 'YES' : 'NO'}`);
    console.log(`   Workflow found: ${foundWorkflow ? 'YES' : 'NO'}`);
    console.log(`   Memory found: ${foundMemory ? 'YES' : 'NO'}`);
    
    if (foundUser && foundWorkflow && foundMemory) {
      console.log('   All data verified successfully!');
      
      // Store IDs for next test run
      console.log('5. Saving test IDs for persistence verification...');
      console.log(`   TEST_USER_ID=${testUserId}`);
      console.log(`   TEST_WORKFLOW_ID=${testWorkflowId}`);
      console.log(`   TEST_MEMORY_ID=${testMemoryId}`);
      
      // Write IDs to a file for the next test
      fs.writeFileSync('/tmp/test-ids-memory.json', JSON.stringify({
        testUserId,
        testWorkflowId,
        testMemoryId
      }));
      
      console.log('   Test IDs saved to /tmp/test-ids-memory.json');
      console.log('\n=== Phase 1 Complete ===');
      console.log('Now run this script again to test persistence after restart');
      
      return { foundUser, foundWorkflow, foundMemory };
    } else {
      console.log('   ERROR: Some data was not found!');
      throw new Error('Data verification failed');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
    throw error;
  }
}

async function testPersistenceAfterRestart() {
  console.log('=== Testing Persistence After Restart (File-based Simulation) ===');
  
  try {
    // Check if we have saved test IDs
    let testIds;
    try {
      testIds = JSON.parse(fs.readFileSync('/tmp/test-ids-memory.json', 'utf8'));
    } catch (error) {
      console.log('No previous test data found. Running fresh test...');
      return await testDatabasePersistence();
    }
    
    console.log('1. Checking if previous test data still exists...');
    const existingData = loadData();
    
    const foundUser = existingData.users.find(u => u.id === testIds.testUserId);
    const foundWorkflow = existingData.workflows.find(w => w.id === testIds.testWorkflowId);
    const foundMemory = existingData.memories.find(m => m.id === testIds.testMemoryId);
    
    console.log(`   Previous user found: ${foundUser ? 'YES' : 'NO'}`);
    console.log(`   Previous workflow found: ${foundWorkflow ? 'YES' : 'NO'}`);
    console.log(`   Previous memory found: ${foundMemory ? 'YES' : 'NO'}`);
    
    if (foundUser && foundWorkflow && foundMemory) {
      console.log('   SUCCESS: All previous data still exists!');
      console.log('   Database persistence is working correctly!');
      
      console.log('\n=== Persistence Test Results ===');
      console.log('User:', foundUser);
      console.log('Workflow:', foundWorkflow);
      console.log('Memory:', foundMemory);
      
      // Clean up test data
      console.log('\n2. Cleaning up test data...');
      const cleanedData = {
        users: existingData.users.filter(u => u.id !== testIds.testUserId),
        workflows: existingData.workflows.filter(w => w.userId !== testIds.testUserId),
        memories: existingData.memories.filter(m => m.userId !== testIds.testUserId)
      };
      
      saveData(cleanedData);
      
      // Clean up the ID file
      try {
        fs.unlinkSync('/tmp/test-ids-memory.json');
      } catch (e) {
        // File might not exist, that's okay
      }
      
      console.log('   Test data cleaned up successfully!');
      console.log('\n=== Database Persistence Test PASSED ===');
      
      return { foundUser, foundWorkflow, foundMemory };
    } else {
      console.log('   FAILURE: Previous data was not found!');
      console.log('   Database persistence is NOT working correctly!');
      throw new Error('Persistence test failed');
    }
    
  } catch (error) {
    console.error('Error during persistence test:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testPersistenceAfterRestart()
    .then(() => {
      console.log('Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testDatabasePersistence, testPersistenceAfterRestart };
