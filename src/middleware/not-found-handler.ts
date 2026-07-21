import type { RequestHandler } from 'express';

import { NotFoundError } from '../shared/errors/index';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError('Route not found'));
};
