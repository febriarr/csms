import { describe, expect, it } from 'vitest';
import { loginPayloadSchema } from '../../../../src/features/auth/auth.validator';

describe('loginPayloadSchema', () => {
  it('should accept a valid name/password payload', () => {
    expect(loginPayloadSchema.safeParse({ name: 'admin', password: 'secret' }).success).toBe(true);
  });

  it('should reject an empty name', () => {
    expect(loginPayloadSchema.safeParse({ name: '', password: 'secret' }).success).toBe(false);
  });

  it('should reject an empty password', () => {
    expect(loginPayloadSchema.safeParse({ name: 'admin', password: '' }).success).toBe(false);
  });

  it('should reject a missing password field', () => {
    expect(loginPayloadSchema.safeParse({ name: 'admin' }).success).toBe(false);
  });
});
