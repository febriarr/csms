import type { Request, Response, NextFunction } from 'express';
import { AUTH_CONSTANT } from '../shared/constants';
import { AuthenticationError } from '../shared/errors/authentication-error';
import { JwtHelper } from '../shared/utils/jwt.helper';
import { CookieHelper } from '../shared/utils/cookie.helper';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const accessToken = req.cookies[AUTH_CONSTANT.ACCESS_TOKEN_COOKIE];
    if (!accessToken) throw new AuthenticationError('No access token provided');

    const payload = JwtHelper.verifyAccessToken(accessToken);
    req.user = { sub: payload.sub, name: payload.name, role: payload.role };

    next();
  } catch {
    // Access token expired, coba refresh otomatis
    try {
      const refreshToken = req.cookies[AUTH_CONSTANT.REFRESH_TOKEN_COOKIE];
      if (!refreshToken) throw new AuthenticationError('No refresh token');

      const payload = JwtHelper.verifyRefreshToken(refreshToken);
      req.user = { sub: payload.sub, name: payload.name, role: payload.role };

      // Issue new access token otomatis
      const newAccessToken = JwtHelper.generateAccessToken({
        sub: payload.sub,
        name: payload.name,
        role: payload.role,
      });

      res.cookie(AUTH_CONSTANT.ACCESS_TOKEN_COOKIE, newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 15 * 60 * 1000,
      });

      next();
    } catch {
      CookieHelper.clearAuthCookies(res);
      return res.redirect(`/pages/login?error=${encodeURIComponent('Unauthenticated. Please log in.')}`);
    }
  }
};
