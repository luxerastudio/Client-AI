// Backend Server Health Test
const http = require('http');

async function testServerHealth() {
  console.log('Testing Backend Server Health...\n');
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const options = {
      hostname: 'localhost',
      port: 3003,
      path: '/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    console.log('Sending GET request to /health endpoint...');

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`Response received in ${responseTime}ms`);
        console.log(`Status Code: ${res.statusCode}`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('Response Body:', JSON.stringify(jsonData, null, 2));
          
          // Health verification criteria
          const checks = {
            statusCode: res.statusCode === 200,
            status: jsonData.status === 'healthy' || jsonData.status === 'ok',
            hasTimestamp: !!jsonData.timestamp,
            responseTime: responseTime < 200
          };
          
          console.log('\n=== HEALTH CHECK RESULTS ===');
          console.log(`Status Code (200): ${checks.statusCode ? 'PASS' : 'FAIL'}`);
          console.log(`Status ("ok"/"healthy"): ${checks.status ? 'PASS' : 'FAIL'}`);
          console.log(`Timestamp exists: ${checks.hasTimestamp ? 'PASS' : 'FAIL'}`);
          console.log(`Response time < 200ms: ${checks.responseTime ? 'PASS' : 'FAIL'} (${responseTime}ms)`);
          
          const allChecksPass = Object.values(checks).every(check => check === true);
          
          console.log(`\nOverall Health: ${allChecksPass ? 'HEALTHY' : 'UNHEALTHY'}`);
          
          resolve({
            success: allChecksPass,
            responseTime,
            statusCode: res.statusCode,
            status: jsonData.status,
            timestamp: jsonData.timestamp,
            checks
          });
          
        } catch (e) {
          console.log('Failed to parse JSON response:', data);
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      console.log('Request Error:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Run the health test
testServerHealth()
  .then(result => {
    console.log('\n=== HEALTH TEST COMPLETED ===');
    if (result.success) {
      console.log('Server is stable and responding correctly!');
    } else {
      console.log('Server health check failed!');
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.log('\n=== HEALTH TEST FAILED ===');
    console.log('Error:', error.message);
    process.exit(1);
  });
