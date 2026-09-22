import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { authorize } from '../../../src/middleware/authorize.middleware';

function makeRes() {
  const res: Partial<Response> = {
    redirect: vi.fn(),
    status: vi.fn().mockReturnThis(),
    render: vi.fn(),
  };
  return res as Response;
}

describe('authorize middleware', () => {
  it('should redirect to login when there is no authenticated user', () => {
    const req = {} as Request;
    const res = makeRes();
    const next = vi.fn();

    authorize('admin')(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/pages/login'));
    expect(next).not.toHaveBeenCalled();
  });

  it('should render 403 when the user role is not in the allowed list', () => {
    const req = { user: { sub: '1', name: 'x', role: 'admin' } } as Request;
    const res = makeRes();
    const next = vi.fn();

    authorize('super_admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith('errors/403', expect.any(Object));
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next when the user role is in the allowed list', () => {
    const req = { user: { sub: '1', name: 'x', role: 'super_admin' } } as Request;
    const res = makeRes();
    const next = vi.fn();

    authorize('admin', 'super_admin')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.render).not.toHaveBeenCalled();
  });
});
