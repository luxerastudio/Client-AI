/**
 * API Route for Client Lead Generation
 * Generates qualified business leads with hard access control and credit enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { coreSystem } from '@repo/core';
import { apiProtection } from '@/lib/api-protection';

export async function POST(request: NextRequest) {
  // HARD LOCK: Execute with API protection
  const result = await apiProtection.executeProtected(
    request,
    'generate_leads',
    50, // Estimated credits for lead generation
    async (userId, body) => {
      // Input validation
      if (!body.config || !body.config.criteria || !body.config.maxLeads) {
        throw new Error('Invalid configuration: criteria and maxLeads are required');
      }

      // Execute lead generation through core system
      return await coreSystem.runAcquisitionFlow({
        action: 'generate_leads',
        config: body.config,
        userId
      });
    }
  );

  if (result.success) {
    return NextResponse.json({
      success: true,
      leads: result.result?.leads,
      creditsUsed: result.creditsUsed,
      pipelineEntries: result.result?.pipelineEntries,
      executionTime: result.executionTime
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
        status = 402; // Payment required
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
