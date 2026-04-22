/**
 * API Route for Lead Management
 * Handles lead generation, retrieval, and updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { coreSystem, leadEngine } from '@repo/core';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('id');

    if (leadId) {
      const lead = await leadEngine.getLeadById(leadId);
      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
      return NextResponse.json({ lead });
    } else {
      // Return all leads (in production, add pagination)
      const leads: any[] = []; // Would need to add getAllLeads method to lead engine
      return NextResponse.json({ leads });
    }
  } catch (error) {
    console.error('Error in GET /api/leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration is required' },
        { status: 400 }
      );
    }

    const leads = await leadEngine.generateLeads(config);
    return NextResponse.json({ leads, count: leads.length });
  } catch (error) {
    console.error('Error in POST /api/leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json(
        { error: 'Lead ID and updates are required' },
        { status: 400 }
      );
    }

    const lead = await leadEngine.updateLead(id, updates);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error in PUT /api/leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
