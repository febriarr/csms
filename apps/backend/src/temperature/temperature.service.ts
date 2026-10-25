import { AlertService } from '@/alert/alert.service';
import { EntityNotFoundException, ValidationException } from '@/common/exception/app.exception';
import type { FieldErrors } from '@/common/exception/error_response.type';
import { DatabaseTransaction } from '@/database/database.type';
import { dayRangeInAppTimezone } from '@/common/utils/app_timezone';
import { DeviceRepository } from '@/device/device.repository';
import { DeviceUtils } from '@/device/device.utils';
import { DiagnosticService } from '@/diagnostic/diagnostic.service';
import { DeviceEventService } from '@/event/device_event.service';
import { MonitoringPauseService } from '@/monitoring_pause/monitoring_pause.service';
import { NotificationUtils } from '@/notification/notification.utils';
import { NotificationOutboxService } from '@/notification/notification_outbox.service';
import { Injectable } from '@nestjs/common';
import type { TelemetryInput, TemperatureReportQuery } from '@workspace/validator';
import { TemperatureRepository } from './temperature.repository';
import { TemperatureUtils } from './temperature.utils';
import {
    DeviceWithPlace,
    IngestOutcome,
    ReportDevice,
    TelemetryAck,
    TemperatureReading,
    WithMetadata,
} from '@workspace/shared';

@Injectable()
export class TemperatureService {
    constructor(
        private readonly temperatures: TemperatureRepository,
        private readonly devices: DeviceRepository,
        private readonly pauses: MonitoringPauseService,
        private readonly alerts: AlertService,
        private readonly diagnostics: DiagnosticService,
        private readonly notifications: NotificationOutboxService,
        private readonly events: DeviceEventService,
    ) {}

    /**
     * Takes one reading from a device. Everything that must stay consistent happens in a single transaction on the
     * locked device row; what only informs others (the live screen) happens after it has committed:
     *
     * 1. lock the device, so two readings of one device are handled one after the other
     * 2. store the reading; a retry of the same moment stops here as a successful duplicate
     * 3. keep the diagnostics the device sent along, when there is anything to keep
     * 4. update last seen / last reading (the last reading only when this one is the newest)
     * 5. stop when the reading is not the newest, the device is not monitored, or a planned pause suppresses alerts
     * 6. work out the state; when it changed, record the alert and queue its notifications
     *
     * Readings are always stored, even during a pause: they are audit data.
     */
    async ingest(input: TelemetryInput): Promise<TelemetryAck> {
        const recordedAt = new Date(input.timestamp);

        const outcome = await this.temperatures.withTransaction((tx): Promise<IngestOutcome> =>
            this.ingestInTransaction(input, recordedAt, tx),
        );

        // after the commit: a subscriber must never see a state that was rolled back
        if (outcome.event) this.events.publish(outcome.event);

        return outcome.ack;
    }

    /** A page of readings for one device and period. Device and both dates are required here. */
    async findReport(query: TemperatureReportQuery): Promise<WithMetadata<TemperatureReading[]>> {
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

        return {
            data: items,
            metadata: {
                page: query.page,
                pageSize: query.pageSize,
                totalItems: total,
                totalPages: Math.ceil(total / query.pageSize),
            },
        };
    }

    /** Reports also cover soft-deleted devices: their history is audit data. */
    async requireDevice(id: string): Promise<ReportDevice> {
        const device = await this.devices.findAnyById(id);

        if (!device) throw new EntityNotFoundException('Device', id);

        return { id: device.id, code: device.code, name: device.name };
    }

    private async ingestInTransaction(
        input: TelemetryInput,
        recordedAt: Date,
        tx: DatabaseTransaction,
    ): Promise<IngestOutcome> {
        const device = await this.devices.findByCodeForUpdate(input.deviceCode, tx);

        if (!device) throw new EntityNotFoundException(`Device dengan kode ${input.deviceCode}`);

        const ack: TelemetryAck = {
            deviceId: device.id,
            recordedAt,
            temperature: input.temperature,
            duplicate: false,
        };

        const stored = await this.temperatures.insertIgnoreDuplicate(
            { deviceId: device.id, recordedAt, temperature: input.temperature },
            tx,
        );

        if (!stored) return { ack: { ...ack, duplicate: true }, event: null };

        await this.diagnostics.record(device.id, recordedAt, input, tx);

        // decided from the row as it was BEFORE touch: touch is what moves last_recorded_at forward
        const isNewest = device.lastRecordedAt === null || recordedAt > device.lastRecordedAt;

        await this.devices.touch(device.id, { temperature: input.temperature, recordedAt }, tx);

        // a late arrival is history only; it must not move the state or the screen back
        if (!isNewest) return { ack, event: null };

        const now = new Date();
        const afterReading: DeviceWithPlace = {
            ...device,
            lastSeenAt: now,
            lastTemperature: input.temperature,
            lastRecordedAt: recordedAt,
        };

        const paused = await this.pauses.isPaused(device.id, recordedAt, tx);

        if (paused || !device.isActive) return { ack, event: DeviceUtils.toUpdateEvent(afterReading, paused) };

        const newState = TemperatureUtils.getTemperatureState(device, input.temperature);

        if (newState === device.state) return { ack, event: DeviceUtils.toUpdateEvent(afterReading, false) };

        // If a planned pause only just stopped suppressing, say so in the alert: "still too warm after the
        // machine-off period" tells the reader something "exceeded critical threshold" does not.
        const expiredPause = await this.pauses.findJustExpired(
            { deviceId: device.id, coldStorageId: device.coldStorageId },
            recordedAt,
            tx,
        );

        const reasonCode = TemperatureUtils.getAlertReason(device.state, newState);
        const reason = TemperatureUtils.buildAlertReason(reasonCode, {
            device,
            temperature: input.temperature,
            occurredAt: recordedAt,
            fromState: device.state,
            ...(expiredPause ? { pause: expiredPause } : {}),
        });

        const alert = await this.alerts.record(
            {
                deviceId: device.id,
                fromState: device.state,
                toState: newState,
                reasonCode,
                reason,
                temperature: input.temperature,
                occurredAt: recordedAt,
            },
            tx,
        );

        const changed = await this.devices.updateState(device.id, newState, now, tx);

        if (TemperatureUtils.shouldNotify(newState)) {
            await this.notifications.enqueue(
                {
                    alertId: alert.id,
                    deviceId: device.id,
                    message: NotificationUtils.buildAlertMessage({
                        severity: newState,
                        deviceName: device.name,
                        deviceCode: device.code,
                        placeLabel: NotificationUtils.placeLabel({
                            locationName: device.locationName,
                            coldStorageName: device.coldStorageName,
                            pointLabel: device.pointLabel,
                        }),
                        temperature: input.temperature,
                        reason,
                        at: recordedAt,
                    }),
                },
                tx,
            );
        }

        return {
            ack,
            event: DeviceUtils.toUpdateEvent(
                { ...afterReading, state: newState, stateChangedAt: changed?.stateChangedAt ?? now },
                false,
            ),
        };
    }
}
