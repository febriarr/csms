import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { Database, deviceDiagnosticsLogs, devices, DeviceTroubleReason } from '../../database';
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
  lastReason: DeviceTroubleReason | null;
  total: number;
};

export type DiagnosticsTrendRow = {
  day: string;
  sensorFailTotal: number;
  wifiFailTotal: number;
  httpFailTotal: number;
  avgRssi: number | null;
};

// Satu baris mentah di tabel device_diagnostics_logs — dipakai
// untuk halaman detail (bukan agregat, biar reason per kejadian
// tetap kelihatan satu-satu).
export type DiagnosticsLogItem = {
  id: string;
  sensorFailCount: number;
  wifiFailCount: number;
  httpFailCount: number;
  rssi: number | null;
  reason: DeviceTroubleReason | null;
  recordedAt: Date;
  receivedAt: Date;
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
        avgRssi: sql<number | null>`round(avg(${deviceDiagnosticsLogs.rssi})::numeric, 1)`.mapWith(v =>
          v === null ? null : Number(v)
        ),
        // Reason dari log dengan recordedAt terbaru YANG PUNYA reason
        // (bukan sekadar log terbaru apapun — kalau log terbaru nggak
        // ada reason-nya, mundur ke yang sebelumnya)
        lastReason: sql<DeviceTroubleReason | null>`
          (
            select "latest"."reason"
            from ${deviceDiagnosticsLogs} as latest
            where latest.device_id = ${deviceDiagnosticsLogs.deviceId}
              and latest.reason is not null
              and latest.recorded_at >= ${from}
              and latest.recorded_at < ${to}
            order by latest.recorded_at desc
            limit 1
          )
        `,
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

  /**
   * Paginated raw log entries for one device — dipakai halaman detail.
   * Beda dengan getDiagnosticsSummary/getDailyDiagnosticsTrend yang
   * agregat, ini satu baris = satu kejadian, lengkap dengan `reason`
   * mentahnya kalau kejadian itu memang dari crash.
   */
  async getDiagnosticsLogs(filter: TemperatureReportFilter): Promise<PaginatedResult<DiagnosticsLogItem>> {
    const { deviceId, from, to, page, pageSize } = filter;
    const offset = (page - 1) * pageSize;

    const whereClause = and(
      eq(deviceDiagnosticsLogs.deviceId, deviceId),
      gte(deviceDiagnosticsLogs.recordedAt, from),
      lt(deviceDiagnosticsLogs.recordedAt, to)
    );

    const [items, totalRows] = await Promise.all([
      this.db
        .select({
          id: deviceDiagnosticsLogs.id,
          sensorFailCount: deviceDiagnosticsLogs.sensorFailCount,
          wifiFailCount: deviceDiagnosticsLogs.wifiFailCount,
          httpFailCount: deviceDiagnosticsLogs.httpFailCount,
          rssi: deviceDiagnosticsLogs.rssi,
          reason: deviceDiagnosticsLogs.reason,
          recordedAt: deviceDiagnosticsLogs.recordedAt,
          receivedAt: deviceDiagnosticsLogs.receivedAt,
        })
        .from(deviceDiagnosticsLogs)
        .where(whereClause)
        .orderBy(desc(deviceDiagnosticsLogs.recordedAt))
        .limit(pageSize)
        .offset(offset),

      this.db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(deviceDiagnosticsLogs)
        .where(whereClause),
    ]);

    const totalItems = totalRows[0]?.count ?? 0;

    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    };
  }
}
