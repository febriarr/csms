import { env } from '../../config/env';
import { JwtPayload } from '../../types/auth.type';
import jwt, { JwtPayload as JwtPayloadBase } from 'jsonwebtoken';

export class JwtHelper {
  private static readonly accessTokenSecret = env.accessTokenSecret;
  private static readonly refreshTokenSecret = env.refreshTokenSecret;

  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, { expiresIn: '15m' });
  }
  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.refreshTokenSecret, { expiresIn: '7d' });
  }

  static verifyAccessToken(token: string): JwtPayload {
    const decoded = jwt.verify(token, this.accessTokenSecret) as JwtPayloadBase & JwtPayload;
    return decoded;
  }

  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, this.refreshTokenSecret) as JwtPayloadBase & JwtPayload;
  }
}
