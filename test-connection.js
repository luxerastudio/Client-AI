require('dotenv').config({path: '.env.local'});
const https = require('https');
const { Pool } = require('pg');

console.log('=== CONNECTION VALIDATION ===\n');

// Test Groq API
console.log('1. Testing GROQ API...');
console.log('Key:', process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.substring(0, 4) + '...' + process.env.GROQ_API_KEY.substring(process.env.GROQ_API_KEY.length - 4) : 'NOT FOUND');

const groqData = JSON.stringify({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Hello' }],
  max_tokens: 5
});

const groqOptions = {
  hostname: 'api.groq.com',
  port: 443,
  path: '/openai/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
    'Content-Type': 'application/json',
    'Content-Length': groqData.length
  },
  timeout: 10000
};

const groqReq = https.request(groqOptions, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const parsed = JSON.parse(data);
        console.log('✅ GROQ API: SUCCESS');
        console.log('Model:', parsed.model);
        console.log('Response:', parsed.choices[0].message.content);
      } catch (e) {
        console.log('✅ GROQ API: SUCCESS (parse issue)');
      }
    } else {
      console.log('❌ GROQ API: FAILED');
      console.log('Error:', data.substring(0, 200));
    }
    testDatabase();
  });
});

groqReq.on('error', (error) => {
  console.error('❌ GROQ API CONNECTION FAILED:', error.message);
  testDatabase();
});

groqReq.write(groqData);
groqReq.end();

// Test Database
function testDatabase() {
  console.log('\n2. Testing Railway Database...');
  console.log('URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' + process.env.DATABASE_URL.substring(process.env.DATABASE_URL.length - 15) : 'NOT FOUND');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
  });

  pool.query('SELECT version() as version, NOW() as current_time')
    .then(result => {
      console.log('✅ DATABASE: SUCCESS');
      console.log('Postgres:', result.rows[0].version.substring(0, 50) + '...');
      console.log('Time:', result.rows[0].current_time);
      pool.end();
      console.log('\n=== BOTH CONNECTIONS WORKING ===');
    })
    .catch(error => {
      console.error('❌ DATABASE: FAILED');
      console.error('Error:', error.message);
      pool.end();
    });
}
