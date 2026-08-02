import { TypedRequest } from '../../types/typed-request';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { LoginPayload } from './auth.validator';
import { CookieHelper } from '../../shared/utils/cookie.helper';
import { successResponse } from '../../shared/reponse/success-response';
import { AUTH_CONSTANT } from '../../shared/constants';
import { AuthenticationError } from '../../shared/errors/authentication-error';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: TypedRequest<LoginPayload>, res: Response) => {
    const payload = req.body;
    const tokens = await this.authService.login(payload);

    CookieHelper.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return successResponse(res, {
      message: 'Login successful',
      data: 'ok',
    });
  };

  refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies[AUTH_CONSTANT.REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new AuthenticationError('Refresh token not found');
    }

    const tokens = await this.authService.refreshToken(refreshToken);

    CookieHelper.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return successResponse(res, {
      message: 'Token refreshed successfully',
      data: 'ok',
    });
  };

  logout = async (_req: Request, res: Response) => {
    CookieHelper.clearAuthCookies(res);

    return successResponse(res, {
      message: 'Logout successful',
      data: 'ok',
    });
  };

  me = async (req: Request, res: Response) => {
    const user = req.user;

    return successResponse(res, {
      message: 'User profile fetched successfully',
      data: user,
    });
  };
}
