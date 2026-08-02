import type { Request } from 'express';

export type TypedRequest<TBody = unknown, TQuery = Record<string, unknown>, TParams = Record<string, string>> = Request<
  TParams,
  any,
  TBody,
  TQuery
>;
