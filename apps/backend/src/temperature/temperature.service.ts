import { AlertService } from '@/alert/alert.service';
import { EntityNotFoundException } from '@/common/exception/app.exception';
import { DatabaseTransaction } from '@/database/database.type';
import { DeviceRepository } from '@/device/device.repository';
import { DeviceUtils } from '@/device/device.utils';
import { DiagnosticService } from '@/diagnostic/diagnostic.service';
import { DeviceEventService } from '@/event/device_event.service';
import { MonitoringPauseService } from '@/monitoring_pause/monitoring_pause.service';
import { NotificationUtils } from '@/notification/notification.utils';
import { NotificationOutboxService } from '@/notification/notification_outbox.service';
import { Injectable } from '@nestjs/common';
import type { RecentReadingsQuery, TelemetryInput } from '@workspace/validator';
import { TemperatureRepository } from './temperature.repository';
import { TemperatureUtils } from './temperature.utils';
import { DeviceWithPlace, IngestOutcome, RecentReading, TelemetryAck } from '@workspace/shared';

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
     * 2. store the reading with the state it classifies as at the thresholds of this moment (a snapshot, so a report
     *    never has to guess it later); a retry of the same moment stops here as a successful duplicate
     * 3. keep the diagnostics the device sent along, when there is anything to keep
     * 4. update last seen / last reading (the last reading only when this one is the newest)
     * 5. stop when the reading is not the newest, the device is not monitored, or a planned pause suppresses alerts;
     *    the last two are written on the stored reading, so the report can say why no alert was raised
     * 6. when the state changed, record the alert and queue its notifications
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

    /** Recent readings of several devices at once, for the sparklines of the live page. Oldest first. */
    async findRecent(query: RecentReadingsQuery): Promise<Record<string, RecentReading[]>> {
        const since = new Date(Date.now() - query.minutes * 60_000);
        const rows = await this.temperatures.findRecentPerMinute(query.deviceIds, since);

        // every requested device gets a key, also when it has no readings in the period
        const result: Record<string, RecentReading[]> = Object.fromEntries(query.deviceIds.map((id) => [id, []]));

        for (const row of rows) {
            result[row.deviceId]?.push({ recordedAt: row.bucket, temperature: row.temperature });
        }

        return result;
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

        // decided from the row as it was BEFORE touch: touch is what moves last_recorded_at forward
        const isNewest = device.lastRecordedAt === null || recordedAt > device.lastRecordedAt;

        // what this reading is at the device's thresholds right now; stored, never recomputed by reports
        const newState = TemperatureUtils.getTemperatureState(device, input.temperature);

        const stored = await this.temperatures.insertIgnoreDuplicate(
            {
                deviceId: device.id,
                recordedAt,
                temperature: input.temperature,
                state: newState,
                // Provisional. A planned pause can only be looked up once the reading is stored (the reading itself
                // may end a pull-down), so the pause cases replace this below, inside this same transaction.
                evaluation: isNewest ? 'EVALUATED' : 'LATE_ARRIVAL',
            },
            tx,
        );

        if (!stored) return { ack: { ...ack, duplicate: true }, event: null };

        await this.diagnostics.record(device.id, recordedAt, input, tx);

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

        const suppressing = await this.pauses.findSuppressing([device.id], recordedAt, tx);

        const monitoring = this.pauses.toMonitoring(suppressing.get(device.id));

        if (monitoring.status !== 'ACTIVE' || !device.isActive) {
            // say on the stored reading why no alert is looked at: this is what a report shows next to the number
            await this.temperatures.markEvaluation(
                device.id,
                recordedAt,
                TemperatureUtils.getEvaluation({ isActive: device.isActive, monitoring }),
                tx,
            );

            return {
                ack,
                event: DeviceUtils.toUpdateEvent(afterReading, monitoring),
            };
        }

        if (newState === device.state) {
            return {
                ack,
                event: DeviceUtils.toUpdateEvent(afterReading, monitoring),
            };
        }

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
                {
                    ...afterReading,
                    state: newState,
                    stateChangedAt: changed?.stateChangedAt ?? now,
                },
                monitoring,
            ),
        };
    }
}
