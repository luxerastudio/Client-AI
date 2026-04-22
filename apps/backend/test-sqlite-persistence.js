const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// SQLite database file
const dbPath = path.join(__dirname, 'test-persistence.db');

async function testDatabasePersistence() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    console.log('=== Database Persistence Test (SQLite) ===');
    
    db.serialize(() => {
      // Step 1: Create test tables
      console.log('1. Creating test tables...');
      db.run(`
        CREATE TABLE IF NOT EXISTS test_users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      db.run(`
        CREATE TABLE IF NOT EXISTS test_workflows (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          user_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES test_users(id)
        )
      `);
      
      db.run(`
        CREATE TABLE IF NOT EXISTS test_memories (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES test_users(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
          return;
        }
        console.log('   Test tables created/verified!');
        
        // Step 2: Create test data
        console.log('2. Creating test data...');
        const testUserId = uuidv4();
        const testWorkflowId = uuidv4();
        const testMemoryId = uuidv4();
        
        // Insert user
        db.run(`
          INSERT INTO test_users (id, name, email) 
          VALUES (?, ?, ?)
        `, [testUserId, 'Test User', `test-${Date.now()}@example.com`], function(err) {
          if (err) {
            console.error('Error inserting user:', err);
            reject(err);
            return;
          }
          
          // Insert workflow
          db.run(`
            INSERT INTO test_workflows (id, name, description, user_id) 
            VALUES (?, ?, ?, ?)
          `, [testWorkflowId, 'Test Workflow', 'Testing database persistence', testUserId], function(err) {
            if (err) {
              console.error('Error inserting workflow:', err);
              reject(err);
              return;
            }
            
            // Insert memory
            db.run(`
              INSERT INTO test_memories (id, user_id, content) 
              VALUES (?, ?, ?)
            `, [testMemoryId, testUserId, 'Test memory content for persistence testing'], function(err) {
              if (err) {
                console.error('Error inserting memory:', err);
                reject(err);
                return;
              }
              
              console.log('   Test data created successfully!');
              console.log(`   User ID: ${testUserId}`);
              console.log(`   Workflow ID: ${testWorkflowId}`);
              console.log(`   Memory ID: ${testMemoryId}`);
              
              // Step 3: Verify data was created
              console.log('3. Verifying data was created...');
              
              db.get('SELECT * FROM test_users WHERE id = ?', [testUserId], (err, user) => {
                if (err) {
                  console.error('Error fetching user:', err);
                  reject(err);
                  return;
                }
                
                db.get('SELECT * FROM test_workflows WHERE id = ?', [testWorkflowId], (err, workflow) => {
                  if (err) {
                    console.error('Error fetching workflow:', err);
                    reject(err);
                    return;
                  }
                  
                  db.get('SELECT * FROM test_memories WHERE id = ?', [testMemoryId], (err, memory) => {
                    if (err) {
                      console.error('Error fetching memory:', err);
                      reject(err);
                      return;
                    }
                    
                    console.log(`   User found: ${user ? 'YES' : 'NO'}`);
                    console.log(`   Workflow found: ${workflow ? 'YES' : 'NO'}`);
                    console.log(`   Memory found: ${memory ? 'YES' : 'NO'}`);
                    
                    if (user && workflow && memory) {
                      console.log('   All data verified successfully!');
                      
                      // Store IDs for next test run
                      console.log('4. Saving test IDs for persistence verification...');
                      console.log(`   TEST_USER_ID=${testUserId}`);
                      console.log(`   TEST_WORKFLOW_ID=${testWorkflowId}`);
                      console.log(`   TEST_MEMORY_ID=${testMemoryId}`);
                      
                      // Write IDs to a file for the next test
                      require('fs').writeFileSync('/tmp/test-ids-sqlite.json', JSON.stringify({
                        testUserId,
                        testWorkflowId,
                        testMemoryId
                      }));
                      
                      console.log('   Test IDs saved to /tmp/test-ids-sqlite.json');
                      console.log('\n=== Phase 1 Complete ===');
                      console.log('Now run this script again to test persistence after restart');
                      
                      resolve({ user, workflow, memory });
                    } else {
                      console.log('   ERROR: Some data was not found!');
                      reject(new Error('Data verification failed'));
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
    
    db.close();
  });
}

async function testPersistenceAfterRestart() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    console.log('=== Testing Persistence After Restart (SQLite) ===');
    
    // Check if we have saved test IDs
    let testIds;
    try {
      testIds = JSON.parse(require('fs').readFileSync('/tmp/test-ids-sqlite.json', 'utf8'));
    } catch (error) {
      console.log('No previous test data found. Running fresh test...');
      testDatabasePersistence().then(resolve).catch(reject);
      return;
    }
    
    console.log('1. Checking if previous test data still exists...');
    
    db.get('SELECT * FROM test_users WHERE id = ?', [testIds.testUserId], (err, user) => {
      if (err) {
        console.error('Error fetching user:', err);
        reject(err);
        return;
      }
      
      db.get('SELECT * FROM test_workflows WHERE id = ?', [testIds.testWorkflowId], (err, workflow) => {
        if (err) {
          console.error('Error fetching workflow:', err);
          reject(err);
          return;
        }
        
        db.get('SELECT * FROM test_memories WHERE id = ?', [testIds.testMemoryId], (err, memory) => {
          if (err) {
            console.error('Error fetching memory:', err);
            reject(err);
            return;
          }
          
          console.log(`   Previous user found: ${user ? 'YES' : 'NO'}`);
          console.log(`   Previous workflow found: ${workflow ? 'YES' : 'NO'}`);
          console.log(`   Previous memory found: ${memory ? 'YES' : 'NO'}`);
          
          if (user && workflow && memory) {
            console.log('   SUCCESS: All previous data still exists!');
            console.log('   Database persistence is working correctly!');
            
            console.log('\n=== Persistence Test Results ===');
            console.log('User:', user);
            console.log('Workflow:', workflow);
            console.log('Memory:', memory);
            
            // Clean up test data
            console.log('\n2. Cleaning up test data...');
            db.run('DELETE FROM test_memories WHERE user_id = ?', [testIds.testUserId]);
            db.run('DELETE FROM test_workflows WHERE user_id = ?', [testIds.testUserId]);
            db.run('DELETE FROM test_users WHERE id = ?', [testIds.testUserId]);
            
            // Clean up the ID file
            try {
              require('fs').unlinkSync('/tmp/test-ids-sqlite.json');
            } catch (e) {
              // File might not exist, that's okay
            }
            
            console.log('   Test data cleaned up successfully!');
            console.log('\n=== Database Persistence Test PASSED ===');
            
            resolve({ user, workflow, memory });
          } else {
            console.log('   FAILURE: Previous data was not found!');
            console.log('   Database persistence is NOT working correctly!');
            reject(new Error('Persistence test failed'));
          }
        });
      });
    });
    
    db.close();
  });
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
