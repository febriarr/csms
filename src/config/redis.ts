import { logger } from '../shared/logger';
import { env } from './env';
import IORedis from 'ioredis';

// `rediss://` (TLS) is used by most managed Redis providers; plain `redis://`
// (no TLS) is what the docker-compose service below uses for local dev.
const isTls = env.redisUrl.startsWith('rediss://');

export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(isTls && { tls: {} }),
});

redisConnection.on('error', err => {
  logger.error({ error: err.message }, '[Redis] Connection error:');
});
