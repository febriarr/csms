import type { Request, Response, NextFunction } from 'express';

import { AUTH_CONSTANT } from '../shared/constants';
import { JwtHelper } from '../shared/utils/jwt.helper';

export const isPublic = (req: Request, res: Response, next: NextFunction): void => {
  const accessToken = req.cookies[AUTH_CONSTANT.ACCESS_TOKEN_COOKIE];

  // Tidak login → tetap izinkan akses
  if (!accessToken) {
    next();
    return;
  }

  try {
    const payload = JwtHelper.verifyAccessToken(accessToken);

    req.user = {
      sub: payload.sub,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    // Token invalid/expired → jangan blokir public route
    // Hapus user saja, request tetap dilanjutkan.
    req.user = undefined;
  }

  next();
};
