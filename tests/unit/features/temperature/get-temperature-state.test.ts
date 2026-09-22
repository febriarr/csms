import { describe, expect, it } from 'vitest';
import { getTemperatureState } from '../../../../src/features/temperature/rules/get-temperature-state';
import { TemperatureState } from '../../../../src/features/temperature/rules/temperature-state';

const device = {
  defrostThreshold: 0,
  warningThreshold: 5,
  criticalThreshold: 10,
};

describe('getTemperatureState', () => {
  it('should return NORMAL when temperature is at or below the defrost threshold', () => {
    expect(getTemperatureState(device, -5)).toBe(TemperatureState.NORMAL);
    expect(getTemperatureState(device, 0)).toBe(TemperatureState.NORMAL);
  });

  it('should return DEFROST when temperature is strictly above defrost but at/below warning', () => {
    expect(getTemperatureState(device, 0.01)).toBe(TemperatureState.DEFROST);
    expect(getTemperatureState(device, 5)).toBe(TemperatureState.WARNING);
  });

  it('should return WARNING when temperature reaches the warning threshold exactly', () => {
    expect(getTemperatureState(device, 5)).toBe(TemperatureState.WARNING);
  });

  it('should return WARNING for values between warning (inclusive) and critical (exclusive)', () => {
    expect(getTemperatureState(device, 9.99)).toBe(TemperatureState.WARNING);
  });

  it('should return CRITICAL when temperature reaches the critical threshold exactly', () => {
    expect(getTemperatureState(device, 10)).toBe(TemperatureState.CRITICAL);
  });

  it('should return CRITICAL for values above the critical threshold', () => {
    expect(getTemperatureState(device, 100)).toBe(TemperatureState.CRITICAL);
  });

  it('should treat defrostThreshold as an exclusive lower bound for DEFROST', () => {
    // temperature === defrostThreshold -> NORMAL (rule uses `>`, not `>=`)
    expect(getTemperatureState(device, device.defrostThreshold)).toBe(TemperatureState.NORMAL);
  });

  it('should prioritize CRITICAL over WARNING/DEFROST when thresholds overlap in value', () => {
    const tightDevice = { defrostThreshold: 5, warningThreshold: 5, criticalThreshold: 5 };
    // at exactly 5: criticalThreshold check runs first
    expect(getTemperatureState(tightDevice, 5)).toBe(TemperatureState.CRITICAL);
  });

  it('should handle negative thresholds correctly', () => {
    const freezerDevice = { defrostThreshold: -20, warningThreshold: -15, criticalThreshold: -10 };
    expect(getTemperatureState(freezerDevice, -25)).toBe(TemperatureState.NORMAL);
    expect(getTemperatureState(freezerDevice, -18)).toBe(TemperatureState.DEFROST);
    expect(getTemperatureState(freezerDevice, -15)).toBe(TemperatureState.WARNING);
    expect(getTemperatureState(freezerDevice, -10)).toBe(TemperatureState.CRITICAL);
  });
});
