import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { Database, temperatureLogs, type SelectTemperature } from '../../database';

export type TemperatureReportFilter = {
  deviceId: string;
  from: Date;
  to: Date;
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export class ReportsRepository {
  constructor(private readonly db: Database) {}

  async findTemperatureHistory(filter: TemperatureReportFilter): Promise<PaginatedResult<SelectTemperature>> {
    const where = and(
      eq(temperatureLogs.deviceId, filter.deviceId),
      gte(temperatureLogs.recordedAt, filter.from),
      lte(temperatureLogs.recordedAt, filter.to)
    );

    const [items, [{ totalItems }]] = await Promise.all([
      this.db.query.temperatureLogs.findMany({
        where,
        orderBy: desc(temperatureLogs.recordedAt),
        limit: filter.pageSize,
        offset: (filter.page - 1) * filter.pageSize,
      }),
      this.db.select({ totalItems: count() }).from(temperatureLogs).where(where),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / filter.pageSize));

    return { items, page: filter.page, pageSize: filter.pageSize, totalItems, totalPages };
  }
}
