import { Response, NextFunction } from 'express';
import { ZodType, z } from 'zod';
import { TypedRequest } from '../types/typed-request.js';

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
  TBody extends ZodType = ZodType<unknown>,
  TQuery extends ZodType = ZodType<unknown>,
  TParams extends ZodType = ZodType<unknown>,
>(schemas: Schemas<TBody, TQuery, TParams>) {
  return (req: TypedRequest<z.infer<TBody>, z.infer<TQuery>, z.infer<TParams>>, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query) as any;
      if (schemas.params) req.params = schemas.params.parse(req.params) as any;
      next();
    } catch (err) {
      next(err);
    }
  };
}
