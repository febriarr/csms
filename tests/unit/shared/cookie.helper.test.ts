import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import { CookieHelper } from '../../../src/shared/utils/cookie.helper';
import { AUTH_CONSTANT } from '../../../src/shared/constants';

function makeMockRes() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response;
}

describe('CookieHelper', () => {
  it('should set both access and refresh cookies with httpOnly on login', () => {
    const res = makeMockRes();
    CookieHelper.setAuthCookies(res, 'access-token', 'refresh-token');

    expect(res.cookie).toHaveBeenCalledWith(
      AUTH_CONSTANT.ACCESS_TOKEN_COOKIE,
      'access-token',
      expect.objectContaining({ httpOnly: true, maxAge: 15 * 60 * 1000 })
    );
    expect(res.cookie).toHaveBeenCalledWith(
      AUTH_CONSTANT.REFRESH_TOKEN_COOKIE,
      'refresh-token',
      expect.objectContaining({ httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
    );
  });

  it('should clear both cookies on logout', () => {
    const res = makeMockRes();
    CookieHelper.clearAuthCookies(res);

    expect(res.clearCookie).toHaveBeenCalledWith(AUTH_CONSTANT.ACCESS_TOKEN_COOKIE, expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith(AUTH_CONSTANT.REFRESH_TOKEN_COOKIE, expect.any(Object));
  });

  it('should use lax sameSite outside production (test env)', () => {
    const res = makeMockRes();
    CookieHelper.setAuthCookies(res, 'a', 'b');
    expect(res.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({ sameSite: 'lax', secure: false }));
  });
});
