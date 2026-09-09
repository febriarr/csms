import { PAGE_SIZE, type TemperatureReportQuery } from './reports.validator';
import { ReportsRepository, type PaginatedResult } from './reports.repository';
import type { SelectTemperature } from '../../database';

export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  async getTemperatureHistory(
    query: Required<Pick<TemperatureReportQuery, 'deviceId' | 'from' | 'to'>> & { page: number }
  ): Promise<PaginatedResult<SelectTemperature>> {
    const from = new Date(`${query.from}T00:00:00.000+07:00`);
    const to = new Date(`${query.to}T23:59:59.999+07:00`);

    return this.repo.findTemperatureHistory({
      deviceId: query.deviceId,
      from,
      to,
      page: query.page,
      pageSize: PAGE_SIZE,
    });
  }

  async getTemperatureHistoryForExport(query: { deviceId: string; from: string; to: string }) {
    const from = new Date(`${query.from}T00:00:00.000+07:00`);
    const to = new Date(`${query.to}T23:59:59.999+07:00`);

    return this.repo.findTemperatureHistoryForExport({ deviceId: query.deviceId, from, to });
  }
}
