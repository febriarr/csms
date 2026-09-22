import { describe, expect, it } from 'vitest';
import { createTemperatureSchema } from '../../../../src/features/temperature/temperature.validator';

const basePayload = {
  deviceCode: 'DEV-001',
  timestamp: '2026-01-15T10:30:00.000Z',
  temperature: 4.5,
};

describe('createTemperatureSchema', () => {
  it('should accept a minimal valid payload and default the fail counts to 0', () => {
    const result = createTemperatureSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sensorFailCount).toBe(0);
      expect(result.data.wifiFailCount).toBe(0);
      expect(result.data.httpFailCount).toBe(0);
      expect(result.data.rssi).toBeNull();
    }
  });

  it('should reject a deviceCode shorter than 3 characters', () => {
    const result = createTemperatureSchema.safeParse({ ...basePayload, deviceCode: 'AB' });
    expect(result.success).toBe(false);
  });

  it('should reject a non ISO datetime timestamp', () => {
    const result = createTemperatureSchema.safeParse({ ...basePayload, timestamp: '15-01-2026' });
    expect(result.success).toBe(false);
  });

  it('should reject a temperature below -100', () => {
    const result = createTemperatureSchema.safeParse({ ...basePayload, temperature: -100.1 });
    expect(result.success).toBe(false);
  });

  it('should reject a temperature above 100', () => {
    const result = createTemperatureSchema.safeParse({ ...basePayload, temperature: 100.1 });
    expect(result.success).toBe(false);
  });

  it('should accept temperatures at the -100 and 100 boundaries', () => {
    expect(createTemperatureSchema.safeParse({ ...basePayload, temperature: -100 }).success).toBe(true);
    expect(createTemperatureSchema.safeParse({ ...basePayload, temperature: 100 }).success).toBe(true);
  });

  it('should reject a non-finite temperature (NaN/Infinity)', () => {
    expect(createTemperatureSchema.safeParse({ ...basePayload, temperature: Infinity }).success).toBe(false);
  });

  it('should reject negative fail counts', () => {
    const result = createTemperatureSchema.safeParse({ ...basePayload, sensorFailCount: -1 });
    expect(result.success).toBe(false);
  });

  it('should accept a valid nested reason payload', () => {
    const result = createTemperatureSchema.safeParse({
      ...basePayload,
      reason: {
        resetReason: 'BROWNOUT',
        resetReasonCode: 1,
        lastRssi: -70,
        lastSensorFailCount: 0,
        lastWifiFailCount: 0,
        lastHttpFailCount: 0,
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject an invalid resetReason enum value', () => {
    const result = createTemperatureSchema.safeParse({
      ...basePayload,
      reason: {
        resetReason: 'INVALID',
        resetReasonCode: 1,
        lastRssi: -70,
        lastSensorFailCount: 0,
        lastWifiFailCount: 0,
        lastHttpFailCount: 0,
      },
    });
    expect(result.success).toBe(false);
  });

  it('should accept a null reason', () => {
    const result = createTemperatureSchema.safeParse({ ...basePayload, reason: null });
    expect(result.success).toBe(true);
  });
});
