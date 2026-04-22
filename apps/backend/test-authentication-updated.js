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
  let testUserId = `test-user-${Date.now()}`;
  
  try {
    // Step 1: Generate JWT token using available auth endpoint
    console.log('1. Testing JWT token generation...');
    
    const tokenOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/security/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const tokenData = {
      userId: testUserId,
      payload: {
        role: 'user',
        permissions: ['read', 'write']
      },
      expiresIn: '1h'
    };
    
    const tokenResponse = await makeRequest(tokenOptions, tokenData);
    console.log(`   Token generation response: ${tokenResponse.statusCode}`);
    
    if (tokenResponse.statusCode === 200) {
      const tokenResult = JSON.parse(tokenResponse.body);
      console.log('   Token generation successful');
      
      if (tokenResult.data?.token) {
        accessToken = tokenResult.data.token;
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
              
              // Verify the token using the verify endpoint
              console.log('2. Testing JWT token verification...');
              
              const verifyOptions = {
                hostname: 'localhost',
                port: 3001,
                path: '/api/v1/security/auth/verify',
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                }
              };
              
              const verifyData = { token: accessToken };
              const verifyResponse = await makeRequest(verifyOptions, verifyData);
              console.log(`   Token verification response: ${verifyResponse.statusCode}`);
              
              if (verifyResponse.statusCode === 200) {
                const verifyResult = JSON.parse(verifyResponse.body);
                console.log('   Token verification successful');
                console.log(`   Verified payload: ${JSON.stringify(verifyResult.data?.payload || {})}`);
              } else {
                console.log(`   Token verification failed: ${verifyResponse.body}`);
              }
            } catch (error) {
              console.log('   Token has JWT structure but payload parsing failed');
            }
          } else {
            console.log('   Token does not have JWT structure');
          }
        }
      } else {
        console.log('   No token in response');
        return;
      }
    } else {
      console.log(`   Token generation failed: ${tokenResponse.body}`);
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
      const errorData = JSON.parse(protectedResponseWithToken.body);
      console.log(`   Error message: ${errorData.error?.message || 'No message'}`);
    } else {
      console.log(`   Other response: ${protectedResponseWithToken.statusCode}`);
      console.log(`   Response body: ${protectedResponseWithToken.body.substring(0, 200)}...`);
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
      console.log(`   Response body: ${protectedResponseWithoutToken.body.substring(0, 200)}...`);
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
      const errorData = JSON.parse(protectedResponseInvalidToken.body);
      console.log(`   Error message: ${errorData.error?.message || 'No message'}`);
    } else {
      console.log(`   Unexpected response: ${protectedResponseInvalidToken.statusCode}`);
      console.log(`   Response body: ${protectedResponseInvalidToken.body.substring(0, 200)}...`);
    }
    
    // Step 6: Test with malformed token
    console.log('6. Testing protected route WITH malformed token...');
    
    const protectedOptionsMalformedToken = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/workflows',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer malformed.jwt.token',
        'Content-Type': 'application/json'
      }
    };
    
    const protectedResponseMalformedToken = await makeRequest(protectedOptionsMalformedToken);
    console.log(`   Protected route WITH malformed token: ${protectedResponseMalformedToken.statusCode}`);
    
    if (protectedResponseMalformedToken.statusCode === 401) {
      console.log('   SUCCESS: Protected route correctly rejects malformed token');
    } else {
      console.log(`   Unexpected response: ${protectedResponseMalformedToken.statusCode}`);
    }
    
    // Summary
    console.log('\n=== Authentication Test Results ===');
    console.log(`Token generation: ${tokenResponse.statusCode === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Token received: ${accessToken ? 'YES' : 'NO'}`);
    console.log(`Real JWT: ${accessToken && accessToken !== 'mock_token' ? 'YES' : 'NO'}`);
    console.log(`Token verification: ${verifyResponse && verifyResponse.statusCode === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Protected with token: ${protectedResponseWithToken.statusCode === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Protected without token: ${protectedResponseWithoutToken.statusCode === 401 ? 'SUCCESS (401)' : 'FAILED'}`);
    console.log(`Protected with invalid token: ${protectedResponseInvalidToken.statusCode === 401 ? 'SUCCESS (401)' : 'FAILED'}`);
    console.log(`Protected with malformed token: ${protectedResponseMalformedToken.statusCode === 401 ? 'SUCCESS (401)' : 'FAILED'}`);
    
    // Final verification
    const authWorking = 
      tokenResponse.statusCode === 200 && 
      accessToken && 
      accessToken !== 'mock_token' &&
      verifyResponse && verifyResponse.statusCode === 200 &&
      protectedResponseWithToken.statusCode === 200 &&
      protectedResponseWithoutToken.statusCode === 401 &&
      protectedResponseInvalidToken.statusCode === 401 &&
      protectedResponseMalformedToken.statusCode === 401;
    
    console.log(`\nOverall: ${authWorking ? 'AUTHENTICATION WORKING CORRECTLY' : 'AUTHENTICATION ISSUES DETECTED'}`);
    
    if (authWorking) {
      console.log('\n=== JWT Token Analysis ===');
      const parts = accessToken.split('.');
      console.log(`Token structure: ${parts.length} parts (expected: 3)`);
      
      try {
        const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log(`Algorithm: ${header.alg}`);
        console.log(`Token Type: ${header.typ}`);
        console.log(`User ID: ${payload.sub}`);
        console.log(`Issued At: ${new Date(payload.iat * 1000).toISOString()}`);
        console.log(`Expires At: ${new Date(payload.exp * 1000).toISOString()}`);
        console.log(`Current Time: ${new Date().toISOString()}`);
        console.log(`Token Valid: ${Date.now() < payload.exp * 1000 ? 'YES' : 'EXPIRED'}`);
      } catch (error) {
        console.log('Could not parse JWT payload for detailed analysis');
      }
    }
    
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
