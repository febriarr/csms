import type { Request } from 'express';

export type TypedRequest<TBody = unknown, TQuery = unknown, TParams = unknown> = Omit<
  Request,
  'body' | 'query' | 'params'
> & {
  body: TBody;
  query: TQuery;
  params: TParams;
};
