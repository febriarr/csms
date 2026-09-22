import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { validateRequest } from '../../../src/middleware/validate-request';

describe('validateRequest middleware', () => {
  it('should call next() with no error and replace req.body with the parsed value', () => {
    const schema = z.object({ name: z.string() });
    const req = { body: { name: 'test' } } as Request;
    const next = vi.fn();

    validateRequest({ body: schema })(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'test' });
  });

  it('should call next(error) with a ZodError when body validation fails', () => {
    const schema = z.object({ name: z.string() });
    const req = { body: { name: 123 } } as unknown as Request;
    const next = vi.fn();

    validateRequest({ body: schema })(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorArg = next.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(z.ZodError);
  });

  it('should validate query and params independently of body', () => {
    const querySchema = z.object({ page: z.coerce.number() });
    const req = { query: { page: '2' } } as unknown as Request;
    const next = vi.fn();

    validateRequest({ query: querySchema })(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next(error) when params validation fails', () => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const req = { params: { id: 'not-a-uuid' } } as unknown as Request;
    const next = vi.fn();

    validateRequest({ params: paramsSchema })(req, {} as Response, next);

    const errorArg = next.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(z.ZodError);
  });

  it('should skip validation entirely for schemas not provided', () => {
    const req = { body: { anything: true } } as unknown as Request;
    const next = vi.fn();

    validateRequest({})(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ anything: true });
  });
});
