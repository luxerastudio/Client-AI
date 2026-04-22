/**
 * API Route for Client Acquisition User Status
 * Manages user access tiers and business acquisition capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiProtection } from '@/lib/api-protection';
import { accessControl } from '@repo/core';

export async function GET(request: NextRequest) {
  try {
    const result = await apiProtection.getUserStatus(request);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        status: result.status
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }
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
