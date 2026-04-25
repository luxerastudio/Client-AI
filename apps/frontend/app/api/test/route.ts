/**
 * API Route - Proxy to Real Backend for Client Acquisition Flow
 * Forwards requests to the real backend API with real Groq integration
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log("FRONTEND API ROUTE: Proxying to real backend");
  
  try {
    // Get request body
    const body = await request.json();
    
    // Get user ID from headers
    const userId = request.headers.get('x-user-id') || 'frontend_user_' + Date.now();
    
    console.log("PROXY: Forwarding request to backend", {
      niche: body.niche,
      location: body.location,
      userId: userId
    });
    
    // Forward to real backend API
    const backendUrl = 'http://localhost:3002/api/v1/test';
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId,
        'X-Force-Real-AI': 'true',
        'X-Bypass-Cache': 'true'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("PROXY: Backend error", {
        status: response.status,
        error: errorText
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Backend error: ${response.status} ${response.statusText}`,
          errorCode: 'BACKEND_ERROR',
          details: errorText
        },
        { status: response.status }
      );
    }
    
    // Get backend response
    const backendData = await response.json();
    
    console.log("PROXY: Backend response received", {
      success: backendData.success,
      creditsUsed: backendData.output?.creditsUsed,
      executionTime: backendData.output?.executionTime
    });
    
    // Return backend response directly
    return NextResponse.json(backendData);
    
  } catch (error) {
    console.error("PROXY: Failed to connect to backend", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to connect to backend service',
        errorCode: 'BACKEND_CONNECTION_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
