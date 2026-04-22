#!/usr/bin/env npx tsx

/**
 * Test runAcquisitionFlow function directly
 */

import { coreSystem } from './lib/core/index';
import { accessControl } from './lib/core/access-control';

async function testAcquisitionFlow() {
  console.log('🚀 Testing runAcquisitionFlow() function...');
  
  try {
    // Setup user in access control first
    const userId = 'test_user_' + Date.now();
    console.log(`🔧 Creating user access for: ${userId}`);
    await accessControl.createUserAccess(userId, 'pro');
    
    // Check user access
    const accessCheck = await accessControl.checkAccess(userId);
    console.log(`🔍 Access check:`, accessCheck);
    
    console.log(`🎯 Calling runAcquisitionFlow with config:`, {
      action: 'run_acquisition_flow',
      config: {
        sources: ['web'],
        criteria: {
          industry: ['dentist'],
          location: ['USA']
        },
        maxLeads: 3
      },
      userId
    });
    
    const result = await coreSystem.runAcquisitionFlow({
      action: 'run_acquisition_flow',
      config: {
        sources: ['web'],
        criteria: {
          industry: ['dentist'],
          location: ['USA']
        },
        maxLeads: 3
      },
      userId
    });
    
    console.log(`📋 Raw result from runAcquisitionFlow:`, result);

    console.log('✅ SUCCESS - Acquisition Flow Completed');
    console.log('📊 Results:');
    console.log(`   Leads Generated: ${result.leads?.length || 0}`);
    console.log(`   Personalized Leads: ${result.personalizedLeads?.length || 0}`);
    console.log(`   Outreach Messages: ${result.outreachMessages?.length || 0}`);
    console.log(`   Offers Created: ${result.offers?.length || 0}`);
    console.log(`   Pipeline Entries: ${result.pipelineEntries?.length || 0}`);
    console.log(`   Credits Used: ${result.creditsUsed || 0}`);
    
    if (result.leads?.length > 0) {
      console.log('\n📋 Sample Lead:');
      const sample = result.leads[0];
      console.log(`   Company: ${sample.company}`);
      console.log(`   Email: ${sample.email}`);
      console.log(`   Industry: ${sample.industry}`);
      console.log(`   Score: ${sample.score}`);
      console.log(`   Qualified: ${sample.qualified}`);
    }

  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

// Run the test
testAcquisitionFlow().catch(console.error);
