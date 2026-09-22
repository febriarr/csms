import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { errorHandler } from '../../../src/middleware/error-handler';
import { NotFoundError, BadRequestError } from '../../../src/shared/errors';

function makeRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    render: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

describe('errorHandler middleware', () => {
  it('should return a JSON error with the correct status code for an AppError on an /api route', () => {
    const req = { originalUrl: '/api/devices' } as Request;
    const res = makeRes();
    const error = new NotFoundError('Device not found');

    errorHandler(error, req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Device not found' });
  });

  it('should render an error view (not JSON) for an AppError on a non-/api route', () => {
    const req = { originalUrl: '/dashboard/devices' } as Request;
    const res = makeRes();
    const error = new BadRequestError('Bad input');

    errorHandler(error, req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith('errors/403', expect.any(Object));
    expect(res.json).not.toHaveBeenCalled();
  });

  it('should render the 404 view specifically for NotFoundError on a web route', () => {
    const req = { originalUrl: '/dashboard/devices/xyz' } as Request;
    const res = makeRes();
    const error = new NotFoundError('Device not found');

    errorHandler(error, req, res, vi.fn());

    expect(res.render).toHaveBeenCalledWith('errors/404', expect.any(Object));
  });

  it('should return formatted field errors with 400 for a ZodError on an /api route', () => {
    const req = { originalUrl: '/api/devices' } as Request;
    const res = makeRes();
    const schema = z.object({ name: z.string() });
    const parseResult = schema.safeParse({ name: 123 });
    const error = parseResult.success ? undefined : parseResult.error;

    errorHandler(error!, req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Validation failed',
        errors: expect.objectContaining({ name: expect.any(Array) }),
      })
    );
  });

  it('should return a generic 500 JSON error for an unexpected error on an /api route', () => {
    const req = { originalUrl: '/api/devices' } as Request;
    const res = makeRes();
    const error = new Error('Something exploded');

    errorHandler(error, req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    // NODE_ENV is 'test' (not 'development'), so the real error message must not leak.
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Internal server error' });
  });

  it('should render a generic error view for an unexpected error on a web route', () => {
    const req = { originalUrl: '/dashboard' } as Request;
    const res = makeRes();
    const error = new Error('Something exploded');

    errorHandler(error, req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith('errors/403', expect.any(Object));
  });
});
