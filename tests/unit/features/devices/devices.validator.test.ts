import { describe, expect, it } from 'vitest';
import { createDeviceSchema, updateDeviceSchema, searchQuerySchema } from '../../../../src/features/devices/devices.validator';

const validPayload = {
  code: 'DEV-001',
  name: 'Cold Storage A',
  location: 'Warehouse 1',
  defrostThreshold: 0,
  warningThreshold: 5,
  criticalThreshold: 10,
};

describe('createDeviceSchema', () => {
  it('should accept a valid payload with correctly ordered thresholds', () => {
    const result = createDeviceSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should accept a payload without the optional location field', () => {
    const { location, ...rest } = validPayload;
    const result = createDeviceSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('should reject when warningThreshold is not greater than defrostThreshold', () => {
    const result = createDeviceSchema.safeParse({ ...validPayload, warningThreshold: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.join('.') === 'warningThreshold')).toBe(true);
    }
  });

  it('should reject when criticalThreshold is not greater than warningThreshold', () => {
    const result = createDeviceSchema.safeParse({ ...validPayload, criticalThreshold: 5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.join('.') === 'criticalThreshold')).toBe(true);
    }
  });

  it('should reject when both threshold orderings are violated at once', () => {
    const result = createDeviceSchema.safeParse({
      ...validPayload,
      defrostThreshold: 10,
      warningThreshold: 5,
      criticalThreshold: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'));
      expect(paths).toEqual(expect.arrayContaining(['warningThreshold', 'criticalThreshold']));
    }
  });

  it('should reject when code is empty', () => {
    const result = createDeviceSchema.safeParse({ ...validPayload, code: '' });
    expect(result.success).toBe(false);
  });

  it('should reject when a threshold is not a number', () => {
    const result = createDeviceSchema.safeParse({ ...validPayload, criticalThreshold: 'hot' });
    expect(result.success).toBe(false);
  });
});

describe('updateDeviceSchema', () => {
  it('should accept a partial payload with only one field', () => {
    const result = updateDeviceSchema.safeParse({ name: 'New name' });
    expect(result.success).toBe(true);
  });

  it('should accept an empty payload (no-op update)', () => {
    const result = updateDeviceSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate threshold ordering only when all three thresholds are present', () => {
    // only warningThreshold given -> ordering check is skipped (allPresent === false)
    const result = updateDeviceSchema.safeParse({ warningThreshold: -100 });
    expect(result.success).toBe(true);
  });

  it('should reject invalid threshold ordering when all three are present in an update', () => {
    const result = updateDeviceSchema.safeParse({
      defrostThreshold: 10,
      warningThreshold: 5,
      criticalThreshold: 20,
    });
    expect(result.success).toBe(false);
  });
});

describe('searchQuerySchema', () => {
  it('should accept an empty query', () => {
    expect(searchQuerySchema.safeParse({}).success).toBe(true);
  });

  it('should trim the search string', () => {
    const result = searchQuerySchema.safeParse({ search: '  fridge  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe('fridge');
    }
  });
});
