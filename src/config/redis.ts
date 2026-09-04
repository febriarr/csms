import { logger } from '../shared/logger';
import { env } from './env';
import IORedis from 'ioredis';

export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: {},
});

redisConnection.on('error', err => {
  logger.error({ error: err.message }, '[Redis] Connection error:');
});
