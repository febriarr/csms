import { aDevice } from '@/device/device.fixture';
import type { DeviceView } from '@workspace/shared';
import { ALERT_CHART_HOURS } from './overview.type';
import { OverviewUtils } from './overview.utils';

const ACTIVE = { status: 'ACTIVE', pause: null } as const;
const PAUSED = {
    status: 'PAUSED',
    pause: { id: 'p1', kind: 'MAINTENANCE', startsAt: new Date(), endsAt: null, phase: 'PAUSED' },
} as const;

function view(overrides: Partial<DeviceView> = {}): DeviceView {
    return { ...aDevice(), monitoring: ACTIVE, ...overrides };
}

describe('OverviewUtils.countDevices', () => {
    it('should count monitored devices per state and leave paused and inactive devices out of the states', () => {
        const counts = OverviewUtils.countDevices([
            view({ id: '1', state: 'NORMAL' }),
            view({ id: '2', state: 'CRITICAL' }),
            view({ id: '3', state: 'WARNING' }),
            view({ id: '4', state: 'OFFLINE' }),
            view({ id: '5', state: 'CRITICAL', monitoring: PAUSED }),
            view({ id: '6', state: 'NORMAL', isActive: false }),
        ]);

        expect(counts.byState).toEqual({ NORMAL: 1, DEFROST: 0, WARNING: 1, CRITICAL: 1, OFFLINE: 1 });
        expect(counts.paused).toBe(1);
        expect(counts.inactive).toBe(1);
        expect(counts.total).toBe(6);
    });

    it('should count a paused device that is also inactive as paused only, like the Live page', () => {
        const counts = OverviewUtils.countDevices([view({ isActive: false, monitoring: PAUSED })]);

        expect(counts.paused).toBe(1);
        expect(counts.inactive).toBe(0);
    });

    it('should count online out of the monitored devices only, paused devices included', () => {
        const counts = OverviewUtils.countDevices([
            view({ id: '1', state: 'NORMAL' }),
            view({ id: '2', state: 'OFFLINE' }),
            view({ id: '3', state: 'NORMAL', monitoring: PAUSED }),
            view({ id: '4', state: 'OFFLINE', isActive: false }),
        ]);

        expect(counts.monitored).toBe(3);
        expect(counts.online).toBe(2);
    });
});

describe('OverviewUtils.rankProblemColdStorages', () => {
    it('should not list a cold room whose devices are healthy, paused or inactive', () => {
        const rooms = OverviewUtils.rankProblemColdStorages(
            [
                view({ id: '1', coldStorageId: 'a', state: 'NORMAL' }),
                view({ id: '2', coldStorageId: 'b', state: 'CRITICAL', monitoring: PAUSED }),
                view({ id: '3', coldStorageId: 'c', state: 'CRITICAL', isActive: false }),
                view({ id: '4', coldStorageId: 'd', state: 'DEFROST' }),
            ],
            5,
        );

        expect(rooms).toEqual([]);
    });

    it('should rank a room by its worst device, then by how many devices are in trouble, then by name', () => {
        const rooms = OverviewUtils.rankProblemColdStorages(
            [
                view({ id: '1', coldStorageId: 'warn', coldStorageName: 'Zeta', state: 'WARNING' }),
                view({ id: '2', coldStorageId: 'warn', coldStorageName: 'Zeta', state: 'WARNING' }),
                view({ id: '3', coldStorageId: 'off', coldStorageName: 'Alpha', state: 'OFFLINE' }),
                view({ id: '4', coldStorageId: 'crit', coldStorageName: 'Mid', state: 'CRITICAL' }),
                view({ id: '5', coldStorageId: 'warn2', coldStorageName: 'Beta', state: 'WARNING' }),
            ],
            5,
        );

        expect(rooms.map((room) => room.id)).toEqual(['crit', 'warn', 'warn2', 'off']);
        expect(rooms[1]).toMatchObject({ deviceCount: 2, problemDeviceCount: 2 });
    });

    it('should name the hottest device in the worst state, and keep a device without a reading last', () => {
        const [room] = OverviewUtils.rankProblemColdStorages(
            [
                view({ id: 'cool', state: 'CRITICAL', lastTemperature: -8 }),
                view({ id: 'none', state: 'CRITICAL', lastTemperature: null }),
                view({ id: 'hot', state: 'CRITICAL', lastTemperature: -2 }),
                view({ id: 'offline', state: 'OFFLINE', lastTemperature: 10 }),
            ],
            5,
        );

        expect(room.worstState).toBe('CRITICAL');
        expect(room.worstDevice.id).toBe('hot');
        expect(room.problemDeviceCount).toBe(4);
    });

    it('should stop at the limit', () => {
        const devices = ['a', 'b', 'c'].map((id) => view({ id, coldStorageId: id, state: 'CRITICAL' }));

        expect(OverviewUtils.rankProblemColdStorages(devices, 2)).toHaveLength(2);
    });
});

describe('OverviewUtils.toOpenAlertCounts', () => {
    it('should add the states up and ignore any state that needs no action', () => {
        expect(
            OverviewUtils.toOpenAlertCounts([
                { toState: 'CRITICAL', total: 2 },
                { toState: 'WARNING', total: 3 },
                { toState: 'OFFLINE', total: 1 },
                { toState: 'NORMAL', total: 9 },
            ]),
        ).toEqual({ total: 6, critical: 2, warning: 3, offline: 1 });
    });
});

describe('OverviewUtils.fillAlertBuckets', () => {
    const NOW = new Date('2026-10-30T10:25:00.000Z');

    it('should return one bucket per hour, oldest first, ending with the current hour', () => {
        const buckets = OverviewUtils.fillAlertBuckets([], NOW);

        expect(buckets).toHaveLength(ALERT_CHART_HOURS);
        expect(buckets[0].hour.toISOString()).toBe('2026-10-29T11:00:00.000Z');
        expect(buckets.at(-1)?.hour.toISOString()).toBe('2026-10-30T10:00:00.000Z');
        expect(buckets.every((bucket) => bucket.warning + bucket.critical + bucket.offline === 0)).toBe(true);
    });

    it('should put each count in its hour and state, and drop a row outside the window', () => {
        const buckets = OverviewUtils.fillAlertBuckets(
            [
                { hour: new Date('2026-10-30T10:00:00.000Z'), toState: 'CRITICAL', total: 2 },
                { hour: new Date('2026-10-30T10:00:00.000Z'), toState: 'WARNING', total: 1 },
                { hour: new Date('2026-10-29T11:00:00.000Z'), toState: 'OFFLINE', total: 4 },
                { hour: new Date('2026-10-29T10:00:00.000Z'), toState: 'CRITICAL', total: 7 },
            ],
            NOW,
        );

        expect(buckets.at(-1)).toMatchObject({ critical: 2, warning: 1, offline: 0 });
        expect(buckets[0]).toMatchObject({ offline: 4 });
        expect(buckets.reduce((sum, bucket) => sum + bucket.critical, 0)).toBe(2);
    });
});

describe('OverviewUtils.toNotificationCounts', () => {
    it('should give every status a number, zero when there is no row', () => {
        expect(OverviewUtils.toNotificationCounts([{ status: 'FAILED', total: 3 }])).toEqual({
            pending: 0,
            success: 0,
            failed: 3,
        });
    });
});

describe('OverviewUtils.toOverviewPause', () => {
    const NOW = new Date('2026-10-30T10:00:00.000Z');
    const base = {
        id: 'p',
        kind: 'MAINTENANCE',
        endsAt: null,
        note: null,
        deviceName: null,
        coldStorageName: null,
    } as const;

    it('should call a pause that has not started yet scheduled, otherwise active', () => {
        const future = OverviewUtils.toOverviewPause({ ...base, startsAt: new Date('2026-10-31T00:00:00.000Z') }, NOW);
        const running = OverviewUtils.toOverviewPause({ ...base, startsAt: new Date('2026-10-30T09:00:00.000Z') }, NOW);

        expect(future.timeline).toBe('SCHEDULED');
        expect(running.timeline).toBe('ACTIVE');
    });

    it('should name the device, or the cold room when the pause targets one', () => {
        const startsAt = new Date('2026-10-30T09:00:00.000Z');

        expect(OverviewUtils.toOverviewPause({ ...base, startsAt, deviceName: 'Freezer 1' }, NOW).targetName).toBe(
            'Freezer 1',
        );
        expect(OverviewUtils.toOverviewPause({ ...base, startsAt, coldStorageName: 'Chiller 1' }, NOW).targetName).toBe(
            'Chiller 1',
        );
    });
});
