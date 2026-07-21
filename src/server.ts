import app from './app';
import { env } from './config/env';
import { connectWithRetry, pool } from './database/client';
import { logger } from './shared/logger/logger';

async function main() {
  await connectWithRetry();

  const server = app.listen(env.port, () => {
    logger.info(`Server running on port ${env.port}`);
  });

  async function shutdown(signal: string) {
    logger.info(`${signal} received, shutting down gracefully...`);

    server.close(async err => {
      if (err) {
        logger.error(`Error closing HTTP server: ${err}`);
        process.exit(1);
      }

      try {
        await pool.end();
        logger.info('PG pool closed');
        process.exit(0);
      } catch (poolErr) {
        logger.error({ poolErr }, 'Error closing PG pool');
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
