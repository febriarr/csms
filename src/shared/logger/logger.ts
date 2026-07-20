import pino from 'pino';

import { env } from '../../config/env.js';

export const logger = pino({
  base: {
    app: env.appName,
  },
  level: env.nodeEnv === 'development' ? 'debug' : 'info',

  transport:
    env.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,

  timestamp: pino.stdTimeFunctions.isoTime,
});
