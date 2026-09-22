import { describe, expect, it } from 'vitest';
import { getAlertReason } from '../../../src/shared/utils/getAlertReason';
import { buildAlertReason } from '../../../src/shared/utils/buildReason';
import type { SelectDevices } from '../../../src/database';

describe('getAlertReason', () => {
  it('should return DEVICE_OFFLINE when transitioning to OFFLINE from any state', () => {
    expect(getAlertReason('NORMAL', 'OFFLINE')).toBe('DEVICE_OFFLINE');
    expect(getAlertReason('CRITICAL', 'OFFLINE')).toBe('DEVICE_OFFLINE');
  });

  it('should return DEVICE_RECOVERED when transitioning away from OFFLINE (and not to itself)', () => {
    expect(getAlertReason('OFFLINE', 'NORMAL')).toBe('DEVICE_RECOVERED');
    expect(getAlertReason('OFFLINE', 'CRITICAL')).toBe('DEVICE_RECOVERED');
  });

  it('should prioritize DEVICE_OFFLINE over DEVICE_RECOVERED when both from and to are OFFLINE-related', () => {
    // toState === 'OFFLINE' is checked first, so OFFLINE -> OFFLINE is DEVICE_OFFLINE
    expect(getAlertReason('OFFLINE', 'OFFLINE')).toBe('DEVICE_OFFLINE');
  });

  it('should return TEMPERATURE_RECOVERED when transitioning to NORMAL', () => {
    expect(getAlertReason('WARNING', 'NORMAL')).toBe('TEMPERATURE_RECOVERED');
  });

  it('should return DEFROST_DETECTED when transitioning to DEFROST', () => {
    expect(getAlertReason('NORMAL', 'DEFROST')).toBe('DEFROST_DETECTED');
  });

  it('should return WARNING_TEMPERATURE when transitioning to WARNING', () => {
    expect(getAlertReason('DEFROST', 'WARNING')).toBe('WARNING_TEMPERATURE');
  });

  it('should return CRITICAL_TEMPERATURE when transitioning to CRITICAL', () => {
    expect(getAlertReason('WARNING', 'CRITICAL')).toBe('CRITICAL_TEMPERATURE');
  });
});

describe('buildAlertReason', () => {
  const baseDevice = {
    defrostThreshold: 0,
    warningThreshold: 5,
    criticalThreshold: 10,
    lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
  } as SelectDevices;

  it('should describe a defrost detection with the defrost-to-warning range', () => {
    const reason = buildAlertReason('DEFROST_DETECTED', { temperature: 2, device: baseDevice });
    expect(reason).toContain('2°C');
    expect(reason).toContain('defrost range');
    expect(reason).toContain('0°C to 5°C');
  });

  it('should describe a warning temperature with the warning-to-critical range', () => {
    const reason = buildAlertReason('WARNING_TEMPERATURE', { temperature: 6, device: baseDevice });
    expect(reason).toContain('warning threshold');
    expect(reason).toContain('5°C to 10°C');
  });

  it('should describe a critical temperature as exceeding the critical threshold', () => {
    const reason = buildAlertReason('CRITICAL_TEMPERATURE', { temperature: 12, device: baseDevice });
    expect(reason).toContain('critical threshold');
    expect(reason).toContain('above 10°C');
  });

  it('should describe temperature recovery as returning up to the defrost threshold', () => {
    const reason = buildAlertReason('TEMPERATURE_RECOVERED', { temperature: -1, device: baseDevice });
    expect(reason).toContain('returned to normal range');
    expect(reason).toContain('up to 0°C');
  });

  it('should describe device offline using the last-seen timestamp', () => {
    const reason = buildAlertReason('DEVICE_OFFLINE', { temperature: 0, device: baseDevice });
    expect(reason).toContain('stopped sending data');
  });

  it('should describe device recovery without referencing temperature', () => {
    const reason = buildAlertReason('DEVICE_RECOVERED', { temperature: 0, device: baseDevice });
    expect(reason).toBe('Device resumed sending data.');
  });
});
