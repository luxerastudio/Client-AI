import { Application } from './app';

async function startServer(): Promise<void> {
  const app = new Application();
  
  try {
    await app.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  const app = new Application();
  await app.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  const app = new Application();
  await app.stop();
  process.exit(0);
});

// Start the server
startServer();
