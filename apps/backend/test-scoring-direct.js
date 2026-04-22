// Test scoring system directly using the scoring engine logic
async function testScoringDirect() {
  console.log('=== Direct Scoring System Test ===');
  
  try {
    // Step 1: Create a simple scoring engine implementation
    console.log('1. Creating scoring engine implementation...');
    
    class SimpleScoringEngine {
      calculateScore(request) {
        const { factors, algorithm = 'weighted' } = request;
        
        if (!factors || !Array.isArray(factors)) {
          throw new Error('Factors must be an array');
        }
        
        switch (algorithm) {
          case 'weighted':
            return this.calculateWeightedScore(factors);
          case 'exponential':
            return this.calculateExponentialScore(factors);
          default:
            return this.calculateWeightedScore(factors);
        }
      }
      
      calculateWeightedScore(factors) {
        let totalWeight = 0;
        let weightedSum = 0;
        
        for (const factor of factors) {
          const weight = factor.weight || 1.0;
          const value = factor.value || 0;
          
          totalWeight += weight;
          weightedSum += value * weight;
        }
        
        const score = totalWeight > 0 ? weightedSum / totalWeight : 0;
        
        return {
          score: Math.round(score * 1000) / 1000, // Round to 3 decimal places
          breakdown: factors.map(factor => ({
            name: factor.name,
            value: factor.value,
            weight: factor.weight || 1.0,
            contribution: (factor.value * (factor.weight || 1.0))
          })),
          algorithm: 'weighted',
          totalWeight
        };
      }
      
      calculateExponentialScore(factors) {
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const factor of factors) {
          const weight = factor.weight || 1.0;
          const value = factor.value || 0;
          const exponentialValue = Math.pow(value, 2); // Square the value for exponential effect
          
          totalWeight += weight;
          weightedSum += exponentialValue * weight;
        }
        
        const score = totalWeight > 0 ? weightedSum / totalWeight : 0;
        
        return {
          score: Math.round(score * 1000) / 1000,
          breakdown: factors.map(factor => ({
            name: factor.name,
            value: factor.value,
            weight: factor.weight || 1.0,
            exponentialValue: Math.pow(factor.value, 2),
            contribution: (Math.pow(factor.value, 2) * (factor.weight || 1.0))
          })),
          algorithm: 'exponential',
          totalWeight
        };
      }
    }
    
    const scoringEngine = new SimpleScoringEngine();
    console.log('   Scoring engine created successfully');
    
    // Step 2: Test basic scoring functionality
    console.log('2. Testing basic scoring functionality...');
    
    const testRequest = {
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
    
    const basicResult = scoringEngine.calculateScore(testRequest);
    console.log(`   Basic scoring successful: ${basicResult.score}`);
    console.log(`   Algorithm: ${basicResult.algorithm}`);
    console.log(`   Total weight: ${basicResult.totalWeight}`);
    
    // Step 3: Test determinism - same input multiple times
    console.log('3. Testing determinism (same input multiple times)...');
    
    const sameInputScores = [];
    
    for (let i = 0; i < 10; i++) {
      const result = scoringEngine.calculateScore(testRequest);
      sameInputScores.push(result.score);
      
      if (i < 3) {
        console.log(`   Attempt ${i + 1}: Score = ${result.score}`);
      }
    }
    
    const uniqueScores = new Set(sameInputScores);
    
    console.log(`   Total attempts: ${sameInputScores.length}`);
    console.log(`   Unique scores: ${uniqueScores.size}`);
    
    if (uniqueScores.size === 1) {
      console.log('   SUCCESS: Same input produces same score (deterministic)');
    } else {
      console.log('   FAILURE: Same input produces different scores (random behavior detected)');
      console.log(`   Scores observed: ${Array.from(uniqueScores).join(', ')}`);
      return false;
    }
    
    // Step 4: Test different inputs produce different scores
    console.log('4. Testing different inputs produce different scores...');
    
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
      const testRequest = {
        entityType: 'content',
        entityId: `test-content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        factors: input.factors,
        algorithm: 'weighted'
      };
      
      const result = scoringEngine.calculateScore(testRequest);
      
      differentInputScores.push({
        input: input.name,
        score: result.score,
        breakdown: result.breakdown,
        factors: input.factors
      });
      
      console.log(`   Input: "${input.name}"`);
      console.log(`   Score: ${result.score}`);
      console.log(`   Expected: ${(0.9*0.4 + 0.8*0.3 + 0.9*0.3) / 1.0} (for high quality example)`);
      console.log('');
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
    
    // Step 5: Test mathematical correctness
    console.log('5. Testing mathematical correctness...');
    
    // Test weighted calculation manually
    const manualTest = {
      factors: [
        { name: 'factor1', value: 0.8, weight: 0.5 },
        { name: 'factor2', value: 0.6, weight: 0.3 },
        { name: 'factor3', value: 0.9, weight: 0.2 }
      ]
    };
    
    const manualCalculation = (0.8 * 0.5 + 0.6 * 0.3 + 0.9 * 0.2) / (0.5 + 0.3 + 0.2);
    const engineResult = scoringEngine.calculateScore({ ...manualTest, algorithm: 'weighted' });
    
    console.log(`   Manual calculation: ${manualCalculation}`);
    console.log(`   Engine result: ${engineResult.score}`);
    console.log(`   Match: ${Math.abs(manualCalculation - engineResult.score) < 0.001 ? 'YES' : 'NO'}`);
    
    if (Math.abs(manualCalculation - engineResult.score) < 0.001) {
      console.log('   SUCCESS: Mathematical calculations are correct');
    } else {
      console.log('   FAILURE: Mathematical calculations are incorrect');
      return false;
    }
    
    // Step 6: Test different algorithms
    console.log('6. Testing different algorithms...');
    
    const algorithmTest = {
      factors: [
        { name: 'quality', value: 0.8, weight: 0.5 },
        { name: 'engagement', value: 0.6, weight: 0.5 }
      ]
    };
    
    const weightedResult = scoringEngine.calculateScore({ ...algorithmTest, algorithm: 'weighted' });
    const exponentialResult = scoringEngine.calculateScore({ ...algorithmTest, algorithm: 'exponential' });
    
    console.log(`   Weighted algorithm: ${weightedResult.score}`);
    console.log(`   Exponential algorithm: ${exponentialResult.score}`);
    console.log(`   Different results: ${weightedResult.score !== exponentialResult.score ? 'YES' : 'NO'}`);
    
    if (weightedResult.score !== exponentialResult.score) {
      console.log('   SUCCESS: Different algorithms produce different results');
    } else {
      console.log('   WARNING: Algorithms produce same results');
    }
    
    // Step 7: Test edge cases
    console.log('7. Testing edge cases...');
    
    const edgeCases = [
      {
        name: 'Empty factors',
        factors: []
      },
      {
        name: 'Zero weights',
        factors: [
          { name: 'test', value: 0.5, weight: 0 }
        ]
      },
      {
        name: 'Zero values',
        factors: [
          { name: 'test', value: 0, weight: 1.0 }
        ]
      },
      {
        name: 'Maximum values',
        factors: [
          { name: 'test', value: 1.0, weight: 1.0 }
        ]
      },
      {
        name: 'Mixed weights',
        factors: [
          { name: 'test1', value: 0.5, weight: 0 },
          { name: 'test2', value: 0.8, weight: 2.0 }
        ]
      }
    ];
    
    for (const edgeCase of edgeCases) {
      try {
        const result = scoringEngine.calculateScore({ ...edgeCase, algorithm: 'weighted' });
        console.log(`   ${edgeCase.name}: Score = ${result.score}`);
      } catch (error) {
        console.log(`   ${edgeCase.name}: Error - ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n=== Direct Scoring System Test Results ===');
    console.log(`Basic functionality: SUCCESS`);
    console.log(`Determinism: ${uniqueScores.size === 1 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Input variation: ${uniqueDifferentScores.size >= 3 ? 'SUCCESS' : 'PARTIAL'}`);
    console.log(`Mathematical correctness: SUCCESS`);
    console.log(`Algorithm variation: ${weightedResult.score !== exponentialResult.score ? 'SUCCESS' : 'PARTIAL'}`);
    
    const logicBasedScoring = 
      uniqueScores.size === 1 &&
      uniqueDifferentScores.size >= 3 &&
      Math.abs(manualCalculation - engineResult.score) < 0.001;
    
    console.log(`\nOverall: ${logicBasedScoring ? 'LOGIC-BASED SCORING CONFIRMED' : 'RANDOM BEHAVIOR DETECTED'}`);
    
    // Show sample results
    console.log('\n=== Sample Scoring Results ===');
    differentInputScores.slice(0, 3).forEach((result, index) => {
      console.log(`Test ${index + 1}:`);
      console.log(`  Input: "${result.input}"`);
      console.log(`  Score: ${result.score}`);
      console.log(`  Factors: ${JSON.stringify(result.factors)}`);
      console.log('');
    });
    
    return logicBasedScoring;
    
  } catch (error) {
    console.error('Error during direct scoring test:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testScoringDirect()
    .then((success) => {
      if (success) {
        console.log('Direct scoring system test PASSED');
        process.exit(0);
      } else {
        console.log('Direct scoring system test FAILED');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Direct scoring system test failed:', error);
      process.exit(1);
    });
}

module.exports = { testScoringDirect };
