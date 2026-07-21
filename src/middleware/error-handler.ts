import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { env } from '../config/env.js';
import { HTTP_STATUS } from '../shared/constants/index';
import { AppError } from '../shared/errors/index';
import { logger } from '../shared/logger/index';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  // Business Error
  if (error instanceof AppError) {
    logger.warn(
      {
        error,
      },
      error.message
    );

    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });

    return;
  }

  // Validation Error
  if (error instanceof ZodError) {
    logger.warn(
      {
        issues: error.issues,
      },
      'Validation failed'
    );

    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: error.flatten().fieldErrors,
    });

    return;
  }

  // Unexpected Error
  logger.error(
    {
      err: error,
    },
    'Unhandled error'
  );

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message:
      env.nodeEnv === 'development'
        ? error instanceof Error
          ? error.message
          : 'Unknown error'
        : 'Internal server error',

    ...(env.nodeEnv === 'development' &&
      error instanceof Error && {
        stack: error.stack,
      }),
  });
};
