/**
 * API Route for Client Acquisition Pipeline
 * Manages lead-to-client conversion pipeline stages and business process tracking
 */

import { NextRequest, NextResponse } from 'next/server';
// import { pipelineEngine } from '@repo/core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entryId, action, notes, userId } = body;

    if (!entryId || !action || !userId) {
      return NextResponse.json(
        { error: 'Entry ID, action, and userId are required' },
        { status: 400 }
      );
    }

    let result;
    
    switch (action) {
      case 'advance':
        result = await pipelineEngine.advanceStage(entryId, notes);
        break;
      case 'move_to_stage':
        if (!body.targetStageId) {
          return NextResponse.json(
            { error: 'Target stage ID is required for move_to_stage action' },
            { status: 400 }
          );
        }
        result = await pipelineEngine.moveToStage(entryId, body.targetStageId, notes);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use advance or move_to_stage' },
          { status: 400 }
        );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Pipeline entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      pipelineEntry: result
    });

  } catch (error) {
    console.error('Error in POST /api/pipeline/update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'metrics') {
      const pipelineId = searchParams.get('pipelineId') || 'default_pipeline';
      // Execute pipeline update through mock response (core system removed)
      const startTime = Date.now();
      const metrics = {
        success: true,
        pipeline: null,
        creditsUsed: 0,
        executionTime: Date.now() - startTime
      };
      
      return NextResponse.json(metrics);

    }

    if (action === 'stages') {
      const pipelineId = searchParams.get('pipelineId') || 'default_pipeline';
      const stages = await pipelineEngine.getStagesInPipeline(pipelineId);
      
      return NextResponse.json({
        success: true,
        stages
      });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in GET /api/pipeline/update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
