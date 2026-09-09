import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { Database, deviceDiagnosticsLogs, devices } from '../../database';
import { BaseRepository } from '../../shared/abstract/base-repository';

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

export type DiagnosticsSummaryRow = {
  deviceId: string;
  deviceName: string;
  deviceCode: string;
  sensorFailTotal: number;
  wifiFailTotal: number;
  httpFailTotal: number;
  avgRssi: number | null;
  total: number;
};

export type DiagnosticsTrendRow = {
  day: string;
  sensorFailTotal: number;
  wifiFailTotal: number;
  httpFailTotal: number;
  avgRssi: number | null;
};

export class DeviceDiagnosticLogsRepository extends BaseRepository<typeof deviceDiagnosticsLogs> {
  constructor(db: Database) {
    super(db, deviceDiagnosticsLogs);
  }

  /**
   * Cross-device ranking for a date range — one row per device that has at
   * least one diagnostics log in range, sorted by total issues descending.
   * Used by both the "today" home-page widget and the full diagnostics page.
   */
  async getDiagnosticsSummary(from: Date, to: Date): Promise<DiagnosticsSummaryRow[]> {
    const rows = await this.db
      .select({
        deviceId: deviceDiagnosticsLogs.deviceId,
        deviceName: devices.name,
        deviceCode: devices.code,
        sensorFailTotal: sql<number>`sum(${deviceDiagnosticsLogs.sensorFailCount})`.mapWith(Number),
        wifiFailTotal: sql<number>`sum(${deviceDiagnosticsLogs.wifiFailCount})`.mapWith(Number),
        httpFailTotal: sql<number>`sum(${deviceDiagnosticsLogs.httpFailCount})`.mapWith(Number),
        // avg() otomatis skip baris dengan rssi null (device
        // disconnected saat payload dibuat). Dibulatkan 1 desimal.
        avgRssi: sql<number | null>`round(avg(${deviceDiagnosticsLogs.rssi})::numeric, 1)`.mapWith(v =>
          v === null ? null : Number(v)
        ),
      })
      .from(deviceDiagnosticsLogs)
      .innerJoin(devices, eq(deviceDiagnosticsLogs.deviceId, devices.id))
      .where(and(gte(deviceDiagnosticsLogs.recordedAt, from), lt(deviceDiagnosticsLogs.recordedAt, to)))
      .groupBy(deviceDiagnosticsLogs.deviceId, devices.name, devices.code)
      .orderBy(
        desc(
          sql`sum(${deviceDiagnosticsLogs.sensorFailCount}) + sum(${deviceDiagnosticsLogs.wifiFailCount}) + sum(${deviceDiagnosticsLogs.httpFailCount})`
        )
      );

    return rows.map(r => ({ ...r, total: r.sensorFailTotal + r.wifiFailTotal + r.httpFailTotal }));
  }

  async getDailyDiagnosticsTrend(deviceId: string, from: Date, to: Date): Promise<DiagnosticsTrendRow[]> {
    const dayExpr = sql<string>`
    to_char(
      ${deviceDiagnosticsLogs.recordedAt} AT TIME ZONE 'Asia/Jakarta',
      'YYYY-MM-DD'
    )
  `;

    return this.db
      .select({
        day: dayExpr,
        sensorFailTotal: sql<number>`
        sum(${deviceDiagnosticsLogs.sensorFailCount})
      `.mapWith(Number),
        wifiFailTotal: sql<number>`
        sum(${deviceDiagnosticsLogs.wifiFailCount})
      `.mapWith(Number),
        httpFailTotal: sql<number>`
        sum(${deviceDiagnosticsLogs.httpFailCount})
      `.mapWith(Number),
        avgRssi: sql<number | null>`
        round(avg(${deviceDiagnosticsLogs.rssi})::numeric, 1)
      `.mapWith(v => (v === null ? null : Number(v))),
      })
      .from(deviceDiagnosticsLogs)
      .where(
        and(
          eq(deviceDiagnosticsLogs.deviceId, deviceId),
          gte(deviceDiagnosticsLogs.recordedAt, from),
          lt(deviceDiagnosticsLogs.recordedAt, to)
        )
      )
      .groupBy(dayExpr)
      .orderBy(dayExpr);
  }
}
