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

// Test scoring system
async function testScoringSystem() {
  console.log('=== Scoring System Test ===');
  
  const baseUrl = 'http://localhost:3001';
  const scoringResults = [];
  
  try {
    // Step 1: Test basic scoring
    console.log('1. Testing basic scoring...');
    
    const scoringOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/scoring/calculate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const scoringData = {
      entityType: 'content',
      entityId: 'test-content-1',
      factors: [
        {
          name: 'quality',
          value: 0.8,
          weight: 0.4,
          description: 'Content quality assessment'
        },
        {
          name: 'engagement',
          value: 0.7,
          weight: 0.3,
          description: 'Engagement potential'
        },
        {
          name: 'relevance',
          value: 0.9,
          weight: 0.3,
          description: 'Relevance to target audience'
        }
      ],
      algorithm: 'weighted',
      context: {
        contentType: 'marketing',
        targetAudience: 'general'
      }
    };
    
    const scoringResponse = await makeRequest(scoringOptions, scoringData);
    console.log(`   Scoring response: ${scoringResponse.statusCode}`);
    
    if (scoringResponse.statusCode === 200) {
      const result = JSON.parse(scoringResponse.body);
      console.log('   Scoring successful');
      
      if (result.data?.score !== undefined) {
        console.log(`   Score: ${result.data.score}`);
        scoringResults.push({
          input: scoringData.content,
          score: result.data.score,
          breakdown: result.data.breakdown,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('   WARNING: No score found in response');
      }
      
      if (result.data?.breakdown) {
        console.log(`   Breakdown: ${JSON.stringify(result.data.breakdown)}`);
      }
    } else {
      console.log(`   Scoring failed: ${scoringResponse.body}`);
      return;
    }
    
    // Step 2: Test determinism - same input multiple times
    console.log('2. Testing determinism (same input multiple times)...');
    
    const sameInputScores = [];
    const testContent = 'This is a high quality marketing content';
    
    for (let i = 0; i < 5; i++) {
      const testResponse = await makeRequest(scoringOptions, scoringData);
      
      if (testResponse.statusCode === 200) {
        const testResult = JSON.parse(testResponse.body);
        
        if (testResult.data?.score !== undefined) {
          sameInputScores.push(testResult.data.score);
          console.log(`   Attempt ${i + 1}: Score = ${testResult.data.score}`);
        }
      } else {
        console.log(`   Attempt ${i + 1} failed: ${testResponse.statusCode}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Check if all scores are the same
    const uniqueScores = new Set(sameInputScores);
    
    console.log(`   Total attempts: ${sameInputScores.length}`);
    console.log(`   Unique scores: ${uniqueScores.size}`);
    console.log(`   Scores: ${sameInputScores.join(', ')}`);
    
    if (uniqueScores.size === 1) {
      console.log('   SUCCESS: Same input produces same score (deterministic)');
    } else {
      console.log('   FAILURE: Same input produces different scores (random behavior detected)');
      return false;
    }
    
    // Step 3: Test different inputs produce different scores
    console.log('3. Testing different inputs produce different scores...');
    
    const differentInputs = [
      {
        name: 'High Quality Content',
        factors: [
          { name: 'quality', value: 0.9, weight: 0.4 },
          { name: 'engagement', value: 0.8, weight: 0.3 },
          { name: 'relevance', value: 0.9, weight: 0.3 }
        ]
      },
      {
        name: 'Poor Quality Content',
        factors: [
          { name: 'quality', value: 0.2, weight: 0.4 },
          { name: 'engagement', value: 0.1, weight: 0.3 },
          { name: 'relevance', value: 0.3, weight: 0.3 }
        ]
      },
      {
        name: 'Average Content',
        factors: [
          { name: 'quality', value: 0.5, weight: 0.4 },
          { name: 'engagement', value: 0.5, weight: 0.3 },
          { name: 'relevance', value: 0.5, weight: 0.3 }
        ]
      },
      {
        name: 'Exceptional Content',
        factors: [
          { name: 'quality', value: 1.0, weight: 0.4 },
          { name: 'engagement', value: 0.9, weight: 0.3 },
          { name: 'relevance', value: 0.9, weight: 0.3 }
        ]
      },
      {
        name: 'Mixed Quality Content',
        factors: [
          { name: 'quality', value: 0.3, weight: 0.4 },
          { name: 'engagement', value: 0.8, weight: 0.3 },
          { name: 'relevance', value: 0.6, weight: 0.3 }
        ]
      }
    ];
    
    const differentInputScores = [];
    
    for (const input of differentInputs) {
      const testData = {
        entityType: 'content',
        entityId: `test-content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        factors: input.factors,
        algorithm: 'weighted',
        context: {
          contentType: 'marketing',
          targetAudience: 'general'
        }
      };
      
      const testResponse = await makeRequest(scoringOptions, testData);
      
      if (testResponse.statusCode === 200) {
        const testResult = JSON.parse(testResponse.body);
        
        if (testResult.data?.score !== undefined) {
          differentInputScores.push({
            input: input.name,
            score: testResult.data.score,
            breakdown: testResult.data.breakdown,
            factors: input.factors
          });
          
          console.log(`   Input: "${input.name}"`);
          console.log(`   Score: ${testResult.data.score}`);
          console.log('');
        }
      } else {
        console.log(`   Failed for input: ${testResponse.statusCode}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Analyze score variation
    const scores = differentInputScores.map(r => r.score);
    const uniqueDifferentScores = new Set(scores);
    
    console.log(`   Different inputs tested: ${differentInputs.length}`);
    console.log(`   Scores generated: ${scores.length}`);
    console.log(`   Unique scores: ${uniqueDifferentScores.size}`);
    console.log(`   Score range: ${Math.min(...scores)} - ${Math.max(...scores)}`);
    
    if (uniqueDifferentScores.size >= 3) {
      console.log('   SUCCESS: Different inputs produce different scores');
    } else if (uniqueDifferentScores.size === 1) {
      console.log('   WARNING: All inputs produce the same score');
    } else {
      console.log('   LIMITED: Limited score variation detected');
    }
    
    // Step 4: Test score characteristics and logic
    console.log('4. Testing score characteristics and logic...');
    
    if (scores.length > 0) {
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      const scoreRange = maxScore - minScore;
      
      console.log(`   Average score: ${avgScore.toFixed(2)}`);
      console.log(`   Min score: ${minScore}`);
      console.log(`   Max score: ${maxScore}`);
      console.log(`   Score range: ${scoreRange}`);
      
      // Check if scores are in reasonable range (0-100 or 0-1)
      const isZeroToOne = scores.every(score => score >= 0 && score <= 1);
      const isZeroToHundred = scores.every(score => score >= 0 && score <= 100);
      
      if (isZeroToOne) {
        console.log('   Score range: 0-1 (normalized)');
      } else if (isZeroToHundred) {
        console.log('   Score range: 0-100 (percentage)');
      } else {
        console.log('   Score range: Custom scale');
      }
      
      // Test correlation between content length and score
      const lengthScorePairs = differentInputScores.map(r => ({
        length: r.input.length,
        score: r.score
      }));
      
      console.log('   Content length vs score analysis:');
      lengthScorePairs.forEach(pair => {
        console.log(`     Length ${pair.length}: Score ${pair.score}`);
      });
      
      // Step 5: Test edge cases
      console.log('5. Testing edge cases...');
      
      const edgeCases = [
        { content: '', description: 'Empty content' },
        { content: ' ', description: 'Whitespace only' },
        { content: 'a', description: 'Single character' },
        { content: 'A'.repeat(1000), description: 'Very long content' },
        { content: null, description: 'Null content' },
        { content: undefined, description: 'Undefined content' }
      ];
      
      for (const edgeCase of edgeCases) {
        try {
          const edgeResponse = await makeRequest(scoringOptions, { content: edgeCase.content });
          
          if (edgeResponse.statusCode === 200) {
            const edgeResult = JSON.parse(edgeResponse.body);
            console.log(`   ${edgeCase.description}: Score = ${edgeResult.data?.score}`);
          } else {
            console.log(`   ${edgeCase.description}: Failed (${edgeResponse.statusCode})`);
          }
        } catch (error) {
          console.log(`   ${edgeCase.description}: Error - ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Step 6: Test scoring consistency over time
      console.log('6. Testing scoring consistency over time...');
      
      const consistencyTestContent = 'Consistency test content for scoring system validation';
      const consistencyScores = [];
      
      // Test over a longer period with delays
      for (let i = 0; i < 3; i++) {
        const consistencyResponse = await makeRequest(scoringOptions, { content: consistencyTestContent });
        
        if (consistencyResponse.statusCode === 200) {
          const consistencyResult = JSON.parse(consistencyResponse.body);
          
          if (consistencyResult.data?.score !== undefined) {
            consistencyScores.push(consistencyResult.data.score);
            console.log(`   Consistency test ${i + 1}: Score = ${consistencyResult.data.score}`);
          }
        }
        
        // Wait 1 second between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const consistencyUniqueScores = new Set(consistencyScores);
      
      if (consistencyUniqueScores.size === 1) {
        console.log('   SUCCESS: Scoring is consistent over time');
      } else {
        console.log('   WARNING: Scoring varies over time');
      }
      
      // Summary
      console.log('\n=== Scoring System Test Results ===');
      console.log(`Basic scoring: ${scoringResponse.statusCode === 200 ? 'SUCCESS' : 'FAILED'}`);
      console.log(`Determinism: ${uniqueScores.size === 1 ? 'SUCCESS' : 'FAILED'}`);
      console.log(`Input variation: ${uniqueDifferentScores.size >= 3 ? 'SUCCESS' : 'PARTIAL'}`);
      console.log(`Time consistency: ${consistencyUniqueScores.size === 1 ? 'SUCCESS' : 'WARNING'}`);
      
      const logicBasedScoring = 
        scoringResponse.statusCode === 200 &&
        uniqueScores.size === 1 &&
        uniqueDifferentScores.size >= 2;
      
      console.log(`\nOverall: ${logicBasedScoring ? 'LOGIC-BASED SCORING CONFIRMED' : 'RANDOM BEHAVIOR DETECTED'}`);
      
      // Show sample results
      console.log('\n=== Sample Scoring Results ===');
      differentInputScores.slice(0, 5).forEach((result, index) => {
        console.log(`Test ${index + 1}:`);
        console.log(`  Input: "${result.input}"`);
        console.log(`  Score: ${result.score}`);
        if (result.breakdown) {
          console.log(`  Breakdown: ${JSON.stringify(result.breakdown)}`);
        }
        console.log('');
      });
      
      return logicBasedScoring;
    }
    
  } catch (error) {
    console.error('Error during scoring system test:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('Server is not running. Please start the server first.');
    }
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testScoringSystem()
    .then((success) => {
      if (success) {
        console.log('Scoring system test PASSED');
        process.exit(0);
      } else {
        console.log('Scoring system test FAILED');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Scoring system test failed:', error);
      process.exit(1);
    });
}

module.exports = { testScoringSystem };
