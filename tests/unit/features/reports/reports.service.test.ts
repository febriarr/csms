import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ReportsService } from '../../../../src/features/reports/reports.service';
import type { ReportsRepository } from '../../../../src/features/reports/reports.repository';

function makeRepo(): ReportsRepository {
  return {
    findTemperatureHistory: vi.fn(),
    findTemperatureHistoryForExport: vi.fn(),
  } as unknown as ReportsRepository;
}

describe('ReportsService', () => {
  let repo: ReportsRepository;
  let service: ReportsService;

  beforeEach(() => {
    repo = makeRepo();
    service = new ReportsService(repo);
    vi.mocked(repo.findTemperatureHistory).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 50,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('should convert from/to date strings to WIB (+07:00) day-boundary Date objects', async () => {
    await service.getTemperatureHistory({ deviceId: 'd1', from: '2026-01-10', to: '2026-01-12', page: 1 });

    const arg = vi.mocked(repo.findTemperatureHistory).mock.calls[0][0];
    expect(arg.from.toISOString()).toBe('2026-01-09T17:00:00.000Z'); // 2026-01-10T00:00+07:00
    expect(arg.to.toISOString()).toBe('2026-01-12T16:59:59.999Z'); // 2026-01-12T23:59:59.999+07:00
  });

  it('should pass deviceId and page through unchanged', async () => {
    await service.getTemperatureHistory({ deviceId: 'device-xyz', from: '2026-01-01', to: '2026-01-01', page: 3 });

    const arg = vi.mocked(repo.findTemperatureHistory).mock.calls[0][0];
    expect(arg.deviceId).toBe('device-xyz');
    expect(arg.page).toBe(3);
  });

  it('should use the same WIB conversion for export queries', async () => {
    vi.mocked(repo.findTemperatureHistoryForExport).mockResolvedValue([]);

    await service.getTemperatureHistoryForExport({ deviceId: 'd1', from: '2026-06-01', to: '2026-06-01' });

    const arg = vi.mocked(repo.findTemperatureHistoryForExport).mock.calls[0][0];
    expect(arg.from.toISOString()).toBe('2026-05-31T17:00:00.000Z');
    expect(arg.to.toISOString()).toBe('2026-06-01T16:59:59.999Z');
  });
});
