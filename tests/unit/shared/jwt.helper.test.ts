import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { JwtHelper } from '../../../src/shared/utils/jwt.helper';

const payload = { sub: 'user-1', name: 'admin', role: 'admin' };

describe('JwtHelper', () => {
  it('should generate an access token that verifies back to the same payload', () => {
    const token = JwtHelper.generateAccessToken(payload);
    const decoded = JwtHelper.verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.name).toBe(payload.name);
    expect(decoded.role).toBe(payload.role);
  });

  it('should generate a refresh token that verifies back to the same payload', () => {
    const token = JwtHelper.generateRefreshToken(payload);
    const decoded = JwtHelper.verifyRefreshToken(token);
    expect(decoded.sub).toBe(payload.sub);
  });

  it('should throw when verifying an access token with the refresh token verifier', () => {
    const token = JwtHelper.generateAccessToken(payload);
    expect(() => JwtHelper.verifyRefreshToken(token)).toThrow();
  });

  it('should throw when verifying a refresh token with the access token verifier', () => {
    const token = JwtHelper.generateRefreshToken(payload);
    expect(() => JwtHelper.verifyAccessToken(token)).toThrow();
  });

  it('should throw when verifying a malformed token', () => {
    expect(() => JwtHelper.verifyAccessToken('not-a-real-token')).toThrow();
  });

  it('should throw when verifying a token signed with a different secret', () => {
    const foreignToken = jwt.sign(payload, 'some-other-secret', { expiresIn: '15m' });
    expect(() => JwtHelper.verifyAccessToken(foreignToken)).toThrow();
  });
});
