import { APP_UTC_OFFSET, getTodayRangeInAppTimezone } from '../../shared/constants/timezone';
import { NotFoundError } from '../../shared/errors';
import { DevicesRepository } from '../devices/devices.repository';
import {
  DeviceDiagnosticLogsRepository,
  DiagnosticsLogItem,
  DiagnosticsSummaryRow,
  DiagnosticsTrendRow,
  PaginatedResult,
} from './device-diagnostic-logs.repository';

export type DiagnosticsDetailResult = {
  device: { id: string; name: string; code: string };
  logs: PaginatedResult<DiagnosticsLogItem>;
};

export class DeviceDiagnosticsLogsService {
  constructor(
    private readonly repo: DeviceDiagnosticLogsRepository,
    private readonly deviceRepository: DevicesRepository
  ) {}

  private toWibDayRange(from: string, to: string): { from: Date; to: Date } {
    const start = new Date(`${from}T00:00:00.000${APP_UTC_OFFSET}`);

    const end = new Date(`${to}T00:00:00.000${APP_UTC_OFFSET}`);
    end.setUTCDate(end.getUTCDate() + 1);

    return {
      from: start,
      to: end,
    };
  }

  async getDiagnosticsSummary(query: { from: string; to: string }): Promise<DiagnosticsSummaryRow[]> {
    const { from, to } = this.toWibDayRange(query.from, query.to);
    return this.repo.getDiagnosticsSummary(from, to);
  }

  async getDiagnosticsSummaryToday(): Promise<DiagnosticsSummaryRow[]> {
    const { from, to } = getTodayRangeInAppTimezone();
    return this.repo.getDiagnosticsSummary(from, to);
  }

  async getDiagnosticsTrend(query: { deviceId: string; from: string; to: string }): Promise<DiagnosticsTrendRow[]> {
    const { from, to } = this.toWibDayRange(query.from, query.to);
    return this.repo.getDailyDiagnosticsTrend(query.deviceId, from, to);
  }

  /**
   * Device info + paginated raw log entries for the detail page.
   *
   * NOTE: pakai `deviceRepository.findById` — sesuaikan nama method
   * ini kalau di DevicesRepository kamu namanya beda.
   */
  async getDiagnosticsDetail(query: {
    deviceId: string;
    from: string;
    to: string;
    page: number;
    pageSize: number;
  }): Promise<DiagnosticsDetailResult> {
    const device = await this.deviceRepository.findById(query.deviceId);

    if (!device) {
      throw new NotFoundError(`Device with id ${query.deviceId} not found.`);
    }

    const { from, to } = this.toWibDayRange(query.from, query.to);

    const logs = await this.repo.getDiagnosticsLogs({
      deviceId: query.deviceId,
      from,
      to,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      device: { id: device.id, name: device.name, code: device.code },
      logs,
    };
  }
}
