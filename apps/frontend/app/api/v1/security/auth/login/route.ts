import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Mock authentication service for Vercel deployment
class MockAuthService {
  static generateToken(payload: any) {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    
    const expiresIn = '1h';
    
    return jwt.sign(payload, secret, { expiresIn });
  }
  
  static validateCredentials(email: string, password: string) {
    // Mock validation - in production, this would check against a database
    if (email && password) {
      return {
        valid: true,
        user: {
          id: 'user_' + Math.random().toString(36).substr(2, 9),
          email: email,
          role: 'user',
          permissions: ['read', 'write', 'ai_generate', 'workflow_execute', 'scoring_calculate']
        }
      };
    }
    return { valid: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        },
        { status: 400 }
      );
    }
    
    // Validate credentials
    const validation = MockAuthService.validateCredentials(email, password);
    
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }
    
    // Generate JWT token
    const token = MockAuthService.generateToken({
      sub: validation.user.id,
      email: validation.user.email,
      role: validation.user.role,
      permissions: validation.user.permissions
    });
    
    const response = {
      success: true,
      data: {
        token: token,
        user: validation.user,
        expiresIn: '1h',
        tokenType: 'Bearer'
      },
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Login failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'AUTH_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
