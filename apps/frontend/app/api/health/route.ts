import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Validate required environment variables
    const requiredEnvVars = ['NODE_ENV'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return NextResponse.json(
        { 
          status: 'error',
          message: `Missing environment variables: ${missingVars.join(', ')}`,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
    
    // Basic health check for Vercel
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      uptime: process.uptime ? process.uptime() : 0,
      memory: process.memoryUsage ? {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
      } : null,
      services: {
        database: process.env.DATABASE_URL ? 'configured' : 'missing_url',
        ai: process.env.OPENAI_API_KEY ? 'configured' : 'missing_key',
        auth: process.env.JWT_SECRET ? 'configured' : 'missing_secret'
      },
      config: {
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'not_set',
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not_set'
      }
    };

    return NextResponse.json(health, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
