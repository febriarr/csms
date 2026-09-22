import { describe, expect, it } from 'vitest';
import {
  temperatureReportQuerySchema,
  temperatureExportQuerySchema,
} from '../../../../src/features/reports/reports.validator';

const deviceId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('temperatureReportQuerySchema', () => {
  it('should default page to 1 when omitted', () => {
    const result = temperatureReportQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it('should reject a non-uuid deviceId', () => {
    const result = temperatureReportQuerySchema.safeParse({ deviceId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('should reject when from is after to', () => {
    const result = temperatureReportQuerySchema.safeParse({ from: '2026-02-01', to: '2026-01-01' });
    expect(result.success).toBe(false);
  });

  it('should accept when from equals to', () => {
    const result = temperatureReportQuerySchema.safeParse({ from: '2026-01-01', to: '2026-01-01' });
    expect(result.success).toBe(true);
  });

  it('should coerce a string page number to an integer', () => {
    const result = temperatureReportQuerySchema.safeParse({ page: '3' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it('should reject a zero or negative page', () => {
    expect(temperatureReportQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(temperatureReportQuerySchema.safeParse({ page: '-1' }).success).toBe(false);
  });
});

describe('temperatureExportQuerySchema', () => {
  const validExport = { deviceId, from: '2026-01-01', to: '2026-01-15', format: 'xlsx' as const };

  it('should accept a valid export request within a month', () => {
    expect(temperatureExportQuerySchema.safeParse(validExport).success).toBe(true);
  });

  it('should require deviceId, unlike the report query schema', () => {
    const { deviceId: _omit, ...rest } = validExport;
    expect(temperatureExportQuerySchema.safeParse(rest).success).toBe(false);
  });

  it('should reject an invalid format value', () => {
    expect(temperatureExportQuerySchema.safeParse({ ...validExport, format: 'pdf' }).success).toBe(false);
  });

  it('should reject a range spanning more than one month', () => {
    const result = temperatureExportQuerySchema.safeParse({
      ...validExport,
      from: '2026-01-01',
      to: '2026-03-01',
    });
    expect(result.success).toBe(false);
  });

  it('should accept a range of exactly one month', () => {
    const result = temperatureExportQuerySchema.safeParse({
      ...validExport,
      from: '2026-01-01',
      to: '2026-02-01',
    });
    expect(result.success).toBe(true);
  });

  it('should reject when from is after to', () => {
    const result = temperatureExportQuerySchema.safeParse({ ...validExport, from: '2026-01-15', to: '2026-01-01' });
    expect(result.success).toBe(false);
  });
});
