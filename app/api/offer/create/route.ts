/**
 * API Route for Client Acquisition Offers
 * Generates personalized business proposals to convert leads into paying clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { coreSystem } from '@/lib/core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, templateId, userId } = body;

    if (!leadId || !templateId || !userId) {
      return NextResponse.json(
        { error: 'Lead ID, template ID, and userId are required' },
        { status: 400 }
      );
    }

    // Generate offer through core system
    const offer = await coreSystem.generateOffer(leadId, templateId, userId);

    return NextResponse.json({
      success: true,
      offer
    });

  } catch (error) {
    console.error('Error in POST /api/offer/create:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Insufficient credits')) {
        return NextResponse.json(
          { error: 'Insufficient credits for offer creation' },
          { status: 402 }
        );
      }
      if (error.message.includes('Lead not found')) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
