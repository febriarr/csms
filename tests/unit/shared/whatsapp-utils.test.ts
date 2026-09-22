import { describe, expect, it, vi } from 'vitest';
import { getDynamicDelay, toWhatsAppJid } from '../../../src/shared/whatsapp/whatsapp.utils';

describe('toWhatsAppJid', () => {
  it('should return the target unchanged if it already contains an @ (already a JID)', () => {
    expect(toWhatsAppJid('628123456789@s.whatsapp.net')).toBe('628123456789@s.whatsapp.net');
  });

  it('should convert a local 08xx number to international 628xx JID format', () => {
    expect(toWhatsAppJid('081234567890')).toBe('6281234567890@s.whatsapp.net');
  });

  it('should append the JID suffix to a number already in 62 format', () => {
    expect(toWhatsAppJid('6281234567890')).toBe('6281234567890@s.whatsapp.net');
  });

  it('should strip non-digit characters before normalizing', () => {
    expect(toWhatsAppJid('0812-3456-7890')).toBe('6281234567890@s.whatsapp.net');
  });

  it('should strip a leading + sign as a non-digit character', () => {
    expect(toWhatsAppJid('+6281234567890')).toBe('6281234567890@s.whatsapp.net');
  });
});

describe('getDynamicDelay', () => {
  it('should return a value within the CRITICAL range [1500, 3500]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(getDynamicDelay('CRITICAL')).toBe(1500);
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    expect(getDynamicDelay('CRITICAL')).toBe(3500);
    vi.restoreAllMocks();
  });

  it('should return a value within the OFFLINE range [2000, 4500]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(getDynamicDelay('OFFLINE')).toBe(2000);
    vi.restoreAllMocks();
  });

  it('should return a value within the WARNING range [3000, 6000]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(getDynamicDelay('WARNING')).toBe(3000);
    vi.restoreAllMocks();
  });
});
