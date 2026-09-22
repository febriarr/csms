import { describe, expect, it } from 'vitest';
import { createUserSchema, updateUserSchema } from '../../../../src/features/users/users.validator';

const validUser = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secret1',
};

describe('createUserSchema', () => {
  it('should accept a valid payload and default role to admin', () => {
    const result = createUserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('admin');
    }
  });

  it('should reject a name shorter than 3 characters', () => {
    expect(createUserSchema.safeParse({ ...validUser, name: 'Jo' }).success).toBe(false);
  });

  it('should reject an invalid email', () => {
    expect(createUserSchema.safeParse({ ...validUser, email: 'not-an-email' }).success).toBe(false);
  });

  it('should reject a password shorter than 6 characters', () => {
    expect(createUserSchema.safeParse({ ...validUser, password: '12345' }).success).toBe(false);
  });

  it('should accept a valid phone number', () => {
    expect(createUserSchema.safeParse({ ...validUser, phone: '081234567890' }).success).toBe(true);
  });

  it('should reject a phone number with letters', () => {
    expect(createUserSchema.safeParse({ ...validUser, phone: '0812abc567' }).success).toBe(false);
  });

  it('should reject a phone number shorter than 8 digits', () => {
    expect(createUserSchema.safeParse({ ...validUser, phone: '1234567' }).success).toBe(false);
  });

  it('should accept an omitted phone number (optional)', () => {
    expect(createUserSchema.safeParse(validUser).success).toBe(true);
  });

  it('should reject an invalid role', () => {
    expect(createUserSchema.safeParse({ ...validUser, role: 'owner' }).success).toBe(false);
  });

  it('should accept an explicit super_admin role', () => {
    const result = createUserSchema.safeParse({ ...validUser, role: 'super_admin' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('super_admin');
    }
  });
});

describe('updateUserSchema', () => {
  it('should accept a partial payload with a single field', () => {
    expect(updateUserSchema.safeParse({ name: 'New Name' }).success).toBe(true);
  });

  it('should accept an empty payload', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true);
  });

  it('should still enforce field-level rules when a field is provided', () => {
    expect(updateUserSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});
