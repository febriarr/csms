import type { ErrorRequestHandler } from 'express';
import z, { ZodError } from 'zod';

import { env } from '../config/env.js';
import { HTTP_STATUS } from '../shared/constants/index';
import { AppError } from '../shared/errors/index';
import { logger } from '../shared/logger/index';

function isApiRequest(req: { originalUrl: string }): boolean {
  return req.originalUrl.startsWith('/api');
}

/**
 * Renders one of the two existing error views for browser navigation.
 * There's no dedicated template per status code — 404.ejs is used for
 * "not found", everything else reuses 403.ejs's generic layout with the
 * real status/message swapped in, rather than inventing more templates.
 */
function renderWebError(res: Parameters<ErrorRequestHandler>[2], statusCode: number, message: string): void {
  const view = statusCode === HTTP_STATUS.NOT_FOUND ? 'errors/404' : 'errors/403';

  res.status(statusCode).render(view, {
    title: 'Error',
    layout: 'layouts/dashboard',
    pageTitle: `${statusCode} - Error`,
    pageDescription: message,
    currentPath: '/dashboard',
  });
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const wantsJson = isApiRequest(req);

  // Business Error
  if (error instanceof AppError) {
    logger.warn(
      {
        error,
      },
      error.message
    );

    if (wantsJson) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      renderWebError(res, error.statusCode, error.message);
    }

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

    if (wantsJson) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors: formatZodError(error),
      });
    } else {
      renderWebError(res, HTTP_STATUS.BAD_REQUEST, 'Validation failed. Please check your input.');
    }

    return;
  }

  // Unexpected Error
  logger.error(
    {
      err: error,
    },
    'Unhandled error'
  );

  const devMessage = env.nodeEnv === 'development' && error instanceof Error ? error.message : undefined;

  if (wantsJson) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: devMessage ?? 'Internal server error',
      ...(env.nodeEnv === 'development' && error instanceof Error && { stack: error.stack }),
    });
  } else {
    renderWebError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, devMessage ?? 'Something went wrong on our end.');
  }
};

function formatZodError(error: ZodError) {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
    if (!formatted[key]) formatted[key] = [];
    formatted[key].push(issue.message);
  }

  return formatted;
}
