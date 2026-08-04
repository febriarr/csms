export const AUTH_CONSTANT = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  ACCESS_TOKEN_COOKIE: 'access_token',
  REFRESH_TOKEN_COOKIE: 'refresh_token',
} as const;

export const AUTHR = {
  SUPERADMIN: 'super_admin',
  ADMIN: 'admin',
} as const;
