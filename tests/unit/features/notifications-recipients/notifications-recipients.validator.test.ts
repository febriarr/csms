import { describe, expect, it } from 'vitest';
import {
  notificationRecipientsSchema,
  notificationRecipientsUpdateSchema,
} from '../../../../src/features/notifications-recipients/notifications-recipients.validator';

describe('notificationRecipientsSchema', () => {
  it('should accept a valid email recipient', () => {
    const result = notificationRecipientsSchema.safeParse({
      name: 'Ops Team',
      channel: 'email',
      target: 'ops@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should reject an email channel with a non-email target', () => {
    const result = notificationRecipientsSchema.safeParse({
      name: 'Ops Team',
      channel: 'email',
      target: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.join('.') === 'target')).toBe(true);
    }
  });

  it('should accept a valid whatsapp recipient in 62xxxx format', () => {
    const result = notificationRecipientsSchema.safeParse({
      name: 'Ops Team',
      channel: 'whatsapp',
      target: '628123456789',
    });
    expect(result.success).toBe(true);
  });

  it('should reject a whatsapp target that does not start with 62', () => {
    const result = notificationRecipientsSchema.safeParse({
      name: 'Ops Team',
      channel: 'whatsapp',
      target: '08123456789',
    });
    expect(result.success).toBe(false);
  });

  it('should accept a whatsapp number with exactly 8 digits after the 62 prefix (lower boundary)', () => {
    const result = notificationRecipientsSchema.safeParse({
      name: 'X',
      channel: 'whatsapp',
      target: '6212345678', // 62 + 8 digits
    });
    expect(result.success).toBe(true);
  });

  it('should reject a whatsapp number with fewer than 8 digits after the 62 prefix', () => {
    const result = notificationRecipientsSchema.safeParse({
      name: 'X',
      channel: 'whatsapp',
      target: '621234567', // 62 + 7 digits
    });
    expect(result.success).toBe(false);
  });

  it('should reject an invalid channel value', () => {
    const result = notificationRecipientsSchema.safeParse({
      name: 'Ops Team',
      channel: 'sms',
      target: '628123456789',
    });
    expect(result.success).toBe(false);
  });

  it('should reject a name longer than 100 characters', () => {
    const result = notificationRecipientsSchema.safeParse({
      name: 'a'.repeat(101),
      channel: 'email',
      target: 'ops@example.com',
    });
    expect(result.success).toBe(false);
  });
});

describe('notificationRecipientsUpdateSchema', () => {
  it('should accept a partial update with only the name changed', () => {
    const result = notificationRecipientsUpdateSchema.safeParse({ name: 'New name' });
    expect(result.success).toBe(true);
  });

  it('should skip channel/target cross-validation when either is missing', () => {
    const result = notificationRecipientsUpdateSchema.safeParse({ channel: 'email' });
    expect(result.success).toBe(true);
  });

  it('should still validate target format when both channel and target are provided', () => {
    const result = notificationRecipientsUpdateSchema.safeParse({ channel: 'email', target: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});
