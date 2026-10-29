import type { AlertService } from '@/alert/alert.service';
import type { InserAlert } from '@/database/schema';
import type { DeviceEventService } from '@/event/device_event.service';
import type { DeviceUpdateEvent, DeviceWithPlace, SuppressingPause } from '@workspace/shared';
import type { MonitoringPauseRepository } from '@/monitoring_pause/monitoring_pause.repository';
import { MonitoringPauseService } from '@/monitoring_pause/monitoring_pause.service';
import type { NotificationOutboxService } from '@/notification/notification_outbox.service';
import { aDevice } from './device.fixture';
import type { DeviceRepository } from './device.repository';
import { DeviceOfflineService, STARTUP_GRACE_MS } from './device_offline.service';

const NOW = new Date('2026-10-15T01:00:00.000Z');
const STALE = new Date('2026-10-14T23:00:00.000Z'); // two hours of silence

function setup(
    devices: Record<string, DeviceWithPlace | null>,
    options: { failFor?: string; suppressing?: SuppressingPause[] } = {},
) {
    let committed = false;

    const alerts: InserAlert[] = [];
    const enqueued: {
        alertId: string;
        deviceId: string;
        message: string;
    }[] = [];
    const published: {
        event: DeviceUpdateEvent;
        afterCommit: boolean;
    }[] = [];
    const markedOffline: string[] = [];

    const repo = {
        findStaleIds: () => Promise.resolve(Object.keys(devices)),

        findByIdForUpdate: (id: string) => {
            if (id === options.failFor) {
                return Promise.reject(new Error('lock timeout'));
            }

            return Promise.resolve(devices[id] ?? null);
        },

        updateState: (id: string, _state: string, at: Date) => {
            markedOffline.push(id);

            return Promise.resolve({ stateChangedAt: at });
        },

        withTransaction: async <T>(callback: (tx: object) => Promise<T>): Promise<T> => {
            const result = await callback({});
            committed = true;

            return result;
        },
    };

    const service = new DeviceOfflineService(
        repo as unknown as DeviceRepository,

        {
            record: (input: InserAlert) => {
                alerts.push(input);

                return Promise.resolve({
                    id: `alert-${alerts.length}`,
                    ...input,
                });
            },
        } as unknown as AlertService,

        {
            enqueue: (input: { alertId: string; deviceId: string; message: string }) => {
                enqueued.push(input);

                return Promise.resolve([]);
            },
        } as unknown as NotificationOutboxService,

        {
            publish: (event: DeviceUpdateEvent) => {
                published.push({
                    event,
                    afterCommit: committed,
                });
            },
        } as unknown as DeviceEventService,

        // the real pause service on a fake repository: no pause is running unless a test says so
        new MonitoringPauseService({
            findSuppressing: () => Promise.resolve(options.suppressing ?? []),
        } as unknown as MonitoringPauseRepository),
    );

    return {
        service,
        alerts,
        enqueued,
        published,
        markedOffline,
    };
}

describe('DeviceOfflineService.detectOnce', () => {
    it('should mark a silent device offline, record the alert, queue the message and publish', async () => {
        const silent = aDevice({
            id: 'd1',
            state: 'WARNING',
            lastSeenAt: STALE,
            lastTemperature: -12,
        });

        const { service, alerts, enqueued, published, markedOffline } = setup({ d1: silent });

        const marked = await service.detectOnce(NOW);

        expect(marked).toBe(1);
        expect(markedOffline).toEqual(['d1']);

        expect(alerts[0]).toMatchObject({
            deviceId: 'd1',
            fromState: 'WARNING',
            toState: 'OFFLINE',
            reasonCode: 'DEVICE_OFFLINE',
            temperature: -12,
            occurredAt: NOW,
        });

        expect(String(alerts[0].reason)).toContain('Last reading -12°C (WARNING)');

        expect(enqueued.length).toBe(1);
        expect(enqueued[0].message).toContain('*OFFLINE*');
        expect(enqueued[0].message).toContain('Gudang A / Chiller 1 (Pintu)');

        expect(published[0].event.state).toBe('OFFLINE');
        expect(published[0].afterCommit).toBe(true);
    });

    it('should carry the pause state in the live event: a device can go offline during a planned pause', async () => {
        const silent = aDevice({ id: 'd1', state: 'NORMAL', lastSeenAt: STALE });
        const pause: SuppressingPause = {
            deviceId: 'd1',
            pauseId: 'p1',
            kind: 'MAINTENANCE',
            startsAt: new Date('2026-10-14T22:00:00.000Z'),
            endsAt: null,
            phase: 'PAUSED',
        };

        const { service, published } = setup({ d1: silent }, { suppressing: [pause] });

        await service.detectOnce(NOW);

        expect(published[0].event.state).toBe('OFFLINE');
        expect(published[0].event.monitoring.status).toBe('PAUSED');
    });

    it('should check again under the lock and leave a device alone that has reported in the meantime', async () => {
        const fresh = aDevice({
            id: 'd1',
            lastSeenAt: new Date('2026-10-15T00:59:50.000Z'),
        });

        const { service, alerts, published } = setup({ d1: fresh });

        expect(await service.detectOnce(NOW)).toBe(0);
        expect(alerts.length).toBe(0);
        expect(published.length).toBe(0);
    });

    it('should skip devices that are already offline, switched off, or gone', async () => {
        const { service, alerts } = setup({
            offline: aDevice({
                id: 'offline',
                state: 'OFFLINE',
                lastSeenAt: STALE,
            }),

            inactive: aDevice({
                id: 'inactive',
                isActive: false,
                lastSeenAt: STALE,
            }),

            gone: null,
        });

        expect(await service.detectOnce(NOW)).toBe(0);
        expect(alerts.length).toBe(0);
    });

    it('should not report a device that never sent anything', async () => {
        const { service, alerts } = setup({
            d1: aDevice({
                id: 'd1',
                lastSeenAt: null,
            }),
        });

        expect(await service.detectOnce(NOW)).toBe(0);
        expect(alerts.length).toBe(0);
    });

    it('should keep going when one device fails', async () => {
        const { service, markedOffline } = setup(
            {
                d1: aDevice({
                    id: 'd1',
                    lastSeenAt: STALE,
                }),

                d2: aDevice({
                    id: 'd2',
                    lastSeenAt: STALE,
                }),
            },
            {
                failFor: 'd1',
            },
        );

        expect(await service.detectOnce(NOW)).toBe(1);
        expect(markedOffline).toEqual(['d2']);
    });

    it('should respect each device heartbeat interval', async () => {
        // 10 minute heartbeat x 5 = 50 minutes allowed;
        // 40 minutes of silence is fine.
        const slow = aDevice({
            id: 'slow',
            heartbeatIntervalSeconds: 600,
            lastSeenAt: new Date(NOW.getTime() - 40 * 60_000),
        });

        const { service } = setup({ slow });

        expect(await service.detectOnce(NOW)).toBe(0);
    });
});

describe('DeviceOfflineService.detect (the scheduled run)', () => {
    it('should do nothing during the grace period after startup', async () => {
        const { service, markedOffline } = setup({
            d1: aDevice({
                id: 'd1',
                lastSeenAt: STALE,
            }),
        });

        // started just now
        (service as unknown as { startedAt: number }).startedAt = Date.now();

        await service.detect();

        expect(markedOffline.length).toBe(0);
    });

    it('should run once the grace period has passed', async () => {
        const { service, markedOffline } = setup({
            d1: aDevice({
                id: 'd1',
                lastSeenAt: new Date(0),
            }),
        });

        (service as unknown as { startedAt: number }).startedAt = Date.now() - STARTUP_GRACE_MS - 1000;

        await service.detect();

        expect(markedOffline).toEqual(['d1']);
    });
});
