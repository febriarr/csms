import { env } from '../../config/env';
import type { Response } from 'express';
import { AUTH_CONSTANT } from '../constants';

const isProduction = env.nodeEnv === 'production';

export class CookieHelper {
  static setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie(AUTH_CONSTANT.ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie(AUTH_CONSTANT.REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  static clearAuthCookies(res: Response): void {
    const options = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('strict' as const) : ('lax' as const),
    };
    res.clearCookie(AUTH_CONSTANT.ACCESS_TOKEN_COOKIE, options);
    res.clearCookie(AUTH_CONSTANT.REFRESH_TOKEN_COOKIE, options);
  }
}
