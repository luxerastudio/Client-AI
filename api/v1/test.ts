export async function POST() {
  try {
    // Check if environment variables are available
    const groqApiKey = process.env.GROQ_API_KEY;
    
    if (!groqApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: "GROQ_API_KEY not configured",
        errorCode: "API_KEY_MISSING"
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: 'Generate 3 sample leads for a business in Dubai.'
        }],
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    
    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      return new Response(JSON.stringify({
        success: false,
        error: "Groq API call failed",
        errorCode: "GROQ_API_ERROR",
        details: errorData
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const groqData = await groqResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      details: {
        model: groqData.model,
        aiContent: groqData.choices[0].message.content,
        usage: groqData.usage,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error",
      errorCode: "INTERNAL_ERROR",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
