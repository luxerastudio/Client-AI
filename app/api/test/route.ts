/**
 * API Route for Testing Client Acquisition Flow
 * Tests complete lead-to-client conversion pipeline with hard access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { coreSystem, accessControl } from '@/lib/core';
import { apiProtection } from '@/lib/core/api-protection';

export async function POST(request: NextRequest) {
  // HARD LOCK: Execute with API protection
  const result = await apiProtection.executeProtected(
    request,
    'test_execution',
    100, // Estimated credits for test execution
    async (userId, body) => {
      // Input validation - server side
      if (!body.niche || typeof body.niche !== 'string') {
        throw new Error('Niche is required and must be a string');
      }
      
      if (!body.location || typeof body.location !== 'string') {
        throw new Error('Location is required and must be a string');
      }

      const trimmedNiche = body.niche.trim();
      const trimmedLocation = body.location.trim();

      if (trimmedNiche.length < 2) {
        throw new Error('Niche must be at least 2 characters');
      }

      if (trimmedLocation.length < 2) {
        throw new Error('Location must be at least 2 characters');
      }

      // Map common niche variations to industries
      const nicheToIndustry: Record<string, string> = {
        'dentist': 'Healthcare',
        'dental': 'Healthcare',
        'doctor': 'Healthcare',
        'medical': 'Healthcare',
        'lawyer': 'Legal',
        'attorney': 'Legal',
        'legal': 'Legal',
        'plumber': 'Plumbing',
        'plumbing': 'Plumbing',
        'hvac': 'HVAC',
        'electrician': 'Electrical',
        'roofing': 'Roofing',
        'real estate': 'Real Estate',
        'realtor': 'Real Estate'
      };

      const normalizedNiche = trimmedNiche.toLowerCase();
      const industry = nicheToIndustry[normalizedNiche] || 
        normalizedNiche.charAt(0).toUpperCase() + normalizedNiche.slice(1);

      // Create user access if not exists (with FREE tier for testing)
      const userAccess = await accessControl.getUserAccess(userId);
      if (!userAccess) {
        await accessControl.createUserAccess(userId, 'free');
      }

      // Test input for the specified niche and location
      const testInput = {
        action: 'generate_leads',
        config: {
          sources: ['web', 'linkedin', 'directories'],
          criteria: {
            industry: [industry],
            location: [trimmedLocation],
            companySize: ['Small', 'Medium']
          },
          maxLeads: 3
        },
        userId
      };

      // Execute full acquisition flow
      return await coreSystem.runAcquisitionFlow(testInput);
    }
  );

  if (result.success) {
    const flowResult = result.result;
    return NextResponse.json({
      success: true,
      input: { niche: result.result?.config?.criteria?.industry, location: result.result?.config?.criteria?.location },
      output: {
        leadsGenerated: flowResult?.leads?.length || 0,
        personalizedLeads: flowResult?.personalizedLeads?.length || 0,
        outreachMessages: flowResult?.outreachMessages?.length || 0,
        offersCreated: flowResult?.offers?.length || 0,
        pipelineEntries: flowResult?.pipelineEntries?.length || 0,
        creditsUsed: result.creditsUsed,
        executionTime: result.executionTime
      },
      details: flowResult
    });
  } else {
    // Return appropriate HTTP status based on error
    let status = 500;
    switch (result.errorCode) {
      case 'UNAUTHORIZED':
        status = 401;
        break;
      case 'FORBIDDEN':
        status = 403;
        break;
      case 'RATE_LIMITED':
        status = 429;
        break;
      case 'INVALID_REQUEST':
        status = 400;
        break;
      case 'EXECUTION_FAILED':
        status = 402;
        break;
    }

    return NextResponse.json(
      { 
        success: false,
        error: result.error,
        errorCode: result.errorCode
      },
      { status }
    );
  }
}
