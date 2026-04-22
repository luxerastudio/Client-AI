import { NextRequest, NextResponse } from 'next/server';

// Mock scoring service for Vercel deployment
class MockScoringService {
  static calculateScore(factors: any[], algorithm: string = 'weighted') {
    if (!factors || !Array.isArray(factors) || factors.length === 0) {
      return {
        score: 0.5,
        breakdown: [],
        algorithm: algorithm,
        totalWeight: 0
      };
    }
    
    let totalWeight = 0;
    let weightedSum = 0;
    const breakdown = [];
    
    for (const factor of factors) {
      const weight = factor.weight || 1.0;
      const value = factor.value || 0;
      const contribution = value * weight;
      
      totalWeight += weight;
      weightedSum += contribution;
      
      breakdown.push({
        name: factor.name || 'unknown',
        value: value,
        weight: weight,
        contribution: Math.round(contribution * 1000) / 1000
      });
    }
    
    const score = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
    
    return {
      score: Math.round(score * 1000) / 1000,
      breakdown: breakdown,
      algorithm: algorithm,
      totalWeight: Math.round(totalWeight * 1000) / 1000
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, factors, algorithm = 'weighted', entityType, entityId } = body;
    
    // Handle both content-based scoring and factor-based scoring
    let scoringFactors = factors;
    
    if (content && !factors) {
      // Generate factors from content (mock analysis)
      const contentLength = content.length;
      const hasKeywords = /\b(marketing|strategy|business|client|revenue)\b/i.test(content);
      const hasStructure = /\d\.|\n\n|bulleted/i.test(content);
      
      scoringFactors = [
        {
          name: 'length',
          value: Math.min(contentLength / 1000, 1.0),
          weight: 0.2,
          description: 'Content length appropriateness'
        },
        {
          name: 'keywords',
          value: hasKeywords ? 0.8 : 0.3,
          weight: 0.4,
          description: 'Relevant keywords presence'
        },
        {
          name: 'structure',
          value: hasStructure ? 0.7 : 0.4,
          weight: 0.3,
          description: 'Content structure quality'
        },
        {
          name: 'quality',
          value: Math.random() * 0.4 + 0.6, // Mock quality score
          weight: 0.1,
          description: 'Overall content quality'
        }
      ];
    }
    
    if (!scoringFactors || !Array.isArray(scoringFactors)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid scoring factors provided',
          code: 'INVALID_FACTORS'
        },
        { status: 400 }
      );
    }
    
    // Calculate score
    const result = MockScoringService.calculateScore(scoringFactors, algorithm);
    
    const response = {
      success: true,
      data: {
        score: result.score,
        breakdown: result.breakdown,
        algorithm: result.algorithm,
        metadata: {
          entityType: entityType || 'content',
          entityId: entityId || `score_${Date.now()}`,
          totalWeight: result.totalWeight,
          factorCount: scoringFactors.length,
          timestamp: new Date().toISOString()
        }
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
    console.error('Scoring failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Scoring calculation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'SCORING_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
