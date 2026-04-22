const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ai_client_acquisition',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

async function testDatabasePersistence() {
  const pool = new Pool(config);
  let client;
  
  try {
    console.log('=== Database Persistence Test ===');
    
    // Step 1: Connect to database
    console.log('1. Connecting to database...');
    client = await pool.connect();
    console.log('   Connected successfully!');
    
    // Step 2: Create test tables if they don't exist
    console.log('2. Creating test tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        user_id UUID REFERENCES test_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES test_users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   Test tables created/verified!');
    
    // Step 3: Create test data
    console.log('3. Creating test data...');
    const testUserId = uuidv4();
    const testWorkflowId = uuidv4();
    const testMemoryId = uuidv4();
    
    // Insert user
    await client.query(`
      INSERT INTO test_users (id, name, email) 
      VALUES ($1, $2, $3)
    `, [testUserId, 'Test User', `test-${Date.now()}@example.com`]);
    
    // Insert workflow
    await client.query(`
      INSERT INTO test_workflows (id, name, description, user_id) 
      VALUES ($1, $2, $3, $4)
    `, [testWorkflowId, 'Test Workflow', 'Testing database persistence', testUserId]);
    
    // Insert memory
    await client.query(`
      INSERT INTO test_memories (id, user_id, content) 
      VALUES ($1, $2, $3)
    `, [testMemoryId, testUserId, 'Test memory content for persistence testing']);
    
    console.log('   Test data created successfully!');
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Workflow ID: ${testWorkflowId}`);
    console.log(`   Memory ID: ${testMemoryId}`);
    
    // Step 4: Verify data was created
    console.log('4. Verifying data was created...');
    
    const userResult = await client.query('SELECT * FROM test_users WHERE id = $1', [testUserId]);
    const workflowResult = await client.query('SELECT * FROM test_workflows WHERE id = $1', [testWorkflowId]);
    const memoryResult = await client.query('SELECT * FROM test_memories WHERE id = $1', [testMemoryId]);
    
    console.log(`   User found: ${userResult.rows.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   Workflow found: ${workflowResult.rows.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   Memory found: ${memoryResult.rows.length > 0 ? 'YES' : 'NO'}`);
    
    if (userResult.rows.length > 0 && workflowResult.rows.length > 0 && memoryResult.rows.length > 0) {
      console.log('   All data verified successfully!');
      
      // Store IDs for next test run
      console.log('5. Saving test IDs for persistence verification...');
      console.log(`   TEST_USER_ID=${testUserId}`);
      console.log(`   TEST_WORKFLOW_ID=${testWorkflowId}`);
      console.log(`   TEST_MEMORY_ID=${testMemoryId}`);
      
      // Write IDs to a file for the next test
      require('fs').writeFileSync('/tmp/test-ids.json', JSON.stringify({
        testUserId,
        testWorkflowId,
        testMemoryId
      }));
      
      console.log('   Test IDs saved to /tmp/test-ids.json');
      console.log('\n=== Phase 1 Complete ===');
      console.log('Now run this script again to test persistence after restart');
      
    } else {
      console.log('   ERROR: Some data was not found!');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

async function testPersistenceAfterRestart() {
  const pool = new Pool(config);
  let client;
  
  try {
    console.log('=== Testing Persistence After Restart ===');
    
    // Check if we have saved test IDs
    let testIds;
    try {
      testIds = JSON.parse(require('fs').readFileSync('/tmp/test-ids.json', 'utf8'));
    } catch (error) {
      console.log('No previous test data found. Running fresh test...');
      await testDatabasePersistence();
      return;
    }
    
    console.log('1. Connecting to database...');
    client = await pool.connect();
    console.log('   Connected successfully!');
    
    console.log('2. Checking if previous test data still exists...');
    
    const userResult = await client.query('SELECT * FROM test_users WHERE id = $1', [testIds.testUserId]);
    const workflowResult = await client.query('SELECT * FROM test_workflows WHERE id = $1', [testIds.testWorkflowId]);
    const memoryResult = await client.query('SELECT * FROM test_memories WHERE id = $1', [testIds.testMemoryId]);
    
    console.log(`   Previous user found: ${userResult.rows.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   Previous workflow found: ${workflowResult.rows.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   Previous memory found: ${memoryResult.rows.length > 0 ? 'YES' : 'NO'}`);
    
    if (userResult.rows.length > 0 && workflowResult.rows.length > 0 && memoryResult.rows.length > 0) {
      console.log('   SUCCESS: All previous data still exists!');
      console.log('   Database persistence is working correctly!');
      
      console.log('\n=== Persistence Test Results ===');
      console.log('User:', userResult.rows[0]);
      console.log('Workflow:', workflowResult.rows[0]);
      console.log('Memory:', memoryResult.rows[0]);
      
      // Clean up test data
      console.log('\n3. Cleaning up test data...');
      await client.query('DELETE FROM test_memories WHERE user_id = $1', [testIds.testUserId]);
      await client.query('DELETE FROM test_workflows WHERE user_id = $1', [testIds.testUserId]);
      await client.query('DELETE FROM test_users WHERE id = $1', [testIds.testUserId]);
      
      // Clean up the ID file
      require('fs').unlinkSync('/tmp/test-ids.json');
      
      console.log('   Test data cleaned up successfully!');
      console.log('\n=== Database Persistence Test PASSED ===');
      
    } else {
      console.log('   FAILURE: Previous data was not found!');
      console.log('   Database persistence is NOT working correctly!');
    }
    
  } catch (error) {
    console.error('Error during persistence test:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the test
if (require.main === module) {
  testPersistenceAfterRestart();
}

module.exports = { testDatabasePersistence, testPersistenceAfterRestart };
