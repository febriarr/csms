import { describe, expect, it } from 'vitest';
import { buildTemperatureCsv } from '../../../../src/features/reports/report.export';
import type { SelectTemperature } from '../../../../src/database';

function makeLog(overrides: Partial<SelectTemperature> = {}): SelectTemperature {
  return {
    id: 'log-1',
    deviceId: 'device-1',
    temperature: 4.5,
    recordedAt: new Date('2026-01-15T10:30:00.000Z'),
    receivedAt: new Date('2026-01-15T10:30:05.000Z'),
    ...overrides,
  } as SelectTemperature;
}

describe('buildTemperatureCsv', () => {
  it('should produce a header row and no data rows for an empty log list', () => {
    const csv = buildTemperatureCsv([]);
    expect(csv).toBe('Date,Time,Temperature (°C)');
  });

  it('should produce one data row per log, with date/time/temperature columns', () => {
    const csv = buildTemperatureCsv([makeLog()]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Date,Time,Temperature (°C)');
    expect(lines[1]).toContain('4.5');
  });

  it('should join multiple rows with newlines, one row per log, in input order', () => {
    const csv = buildTemperatureCsv([makeLog({ temperature: 1 }), makeLog({ temperature: 2 })]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('1');
    expect(lines[2]).toContain('2');
  });

  it('should format date and time using the id-ID locale', () => {
    const csv = buildTemperatureCsv([makeLog({ recordedAt: new Date('2026-06-01T00:00:00.000Z') })]);
    const [, dataRow] = csv.split('\n');
    // id-ID date format is DD/MM/YYYY
    expect(dataRow).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4},/);
  });
});
