import { APP_UTC_OFFSET, getTodayRangeInAppTimezone } from '../../shared/constants/timezone';
import {
  DeviceDiagnosticLogsRepository,
  DiagnosticsSummaryRow,
  DiagnosticsTrendRow,
} from './device-diagnostic-logs.repository';

export class DeviceDiagnosticsLogsService {
  constructor(private readonly repo: DeviceDiagnosticLogsRepository) {}

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
}
