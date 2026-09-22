import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { isPublic } from '../../../src/middleware/is-public.middleware';
import { JwtHelper } from '../../../src/shared/utils/jwt.helper';
import { AUTH_CONSTANT } from '../../../src/shared/constants';

const payload = { sub: 'user-1', name: 'admin', role: 'admin' };

describe('isPublic middleware', () => {
  it('should call next without setting req.user when there is no access token', () => {
    const req = { cookies: {} } as unknown as Request;
    const next = vi.fn();

    isPublic(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
  });

  it('should attach req.user and call next when the access token is valid', () => {
    const token = JwtHelper.generateAccessToken(payload);
    const req = { cookies: { [AUTH_CONSTANT.ACCESS_TOKEN_COOKIE]: token } } as unknown as Request;
    const next = vi.fn();

    isPublic(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual(expect.objectContaining({ sub: payload.sub }));
  });

  it('should not block the request when the access token is invalid, just leave req.user unset', () => {
    const req = { cookies: { [AUTH_CONSTANT.ACCESS_TOKEN_COOKIE]: 'garbage' } } as unknown as Request;
    const next = vi.fn();

    isPublic(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
  });
});
