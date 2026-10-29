import { DeviceMonitoring } from '@workspace/shared';
import { aDevice } from './device.fixture';
import { DeviceUtils } from './device.utils';

const NOW = new Date('2026-10-15T01:00:00.000Z');

describe('DeviceUtils.isStale', () => {
    it('should call a device stale after five missed heartbeats, and not before', () => {
        const device = aDevice({ heartbeatIntervalSeconds: 30 });

        // allowed silence: 30 s x 5 = 150 s
        expect(DeviceUtils.isStale({ ...device, lastSeenAt: new Date(NOW.getTime() - 150_000) }, NOW)).toBe(false);
        expect(DeviceUtils.isStale({ ...device, lastSeenAt: new Date(NOW.getTime() - 151_000) }, NOW)).toBe(true);
    });

    it('should follow the heartbeat of the device itself', () => {
        const slow = aDevice({ heartbeatIntervalSeconds: 300, lastSeenAt: new Date(NOW.getTime() - 20 * 60_000) });

        expect(DeviceUtils.isStale(slow, NOW)).toBe(false);
    });

    it('should never call a device that has not reported yet stale', () => {
        expect(DeviceUtils.isStale(aDevice({ lastSeenAt: null }), NOW)).toBe(false);
    });
});

describe('DeviceUtils.toUpdateEvent', () => {
    it('should copy what the live screen needs and add the pause flag', () => {
        const device = aDevice({ state: 'WARNING', lastTemperature: -12 });

        const monitoring: DeviceMonitoring = {
            status: 'PULLING_DOWN',
            pause: {
                id: 'pause-1',
                kind: 'MACHINE_OFF',
                startsAt: new Date('2026-10-15T00:00:00.000Z'),
                endsAt: new Date('2026-10-15T01:00:00.000Z'),
                phase: 'PULLING_DOWN',
            },
        };

        expect(DeviceUtils.toUpdateEvent(device, monitoring)).toEqual({
            id: 'device-1',
            code: 'FRZ-01',
            name: 'Freezer 1',
            coldStorageId: 'cold-storage-1',
            state: 'WARNING',
            isActive: true,
            lastTemperature: -12,
            lastSeenAt: device.lastSeenAt,
            stateChangedAt: device.stateChangedAt,
            monitoring,
        });
    });

    it('should preserve PULLING_DOWN in live event', () => {
        const device = aDevice({ state: 'WARNING', lastTemperature: -12 });

        const monitoring: DeviceMonitoring = {
            status: 'PULLING_DOWN',
            pause: {
                id: 'pause-1',
                kind: 'MACHINE_OFF',
                startsAt: new Date('2026-10-15T00:00:00.000Z'),
                endsAt: new Date('2026-10-15T01:00:00.000Z'),
                phase: 'PULLING_DOWN',
            },
        };

        const event = DeviceUtils.toUpdateEvent(device, monitoring);

        expect(event.monitoring.status).toBe('PULLING_DOWN');
        expect(event.monitoring.pause?.id).toBe('pause-1');
    });
});
