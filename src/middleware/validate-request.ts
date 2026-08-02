import type { NextFunction, RequestHandler } from 'express';
import type { ZodType } from 'zod';

interface Schemas<
  TBody extends ZodType = ZodType,
  TQuery extends ZodType = ZodType,
  TParams extends ZodType = ZodType,
> {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
}

export function validateRequest<
  TBody extends ZodType = ZodType,
  TQuery extends ZodType = ZodType,
  TParams extends ZodType = ZodType,
>(schemas: Schemas<TBody, TQuery, TParams>): RequestHandler {
  return (req, _res, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.query) {
        schemas.query.parse(req.query);
      }

      if (schemas.params) {
        schemas.params.parse(req.params);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
