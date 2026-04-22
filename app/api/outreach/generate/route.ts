/**
 * API Route for Client Acquisition Outreach
 * Generates automated outreach campaigns for lead conversion and client acquisition
 */

import { NextRequest, NextResponse } from 'next/server';
import { coreSystem } from '@/lib/core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignData, userId } = body;

    if (!campaignData || !userId) {
      return NextResponse.json(
        { error: 'Campaign data and userId are required' },
        { status: 400 }
      );
    }

    // Validate campaign data
    if (!campaignData.name || !campaignData.leads || !campaignData.template) {
      return NextResponse.json(
        { error: 'Invalid campaign data: name, leads, and template are required' },
        { status: 400 }
      );
    }

    // Execute campaign through core system
    const result = await coreSystem.launchCampaign(campaignData, userId);

    return NextResponse.json({
      success: true,
      campaign: result.campaign,
      status: result.status
    });

  } catch (error) {
    console.error('Error in POST /api/outreach/generate:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Insufficient credits')) {
        return NextResponse.json(
          { error: 'Insufficient credits for campaign generation' },
          { status: 402 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
