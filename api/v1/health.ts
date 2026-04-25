export async function GET() {
  try {
    return new Response(JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: "production"
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      error: "Health check failed",
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
