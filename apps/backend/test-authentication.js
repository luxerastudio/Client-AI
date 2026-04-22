const http = require('http');
const https = require('https');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test authentication system
async function testAuthentication() {
  console.log('=== Authentication System Test ===');
  
  const baseUrl = 'http://localhost:3001';
  let accessToken = null;
  let testUserId = null;
  
  try {
    // Step 1: Test user registration/login
    console.log('1. Testing user registration/login...');
    
    // Try to register a test user
    const registerOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const userData = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Test User'
    };
    
    let registerResponse;
    try {
      registerResponse = await makeRequest(registerOptions, userData);
      console.log(`   Register response: ${registerResponse.statusCode}`);
      
      if (registerResponse.statusCode === 201) {
        const registerData = JSON.parse(registerResponse.body);
        console.log('   Registration successful');
        console.log(`   User ID: ${registerData.data?.user?.id || 'N/A'}`);
        testUserId = registerData.data?.user?.id;
      }
    } catch (error) {
      console.log('   Registration failed, trying login...');
    }
    
    // Step 2: Try login
    console.log('2. Testing user login...');
    
    const loginOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const loginData = {
      email: userData.email,
      password: userData.password
    };
    
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log(`   Login response: ${loginResponse.statusCode}`);
    
    if (loginResponse.statusCode === 200) {
      const loginResult = JSON.parse(loginResponse.body);
      console.log('   Login successful');
      
      if (loginResult.data?.token) {
        accessToken = loginResult.data.token;
        console.log(`   Access token received: ${accessToken.substring(0, 50)}...`);
        
        // Check if it's a real JWT (not mock_token)
        if (accessToken === 'mock_token') {
          console.log('   WARNING: Token is "mock_token" - not a real JWT!');
        } else {
          // Basic JWT validation (check structure)
          const parts = accessToken.split('.');
          if (parts.length === 3) {
            console.log('   Token appears to be a real JWT (3 parts)');
            try {
              const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
              console.log(`   JWT Header: ${JSON.stringify(header)}`);
              console.log(`   JWT Payload (partial): ${JSON.stringify({sub: payload.sub, iat: payload.iat, exp: payload.exp})}`);
            } catch (error) {
              console.log('   Token has JWT structure but payload parsing failed');
            }
          } else {
            console.log('   Token does not have JWT structure');
          }
        }
      } else {
        console.log('   No token in login response');
      }
    } else {
      console.log(`   Login failed: ${loginResponse.body}`);
      return;
    }
    
    // Step 3: Call protected route WITH token
    console.log('3. Testing protected route WITH token...');
    
    const protectedOptionsWithToken = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/workflows',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    const protectedResponseWithToken = await makeRequest(protectedOptionsWithToken);
    console.log(`   Protected route WITH token: ${protectedResponseWithToken.statusCode}`);
    
    if (protectedResponseWithToken.statusCode === 200) {
      console.log('   SUCCESS: Protected route accessible with token');
      const data = JSON.parse(protectedResponseWithToken.body);
      console.log(`   Response data: ${data.success ? 'Success' : 'Error'}`);
    } else if (protectedResponseWithToken.statusCode === 401) {
      console.log('   UNEXPECTED: Got 401 even with valid token');
    } else {
      console.log(`   Other response: ${protectedResponseWithToken.statusCode}`);
    }
    
    // Step 4: Call same protected route WITHOUT token
    console.log('4. Testing protected route WITHOUT token...');
    
    const protectedOptionsWithoutToken = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/workflows',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const protectedResponseWithoutToken = await makeRequest(protectedOptionsWithoutToken);
    console.log(`   Protected route WITHOUT token: ${protectedResponseWithoutToken.statusCode}`);
    
    if (protectedResponseWithoutToken.statusCode === 401) {
      console.log('   SUCCESS: Protected route correctly rejects requests without token');
      const errorData = JSON.parse(protectedResponseWithoutToken.body);
      console.log(`   Error message: ${errorData.error?.message || 'No message'}`);
    } else if (protectedResponseWithoutToken.statusCode === 200) {
      console.log('   WARNING: Protected route accessible without token!');
    } else {
      console.log(`   Other response: ${protectedResponseWithoutToken.statusCode}`);
    }
    
    // Step 5: Test with invalid token
    console.log('5. Testing protected route WITH invalid token...');
    
    const protectedOptionsInvalidToken = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/workflows',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid_token_12345',
        'Content-Type': 'application/json'
      }
    };
    
    const protectedResponseInvalidToken = await makeRequest(protectedOptionsInvalidToken);
    console.log(`   Protected route WITH invalid token: ${protectedResponseInvalidToken.statusCode}`);
    
    if (protectedResponseInvalidToken.statusCode === 401) {
      console.log('   SUCCESS: Protected route correctly rejects invalid token');
    } else {
      console.log(`   Unexpected response: ${protectedResponseInvalidToken.statusCode}`);
    }
    
    // Summary
    console.log('\n=== Authentication Test Results ===');
    console.log(`Login: ${loginResponse.statusCode === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Token received: ${accessToken ? 'YES' : 'NO'}`);
    console.log(`Real JWT: ${accessToken && accessToken !== 'mock_token' ? 'YES' : 'NO'}`);
    console.log(`Protected with token: ${protectedResponseWithToken.statusCode === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Protected without token: ${protectedResponseWithoutToken.statusCode === 401 ? 'SUCCESS (401)' : 'FAILED'}`);
    console.log(`Protected with invalid token: ${protectedResponseInvalidToken.statusCode === 401 ? 'SUCCESS (401)' : 'FAILED'}`);
    
    // Final verification
    const authWorking = 
      loginResponse.statusCode === 200 && 
      accessToken && 
      accessToken !== 'mock_token' &&
      protectedResponseWithToken.statusCode === 200 &&
      protectedResponseWithoutToken.statusCode === 401 &&
      protectedResponseInvalidToken.statusCode === 401;
    
    console.log(`\nOverall: ${authWorking ? 'AUTHENTICATION WORKING CORRECTLY' : 'AUTHENTICATION ISSUES DETECTED'}`);
    
  } catch (error) {
    console.error('Error during authentication test:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('Server is not running. Please start the server first.');
    }
  }
}

// Run the test
if (require.main === module) {
  testAuthentication()
    .then(() => {
      console.log('Authentication test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Authentication test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAuthentication };
