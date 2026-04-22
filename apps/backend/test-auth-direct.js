const { AuthenticationService } = require('./src/infrastructure/security/AuthenticationService');
const { SecurityConfigManager } = require('./src/infrastructure/security/SecurityConfigManager');

// Test JWT authentication directly using services
async function testAuthenticationDirect() {
  console.log('=== Direct JWT Authentication Test ===');
  
  try {
    // Step 1: Initialize security config and auth service
    console.log('1. Initializing authentication service...');
    
    const securityConfig = new SecurityConfigManager({
      environment: 'development',
      configPath: './config/security.json',
      enableHotReload: false,
      validateConfig: false
    });
    
    const authService = new AuthenticationService(securityConfig.getConfig());
    
    console.log('   Authentication service initialized');
    
    // Step 2: Generate JWT token
    console.log('2. Generating JWT token...');
    
    const testUserId = `test-user-${Date.now()}`;
    const payload = {
      role: 'user',
      permissions: ['read', 'write'],
      sessionId: 'test-session-123'
    };
    const expiresIn = '1h';
    
    const token = await authService.generateToken(testUserId, payload, expiresIn);
    console.log(`   Token generated: ${token.substring(0, 50)}...`);
    
    // Check if it's a real JWT (not mock_token)
    if (token === 'mock_token') {
      console.log('   WARNING: Token is "mock_token" - not a real JWT!');
      return false;
    }
    
    // Basic JWT validation (check structure)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('   ERROR: Token does not have JWT structure');
      return false;
    }
    
    console.log('   Token appears to be a real JWT (3 parts)');
    
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const jwtPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      console.log(`   JWT Header: ${JSON.stringify(header)}`);
      console.log(`   JWT Payload: ${JSON.stringify({sub: jwtPayload.sub, iat: jwtPayload.iat, exp: jwtPayload.exp, role: jwtPayload.role})}`);
      
      // Step 3: Verify JWT token
      console.log('3. Verifying JWT token...');
      
      const verificationResult = await authService.verifyToken(token);
      
      if (verificationResult.valid) {
        console.log('   Token verification successful');
        console.log(`   Verified payload: ${JSON.stringify(verificationResult.payload)}`);
        console.log(`   User ID: ${verificationResult.payload.sub}`);
        console.log(`   Role: ${verificationResult.payload.role}`);
        console.log(`   Permissions: ${JSON.stringify(verificationResult.payload.permissions)}`);
      } else {
        console.log('   Token verification failed');
        console.log(`   Error: ${verificationResult.error}`);
        return false;
      }
      
      // Step 4: Test with invalid token
      console.log('4. Testing with invalid token...');
      
      const invalidTokenResult = await authService.verifyToken('invalid_token_12345');
      
      if (!invalidTokenResult.valid) {
        console.log('   Invalid token correctly rejected');
        console.log(`   Error: ${invalidTokenResult.error}`);
      } else {
        console.log('   ERROR: Invalid token was accepted!');
        return false;
      }
      
      // Step 5: Test with malformed token
      console.log('5. Testing with malformed token...');
      
      const malformedTokenResult = await authService.verifyToken('malformed.jwt.token');
      
      if (!malformedTokenResult.valid) {
        console.log('   Malformed token correctly rejected');
        console.log(`   Error: ${malformedTokenResult.error}`);
      } else {
        console.log('   ERROR: Malformed token was accepted!');
        return false;
      }
      
      // Step 6: Test token expiration
      console.log('6. Testing token expiration...');
      
      const expiredToken = await authService.generateToken(testUserId, payload, '1ms'); // 1 millisecond expiration
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait for token to expire
      
      const expiredTokenResult = await authService.verifyToken(expiredToken);
      
      if (!expiredTokenResult.valid) {
        console.log('   Expired token correctly rejected');
        console.log(`   Error: ${expiredTokenResult.error}`);
      } else {
        console.log('   ERROR: Expired token was accepted!');
        return false;
      }
      
      // Summary
      console.log('\n=== Direct Authentication Test Results ===');
      console.log(`Token generation: SUCCESS`);
      console.log(`Real JWT: YES`);
      console.log(`Token verification: SUCCESS`);
      console.log(`Invalid token rejection: SUCCESS`);
      console.log(`Malformed token rejection: SUCCESS`);
      console.log(`Expired token rejection: SUCCESS`);
      
      console.log('\n=== JWT Token Analysis ===');
      console.log(`Token structure: ${parts.length} parts (expected: 3)`);
      console.log(`Algorithm: ${header.alg}`);
      console.log(`Token Type: ${header.typ}`);
      console.log(`User ID: ${jwtPayload.sub}`);
      console.log(`Issued At: ${new Date(jwtPayload.iat * 1000).toISOString()}`);
      console.log(`Expires At: ${new Date(jwtPayload.exp * 1000).toISOString()}`);
      console.log(`Current Time: ${new Date().toISOString()}`);
      console.log(`Token Valid: ${Date.now() < jwtPayload.exp * 1000 ? 'YES' : 'EXPIRED'}`);
      
      console.log('\n=== AUTHENTICATION WORKING CORRECTLY ===');
      return true;
      
    } catch (error) {
      console.log('   Token has JWT structure but payload parsing failed');
      console.log(`   Error: ${error.message}`);
      return false;
    }
    
  } catch (error) {
    console.error('Error during direct authentication test:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testAuthenticationDirect()
    .then((success) => {
      if (success) {
        console.log('Direct authentication test PASSED');
        process.exit(0);
      } else {
        console.log('Direct authentication test FAILED');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Direct authentication test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAuthenticationDirect };
