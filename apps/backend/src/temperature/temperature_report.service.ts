import { AlertService } from '@/alert/alert.service';
import { EntityNotFoundException, ValidationException } from '@/common/exception/app.exception';
import type { FieldErrors } from '@/common/exception/error_response.type';
import { dayRangeInAppTimezone } from '@/common/utils/app_timezone';
import { DeviceRepository } from '@/device/device.repository';
import { MonitoringPauseService } from '@/monitoring_pause/monitoring_pause.service';
import { Injectable } from '@nestjs/common';
import type { TemperatureReportQuery } from '@workspace/validator';
import type {
    ReportDays,
    ReportDevice,
    ReportEvent,
    TemperatureReportRow,
    TemperatureReportSummary,
    WithMetadata,
} from '@workspace/shared';
import { TemperatureRepository } from './temperature.repository';
import { ReportUtils, type ReportContext } from './temperature_report.utils';

type InstantRange = { from: Date; to: Date };

/**
 * The read side of the temperature report. Every reading stays a row of its own (no aggregation); what this service
 * adds is the context that explains it: the state and evaluation stored with the reading when it arrived, plus the
 * alerts and planned pauses of the period. The hourly report will sit next to `findReport` and reuse the same
 * export and context code.
 *
 * Alerts and pauses of one device and period are few, so they are read once per request and matched to readings
 * in memory. Readings can be tens of thousands, so those are never held all at once.
 */
@Injectable()
export class TemperatureReportService {
    constructor(
        private readonly temperatures: TemperatureRepository,
        private readonly devices: DeviceRepository,
        private readonly alerts: AlertService,
        private readonly pauses: MonitoringPauseService,
    ) {}

    /** Reports also cover soft-deleted devices: their history is audit data. */
    async requireDevice(id: string): Promise<ReportDevice> {
        const device = await this.devices.findAnyById(id);

        if (!device) throw new EntityNotFoundException('Device', id);

        return { id: device.id, code: device.code, name: device.name, coldStorageId: device.coldStorageId };
    }

    /** A page of readings for one device and period, newest first. Device and both dates are required here. */
    async findReport(query: TemperatureReportQuery): Promise<WithMetadata<TemperatureReportRow[]>> {
        const { deviceId, from, to } = query;

        if (!deviceId || !from || !to) {
            const missing: FieldErrors = {};

            if (!deviceId) missing.deviceId = ['Device wajib dipilih'];
            if (!from) missing.from = ['Tanggal mulai wajib diisi'];
            if (!to) missing.to = ['Tanggal akhir wajib diisi'];

            throw new ValidationException(missing);
        }

        const device = await this.requireDevice(deviceId);
        const { items, total } = await this.temperatures.findPage(
            device.id,
            dayRangeInAppTimezone(from, to),
            query.page,
            query.pageSize,
        );

        // Only the stretch of time this page covers is needed to explain its rows (newest first, so the last row
        // is the oldest). A pause that began earlier is still found: it overlaps the stretch.
        const context =
            items.length === 0
                ? ReportUtils.createContext([], [])
                : await this.contextFor(device, {
                      from: items[items.length - 1].recordedAt,
                      to: new Date(items[0].recordedAt.getTime() + 1),
                  });

        return {
            data: items.map((reading) => ReportUtils.toRow(reading, context)),
            metadata: {
                page: query.page,
                pageSize: query.pageSize,
                totalItems: total,
                totalPages: Math.ceil(total / query.pageSize),
            },
        };
    }

    /** Alerts and planned pauses of the period in one chronological list. */
    async findEvents(device: ReportDevice, days: ReportDays): Promise<ReportEvent[]> {
        const range = dayRangeInAppTimezone(days.from, days.to);
        const [alerts, pauses] = await this.eventsOf(device, range);

        return ReportUtils.mergeEvents(alerts, pauses);
    }

    async findSummary(device: ReportDevice, days: ReportDays): Promise<TemperatureReportSummary> {
        const counts = await this.temperatures.countByStateAndEvaluation(
            device.id,
            dayRangeInAppTimezone(days.from, days.to),
        );

        return ReportUtils.summarize(counts);
    }

    /**
     * Every reading of the period, oldest first, in chunks, each with its note. For the export: the alerts and pauses
     * are read once up front, the readings stream, so memory stays bounded however long the period is.
     */
    async *streamRows(device: ReportDevice, days: ReportDays): AsyncGenerator<TemperatureReportRow[]> {
        const range = dayRangeInAppTimezone(days.from, days.to);
        const context = await this.contextFor(device, range);

        for await (const readings of this.temperatures.iterateRange(device.id, range)) {
            yield readings.map((reading) => ReportUtils.toRow(reading, context));
        }
    }

    private async contextFor(device: ReportDevice, range: InstantRange): Promise<ReportContext> {
        const [alerts, pauses] = await this.eventsOf(device, range);

        return ReportUtils.createContext(alerts, pauses);
    }

    private eventsOf(device: ReportDevice, range: InstantRange) {
        return Promise.all([
            this.alerts.findForReport(device.id, range),
            this.pauses.findForReport({ deviceId: device.id, coldStorageId: device.coldStorageId }, range),
        ]);
    }
}
