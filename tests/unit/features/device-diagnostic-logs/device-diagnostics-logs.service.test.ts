import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DeviceDiagnosticsLogsService } from '../../../../src/features/device-diagnostic-logs/device-diagnostics-logs.service';
import { NotFoundError } from '../../../../src/shared/errors';
import type { DeviceDiagnosticLogsRepository } from '../../../../src/features/device-diagnostic-logs/device-diagnostic-logs.repository';
import type { DevicesRepository } from '../../../../src/features/devices/devices.repository';

function makeDiagRepo(): DeviceDiagnosticLogsRepository {
  return {
    getDiagnosticsSummary: vi.fn(),
    getDailyDiagnosticsTrend: vi.fn(),
    getDiagnosticsLogs: vi.fn(),
  } as unknown as DeviceDiagnosticLogsRepository;
}

function makeDeviceRepo(): DevicesRepository {
  return {
    findById: vi.fn(),
  } as unknown as DevicesRepository;
}

const device = { id: 'device-1', name: 'Fridge A', code: 'DEV-001' };

describe('DeviceDiagnosticsLogsService', () => {
  let diagRepo: DeviceDiagnosticLogsRepository;
  let deviceRepo: DevicesRepository;
  let service: DeviceDiagnosticsLogsService;

  beforeEach(() => {
    diagRepo = makeDiagRepo();
    deviceRepo = makeDeviceRepo();
    service = new DeviceDiagnosticsLogsService(diagRepo, deviceRepo);
  });

  describe('getDiagnosticsDetail', () => {
    it('should throw NotFoundError when the device does not exist', async () => {
      vi.mocked(deviceRepo.findById).mockResolvedValue(null);

      await expect(
        service.getDiagnosticsDetail({ deviceId: 'missing', from: '2026-01-01', to: '2026-01-02', page: 1, pageSize: 20 })
      ).rejects.toThrow(NotFoundError);
    });

    it('should convert the WIB day range as [start of from, start of (to + 1 day)]', async () => {
      vi.mocked(deviceRepo.findById).mockResolvedValue(device as any);
      vi.mocked(diagRepo.getDiagnosticsLogs).mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
      } as any);

      await service.getDiagnosticsDetail({ deviceId: 'device-1', from: '2026-01-10', to: '2026-01-12', page: 1, pageSize: 20 });

      const arg = vi.mocked(diagRepo.getDiagnosticsLogs).mock.calls[0][0];
      expect(arg.from.toISOString()).toBe('2026-01-09T17:00:00.000Z'); // 2026-01-10T00:00+07:00
      expect(arg.to.toISOString()).toBe('2026-01-12T17:00:00.000Z'); // 2026-01-13T00:00+07:00 (to + 1 day)
    });

    it('should return the device summary alongside the paginated logs', async () => {
      vi.mocked(deviceRepo.findById).mockResolvedValue(device as any);
      const logs = { items: [{ id: 'log-1' }], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 };
      vi.mocked(diagRepo.getDiagnosticsLogs).mockResolvedValue(logs as any);

      const result = await service.getDiagnosticsDetail({
        deviceId: 'device-1',
        from: '2026-01-01',
        to: '2026-01-01',
        page: 1,
        pageSize: 20,
      });

      expect(result.device).toEqual({ id: 'device-1', name: 'Fridge A', code: 'DEV-001' });
      expect(result.logs).toEqual(logs);
    });
  });

  describe('getDiagnosticsSummaryToday', () => {
    it('should query using today\'s WIB date range', async () => {
      vi.mocked(diagRepo.getDiagnosticsSummary).mockResolvedValue([]);

      await service.getDiagnosticsSummaryToday();

      expect(diagRepo.getDiagnosticsSummary).toHaveBeenCalledWith(expect.any(Date), expect.any(Date));
      const [from, to] = vi.mocked(diagRepo.getDiagnosticsSummary).mock.calls[0];
      expect(to.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000);
    });
  });
});
