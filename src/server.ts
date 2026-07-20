import app from './app.js';
import { env } from './config/env.js';
import { connectWithRetry, pool } from './database/client.js';

async function main() {
  await connectWithRetry();

  const server = app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });

  async function shutdown(signal: string) {
    console.log(`${signal} received, shutting down gracefully...`);

    server.close(async err => {
      if (err) {
        console.error('Error closing HTTP server', err);
        process.exit(1);
      }

      try {
        await pool.end();
        console.log('PG pool closed');
        process.exit(0);
      } catch (poolErr) {
        console.error('Error closing PG pool', poolErr);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});
