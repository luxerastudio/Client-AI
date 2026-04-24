const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'test',
    version: '1.0.0',
    uptime: process.uptime(),
    config: {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'not_set',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not_set'
    }
  });
});

// Test endpoint for frontend
app.post('/api/test', (req, res) => {
  console.log('Received request:', req.body);
  res.json({
    success: true,
    input: req.body,
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
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
});
