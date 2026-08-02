import { AuthenticationError } from '../../shared/errors/authentication-error';
import { JwtHelper } from '../../shared/utils/jwt.helper';
import { AuthTokens } from '../../types/auth.type';
import { UsersService } from '../users/users.service';
import { LoginPayload } from './auth.validator';

export class AuthService {
  constructor(private readonly userService: UsersService) {}

  async login(payload: LoginPayload): Promise<AuthTokens> {
    const { name, password } = payload;
    const user = await this.userService.validateUser(name, password);

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    const jwtPayload = { sub: user.id, name: user.name, role: user.role };

    return {
      accessToken: JwtHelper.generateAccessToken(jwtPayload),
      refreshToken: JwtHelper.generateRefreshToken(jwtPayload),
    };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    try {
      const decoded = JwtHelper.verifyRefreshToken(token);

      const jwtPayload = { sub: decoded.sub, name: decoded.name, role: decoded.role };

      return {
        accessToken: JwtHelper.generateAccessToken(jwtPayload),
        refreshToken: JwtHelper.generateRefreshToken(jwtPayload),
      };
    } catch (error) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }
}
