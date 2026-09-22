import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../../src/features/auth/auth.service';
import { AuthenticationError } from '../../../../src/shared/errors/authentication-error';
import { NotFoundError } from '../../../../src/shared/errors';
import { JwtHelper } from '../../../../src/shared/utils/jwt.helper';
import type { UsersService } from '../../../../src/features/users/users.service';

function makeUsersService(): UsersService {
  return {
    validateUser: vi.fn(),
  } as unknown as UsersService;
}

describe('AuthService', () => {
  let usersService: UsersService;
  let service: AuthService;

  beforeEach(() => {
    usersService = makeUsersService();
    service = new AuthService(usersService);
  });

  describe('login', () => {
    it('should return an access/refresh token pair on valid credentials', async () => {
      vi.mocked(usersService.validateUser).mockResolvedValue({
        id: 'user-1',
        name: 'admin',
        email: 'a@a.com',
        phone: null,
        role: 'admin',
      } as any);

      const tokens = await service.login({ name: 'admin', password: 'secret' });

      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(tokens.refreshToken).toEqual(expect.any(String));

      const decoded = JwtHelper.verifyAccessToken(tokens.accessToken);
      expect(decoded.sub).toBe('user-1');
      expect(decoded.role).toBe('admin');
    });

    it('should propagate NotFoundError from UsersService when the user does not exist', async () => {
      // UsersService.validateUser throws NotFoundError itself for a missing user
      // (see users.service.ts) — AuthService does not translate this to AuthenticationError.
      vi.mocked(usersService.validateUser).mockRejectedValue(new NotFoundError('User Not found.'));

      await expect(service.login({ name: 'ghost', password: 'x' })).rejects.toThrow(NotFoundError);
    });

    it('should propagate AuthenticationError from UsersService on a wrong password', async () => {
      vi.mocked(usersService.validateUser).mockRejectedValue(new AuthenticationError('Credentials invalid'));

      await expect(service.login({ name: 'admin', password: 'wrong' })).rejects.toThrow(AuthenticationError);
    });
  });

  describe('refreshToken', () => {
    it('should issue a new token pair from a valid refresh token', async () => {
      const refreshToken = JwtHelper.generateRefreshToken({ sub: 'user-1', name: 'admin', role: 'admin' });

      const tokens = await service.refreshToken(refreshToken);

      expect(tokens.accessToken).toEqual(expect.any(String));
      const decoded = JwtHelper.verifyAccessToken(tokens.accessToken);
      expect(decoded.sub).toBe('user-1');
    });

    it('should throw AuthenticationError for an invalid/expired refresh token', async () => {
      await expect(service.refreshToken('not-a-real-token')).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError when given a valid access token instead of a refresh token', async () => {
      const accessToken = JwtHelper.generateAccessToken({ sub: 'user-1', name: 'admin', role: 'admin' });

      await expect(service.refreshToken(accessToken)).rejects.toThrow(AuthenticationError);
    });
  });
});
