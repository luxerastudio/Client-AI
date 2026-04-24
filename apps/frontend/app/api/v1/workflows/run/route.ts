import { NextRequest, NextResponse } from 'next/server';

// Mock workflow service for Vercel deployment
class MockWorkflowService {
  static async executeWorkflow(input: any, workflowType: string = 'marketing') {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock workflow steps
    const steps = [
      { id: 'step_1', name: 'Input Validation', status: 'completed', duration: 150 },
      { id: 'step_2', name: 'Content Analysis', status: 'completed', duration: 450 },
      { id: 'step_3', name: 'Strategy Generation', status: 'completed', duration: 680 },
      { id: 'step_4', name: 'Output Formatting', status: 'completed', duration: 220 }
    ];
    
    // Generate output based on input
    const output = this.generateOutput(input, workflowType);
    
    return {
      executionId: executionId,
      status: 'completed',
      workflowType: workflowType,
      steps: steps,
      input: input,
      output: output,
      metadata: {
        totalDuration: steps.reduce((sum, step) => sum + step.duration, 0),
        completedAt: new Date().toISOString(),
        success: true
      }
    };
  }
  
  static generateOutput(input: any, workflowType: string) {
    const inputText = typeof input === 'string' ? input : (input.message || input.content || JSON.stringify(input));
    
    if (workflowType === 'marketing') {
      return {
        title: 'Marketing Strategy Generated',
        summary: `Based on your input: "${inputText.substring(0, 100)}...", I've created a comprehensive marketing strategy with actionable steps and recommendations.`,
        sections: [
          {
            name: 'Target Audience Analysis',
            content: 'Analysis of your target market segments and customer personas.'
          },
          {
            name: 'Content Strategy',
            content: 'Recommended content types and distribution channels.'
          },
          {
            name: 'Implementation Timeline',
            content: 'Step-by-step timeline for strategy execution.'
          }
        ],
        recommendations: [
          'Focus on high-value customer segments',
          'Implement multi-channel content distribution',
          'Set up automated lead nurturing workflows'
        ],
        metrics: {
          expectedReach: '10,000-50,000',
          conversionRate: '2-5%',
          timeline: '3-6 months'
        }
      };
    }
    
    return {
      title: 'Workflow Completed',
      summary: `Processed your input: "${inputText.substring(0, 100)}..."`,
      result: 'Workflow execution successful',
      data: input
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, workflowType = 'marketing', userId, sessionId } = body;
    
    if (!input) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Input is required for workflow execution',
          code: 'MISSING_INPUT'
        },
        { status: 400 }
      );
    }
    
    // Execute workflow through mock response (core system removed)
    const startTime = Date.now();
    const result = await MockWorkflowService.executeWorkflow(input, workflowType);
    const response = {
      success: true,
      workflow: null,
      creditsUsed: 0,
      executionTime: Date.now() - startTime
        workflowType: result.workflowType,
        input: result.input,
        output: result.output,
        steps: result.steps,
        metadata: result.metadata
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
    console.error('Workflow execution failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Workflow execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'WORKFLOW_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
