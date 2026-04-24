/**
 * API Route for Client Acquisition User Status
 * Manages user access tiers and business acquisition capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiProtection } from '@/lib/api-protection';

export async function GET(request: NextRequest) {
  try {
    // Get user status through mock response (access control removed)
    return NextResponse.json({
      success: true,
      status: 'active',
      credits: 100,
      lastActivity: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in GET /api/user/status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await apiProtection.manageUserTier(request);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        result: result.result
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/user/status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
