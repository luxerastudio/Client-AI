const http = require('http');

const PORT = 3002;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-ID');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'test',
      version: '1.0.0',
      uptime: process.uptime(),
      config: {
        apiUrl: 'https://reptilian-throng-daintily.ngrok-free.dev',
        appUrl: 'not_set'
      }
    }));
    return;
  }

  if (req.url === '/api/test' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      console.log('Received request:', body);
      const requestData = JSON.parse(body);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        input: requestData,
        output: {
          leadsGenerated: 3,
          personalizedLeads: 3,
          outreachMessages: 3,
          offersCreated: 2,
          pipelineEntries: 2,
          creditsUsed: 50,
          executionTime: 1500
        },
        details: {
          result: {
            leads: [
              { company: 'Test Company 1', email: 'test1@example.com', qualified: true, score: 85 },
              { company: 'Test Company 2', email: 'test2@example.com', qualified: true, score: 78 },
              { company: 'Test Company 3', email: 'test3@example.com', qualified: false, score: 65 }
            ],
            personalizedLeads: [
              { leadId: 'lead1', personalized: true },
              { leadId: 'lead2', personalized: true },
              { leadId: 'lead3', personalized: true }
            ],
            outreachMessages: [
              { leadId: 'lead1', status: 'sent' },
              { leadId: 'lead2', status: 'sent' },
              { leadId: 'lead3', status: 'sent' }
            ],
            offers: [
              { title: 'Basic Package', description: 'Starter offer', finalPrice: 999, status: 'pending' },
              { title: 'Premium Package', description: 'Advanced offer', finalPrice: 1999, status: 'pending' }
            ],
            pipelineEntries: [
              { leadId: 'lead1', currentStage: 'new', status: 'new', probability: 25 },
              { leadId: 'lead2', currentStage: 'new', status: 'new', probability: 30 }
            ]
          }
        }
      }));
    });
    return;
  }

  // Default response
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
  console.log('Ready to receive requests from frontend...');
});
