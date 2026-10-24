import { AlertService } from '@/alert/alert.service';
import { DeviceEventService } from '@/event/device_event.service';
import { MonitoringPauseService } from '@/monitoring_pause/monitoring_pause.service';
import { NotificationUtils } from '@/notification/notification.utils';
import { NotificationOutboxService } from '@/notification/notification_outbox.service';
import { TemperatureUtils } from '@/temperature/temperature.utils';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceRepository } from './device.repository';
import type { DeviceWithPlace } from '@workspace/shared';
import { DeviceUtils } from './device.utils';

/**
 * After the API itself was down, every device looks silent because nobody was listening, not because it failed.
 * Detection waits this long after startup so devices can report in first instead of flooding people with OFFLINE
 * messages at every restart.
 */
export const STARTUP_GRACE_MS = 2 * 60_000;

@Injectable()
export class DeviceOfflineService {
    private readonly logger = new Logger(DeviceOfflineService.name);
    private readonly startedAt = Date.now();
    private running = false;

    constructor(
        private readonly devices: DeviceRepository,
        private readonly alerts: AlertService,
        private readonly notifications: NotificationOutboxService,
        private readonly events: DeviceEventService,
        private readonly pauses: MonitoringPauseService,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
    async detect(): Promise<void> {
        const now = new Date();

        if (now.getTime() - this.startedAt < STARTUP_GRACE_MS) return;

        // a slow run must not overlap the next tick
        if (this.running) return;

        this.running = true;

        try {
            await this.detectOnce(now);
        } catch (error) {
            this.logger.error('Offline detection failed', error instanceof Error ? error.stack : String(error));
        } finally {
            this.running = false;
        }
    }

    /**
     * Marks every silent device offline. One device failing never stops the others. Returns how many were marked.
     * Pauses do not hold this back: a device keeps sending while its machine is switched off, so silence during a
     * pause is a real fault (unplugged, no network).
     */
    async detectOnce(now: Date): Promise<number> {
        const ids = await this.devices.findStaleIds(now);
        let marked = 0;

        for (const id of ids) {
            try {
                if (await this.markOffline(id, now)) marked++;
            } catch (error) {
                this.logger.error(
                    `Could not mark device ${id} offline`,
                    error instanceof Error ? error.stack : String(error),
                );
            }
        }

        return marked;
    }

    private async markOffline(id: string, now: Date): Promise<boolean> {
        const updated = await this.devices.withTransaction(async (tx): Promise<DeviceWithPlace | null> => {
            const device = await this.devices.findByIdForUpdate(id, tx);

            // checked again under the lock: a reading may have arrived since the shortlist was made
            if (!device || !device.isActive || device.state === 'OFFLINE' || !DeviceUtils.isStale(device, now)) {
                return null;
            }

            const alert = await this.alerts.record(
                {
                    deviceId: device.id,
                    fromState: device.state,
                    toState: 'OFFLINE',
                    reasonCode: 'DEVICE_OFFLINE',
                    reason: TemperatureUtils.buildAlertReason('DEVICE_OFFLINE', { device, fromState: device.state }),
                    temperature: device.lastTemperature,
                    occurredAt: now,
                },
                tx,
            );

            await this.notifications.enqueue(
                {
                    alertId: alert.id,
                    deviceId: device.id,
                    message: NotificationUtils.buildOfflineMessage({
                        deviceName: device.name,
                        deviceCode: device.code,
                        placeLabel: NotificationUtils.placeLabel({
                            locationName: device.locationName,
                            coldStorageName: device.coldStorageName,
                            pointLabel: device.pointLabel,
                        }),
                        lastSeenAt: device.lastSeenAt,
                        lastTemperature: device.lastTemperature,
                        detectedAt: now,
                    }),
                },
                tx,
            );

            const changed = await this.devices.updateState(device.id, 'OFFLINE', now, tx);

            return { ...device, state: 'OFFLINE', stateChangedAt: changed?.stateChangedAt ?? now };
        });

        if (!updated) return false;

        // after the commit: a subscriber must never see a state that was rolled back
        this.events.publish(DeviceUtils.toUpdateEvent(updated, await this.pauses.isPaused(updated.id, now)));

        return true;
    }
}
