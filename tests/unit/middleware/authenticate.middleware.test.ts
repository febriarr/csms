import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { authenticate } from '../../../src/middleware/authenticate.middleware';
import { JwtHelper } from '../../../src/shared/utils/jwt.helper';
import { AUTH_CONSTANT } from '../../../src/shared/constants';

const payload = { sub: 'user-1', name: 'admin', role: 'admin' };

function makeRes() {
  const res: Partial<Response> = {
    cookie: vi.fn(),
    redirect: vi.fn(),
  };
  return res as Response;
}

describe('authenticate middleware', () => {
  it('should call next and attach req.user when the access token is valid', () => {
    const accessToken = JwtHelper.generateAccessToken(payload);
    const req = { cookies: { [AUTH_CONSTANT.ACCESS_TOKEN_COOKIE]: accessToken } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual(expect.objectContaining({ sub: payload.sub, name: payload.name, role: payload.role }));
  });

  it('should silently issue a new access token and continue when access token is missing but refresh token is valid', () => {
    const refreshToken = JwtHelper.generateRefreshToken(payload);
    const req = { cookies: { [AUTH_CONSTANT.REFRESH_TOKEN_COOKIE]: refreshToken } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.cookie).toHaveBeenCalledWith(
      AUTH_CONSTANT.ACCESS_TOKEN_COOKIE,
      expect.any(String),
      expect.any(Object)
    );
    expect(req.user).toEqual(expect.objectContaining({ sub: payload.sub }));
  });

  it('should clear cookies and redirect to login when both tokens are missing', () => {
    const req = { cookies: {} } as unknown as Request;
    const res = { ...makeRes(), clearCookie: vi.fn() } as unknown as Response;
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/pages/login'));
  });

  it('should clear cookies and redirect to login when both tokens are invalid/expired', () => {
    const req = {
      cookies: {
        [AUTH_CONSTANT.ACCESS_TOKEN_COOKIE]: 'garbage',
        [AUTH_CONSTANT.REFRESH_TOKEN_COOKIE]: 'also-garbage',
      },
    } as unknown as Request;
    const res = { ...makeRes(), clearCookie: vi.fn() } as unknown as Response;
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/pages/login'));
  });
});
