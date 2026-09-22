import { describe, expect, it } from 'vitest';
import {
  diagnosticsDetailQuerySchema,
  diagnosticsReportQuerySchema,
} from '../../../../src/features/device-diagnostic-logs/device-diagnostics-logs.validator';

const deviceId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('diagnosticsReportQuerySchema', () => {
  it('should accept an empty query (all fields optional)', () => {
    expect(diagnosticsReportQuerySchema.safeParse({}).success).toBe(true);
  });

  it('should reject when from is after to', () => {
    const result = diagnosticsReportQuerySchema.safeParse({ from: '2026-02-01', to: '2026-01-01' });
    expect(result.success).toBe(false);
  });
});

describe('diagnosticsDetailQuerySchema', () => {
  it('should require deviceId', () => {
    expect(diagnosticsDetailQuerySchema.safeParse({}).success).toBe(false);
  });

  it('should default page to 1 and pageSize to 20', () => {
    const result = diagnosticsDetailQuerySchema.safeParse({ deviceId });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('should reject a pageSize greater than 100', () => {
    const result = diagnosticsDetailQuerySchema.safeParse({ deviceId, pageSize: '101' });
    expect(result.success).toBe(false);
  });

  it('should accept a pageSize of exactly 100', () => {
    const result = diagnosticsDetailQuerySchema.safeParse({ deviceId, pageSize: '100' });
    expect(result.success).toBe(true);
  });
});
