import { EntityNotFoundException, ValidationException } from '@/common/exception/app.exception';
import { addDaysToDate, dayRangeInAppTimezone, todayInAppTimezone } from '@/common/utils/app_timezone';
import { DatabaseTransaction } from '@/database/database.type';
import { DeviceRepository } from '@/device/device.repository';
import { Injectable } from '@nestjs/common';
import type { DiagnosticsDetailQuery, DiagnosticsReportQuery } from '@workspace/validator';
import { DiagnosticRepository } from './diagnostic.repository';
import {
    WithMetadata,
    type DiagnosticLogItem,
    type DiagnosticRange,
    type DiagnosticSummaryReport,
    type DiagnosticTrendReport,
} from '@workspace/shared';
import { DEFAULT_REPORT_DAYS, DiagnosticPayload } from './diagnostic.type';

@Injectable()
export class DiagnosticService {
    constructor(
        private readonly repo: DiagnosticRepository,
        private readonly devices: DeviceRepository,
    ) {}

    /**
     * Keeps what a device reported with a reading, but only when there is something to keep: a failure counter above
     * zero or an abnormal-reset report. A healthy device therefore adds no rows, which is what keeps this table small.
     * Returns whether a row was stored (false for a healthy reading and for a retry of the same moment).
     */
    async record(
        deviceId: string,
        recordedAt: Date,
        payload: DiagnosticPayload,
        tx: DatabaseTransaction,
    ): Promise<boolean> {
        const hasIssue =
            payload.sensorFailCount > 0 ||
            payload.wifiFailCount > 0 ||
            payload.httpFailCount > 0 ||
            (payload.reason !== undefined && payload.reason !== null);

        if (!hasIssue) return false;

        return this.repo.insertIgnoreDuplicate(
            {
                deviceId,
                recordedAt,
                sensorFailCount: payload.sensorFailCount,
                wifiFailCount: payload.wifiFailCount,
                httpFailCount: payload.httpFailCount,
                rssi: payload.rssi,
                resetReason: payload.reason?.resetReason ?? null,
                resetReasonCode: payload.reason?.resetReasonCode ?? null,
                lastRssi: payload.reason?.lastRssi ?? null,
                lastSensorFailCount: payload.reason?.lastSensorFailCount ?? null,
                lastWifiFailCount: payload.reason?.lastWifiFailCount ?? null,
                lastHttpFailCount: payload.reason?.lastHttpFailCount ?? null,
            },
            tx,
        );
    }

    /** Devices with failures in the range, worst first. Without dates: the last DEFAULT_REPORT_DAYS days. */
    async summary(query: Pick<DiagnosticsReportQuery, 'from' | 'to'>): Promise<DiagnosticSummaryReport> {
        const range = this.resolveRange(query.from, query.to);
        const items = await this.repo.summary(dayRangeInAppTimezone(range.from, range.to));

        return { ...range, items };
    }

    /** The same summary for today only: what the dashboard overview shows. */
    today(): Promise<DiagnosticSummaryReport> {
        const today = todayInAppTimezone();

        return this.summary({ from: today, to: today });
    }

    /** Failures per day for one device. A device is required: the trend of "everything" means nothing. */
    async trend(query: DiagnosticsReportQuery): Promise<DiagnosticTrendReport> {
        if (!query.deviceId) throw new ValidationException({ deviceId: ['Device wajib dipilih'] });

        const device = await this.requireDevice(query.deviceId);
        const range = this.resolveRange(query.from, query.to);
        const points = await this.repo.trend(device.id, dayRangeInAppTimezone(range.from, range.to));

        return { ...range, device, points };
    }

    /** The individual rows behind the totals, newest first. */
    async detail(query: DiagnosticsDetailQuery): Promise<WithMetadata<DiagnosticLogItem[]>> {
        const device = await this.requireDevice(query.deviceId);
        const range = this.resolveRange(query.from, query.to);
        const { items, total, totalPages } = await this.repo.detailPage(
            device.id,
            dayRangeInAppTimezone(range.from, range.to),
            query.page,
            query.pageSize,
        );

        return {
            data: items,
            metadata: {
                page: query.page,
                pageSize: query.pageSize,
                totalItems: total,
                totalPages,
            },
        };
    }

    /** Both dates, or neither (the validator guarantees they come together). */
    private resolveRange(from: string | undefined, to: string | undefined): DiagnosticRange {
        if (from && to) return { from, to };

        const today = todayInAppTimezone();

        return { from: addDaysToDate(today, -(DEFAULT_REPORT_DAYS - 1)), to: today };
    }

    /** Reports also cover soft-deleted devices: their history is audit data. */
    private async requireDevice(id: string): Promise<{ id: string; code: string; name: string }> {
        const device = await this.devices.findAnyById(id);

        if (!device) throw new EntityNotFoundException('Device', id);

        return { id: device.id, code: device.code, name: device.name };
    }
}
