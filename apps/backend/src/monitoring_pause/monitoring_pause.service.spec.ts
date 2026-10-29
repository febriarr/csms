import { BusinessRuleException, EntityNotFoundException } from '@/common/exception/app.exception';
import type { SelectMonitoringPause } from '@/database/schema';
import type { CreatePauseInput } from '@workspace/validator';
import type { MonitoringPauseRepository } from './monitoring_pause.repository';
import { MonitoringPauseService } from './monitoring_pause.service';
import type { SuppressingPause } from '@workspace/shared';

const HOUR = 3_600_000;

function aPause(overrides: Partial<SelectMonitoringPause> = {}): SelectMonitoringPause {
    return {
        id: 'pause-1',
        deviceId: 'device-1',
        coldStorageId: null,
        kind: 'MACHINE_OFF',
        startsAt: new Date(Date.now() - HOUR),
        endsAt: null,
        maxPulldownMinutes: 60,
        note: null,
        createdBy: 'user-1',
        endedBy: null,
        createdAt: new Date(Date.now() - HOUR),
        updatedAt: new Date(Date.now() - HOUR),
        ...overrides,
    };
}

type Fake = {
    pause?: SelectMonitoringPause | null;
    targetExists?: boolean;
    endResult?: SelectMonitoringPause | undefined;
    destroyed?: boolean;
    suppressing?: SuppressingPause[];
};

function setup(fake: Fake = {}) {
    const created: unknown[] = [];
    const ended: { id: string; values: { endsAt: Date; endedBy: string; note: string | null } }[] = [];
    const pause = fake.pause === undefined ? aPause() : fake.pause;

    const repo = {
        targetExists: () => Promise.resolve(fake.targetExists ?? true),
        create: (input: Record<string, unknown>) => {
            created.push(input);

            return Promise.resolve({ ...aPause(), ...input, id: 'new-pause' });
        },
        findOne: () => Promise.resolve(pause),
        findOneWithTarget: (id: string) =>
            Promise.resolve(
                pause ? { ...pause, id, deviceName: 'Freezer 1', deviceCode: 'FRZ-01', coldStorageName: null } : null,
            ),
        end: (id: string, values: { endsAt: Date; endedBy: string; note: string | null }) => {
            ended.push({ id, values });

            return Promise.resolve('endResult' in fake ? fake.endResult : { ...aPause(), endsAt: values.endsAt });
        },
        destroyNotStarted: () => Promise.resolve(fake.destroyed ?? false),
        findSuppressing: () => Promise.resolve(fake.suppressing ?? []),
    };

    return { service: new MonitoringPauseService(repo as unknown as MonitoringPauseRepository), created, ended };
}

const createInput = (overrides: Partial<CreatePauseInput> = {}) =>
    ({
        kind: 'MACHINE_OFF',
        deviceId: 'device-1',
        maxPulldownMinutes: 60,
        ...overrides,
    }) satisfies Partial<CreatePauseInput> as CreatePauseInput;

describe('MonitoringPauseService.create', () => {
    it('should fail with a 404 naming the target when it does not exist', async () => {
        const { service } = setup({ targetExists: false });

        await expect(service.create(createInput(), 'user-1')).rejects.toThrow(EntityNotFoundException);
        await expect(
            service.create(createInput({ deviceId: undefined, coldStorageId: 'cs-9' }), 'user-1'),
        ).rejects.toThrow('Cold storage');
    });

    it('should start now when no start is given, remember who created it and report it as active', async () => {
        const { service, created } = setup();
        const before = Date.now();

        const view = await service.create(createInput({ note: 'Cuci mesin' }), 'user-1');

        const saved = created[0] as {
            startsAt: Date;
            createdBy: string;
            endsAt: Date | null;
            deviceId: string | null;
            coldStorageId: string | null;
        };
        expect(saved.startsAt.getTime()).toBeGreaterThanOrEqual(before);
        expect(saved.createdBy).toBe('user-1');
        expect(saved.endsAt).toBeNull();
        expect(saved.coldStorageId).toBeNull();
        expect(view.timeline).toBe('ACTIVE');
    });

    it('should keep an explicit start and end as given', async () => {
        const { service, created } = setup();

        await service.create(
            createInput({ startsAt: '2030-01-01T00:00:00.000Z', endsAt: '2030-01-01T08:00:00.000Z' }),
            'user-1',
        );

        const saved = created[0] as { startsAt: Date; endsAt: Date };
        expect(saved.startsAt).toEqual(new Date('2030-01-01T00:00:00.000Z'));
        expect(saved.endsAt).toEqual(new Date('2030-01-01T08:00:00.000Z'));
    });
});

describe('MonitoringPauseService.end', () => {
    it('should end an open pause now and keep both notes', async () => {
        const { service, ended } = setup({ pause: aPause({ note: 'Mulai cuci' }) });

        await service.end('pause-1', { note: 'Selesai' }, 'user-2');

        expect(ended[0].values.endedBy).toBe('user-2');
        expect(ended[0].values.note).toBe('Mulai cuci\nSelesai');
        expect(Math.abs(ended[0].values.endsAt.getTime() - Date.now())).toBeLessThan(2000);
    });

    it('should not find a pause that does not exist', async () => {
        const { service } = setup({ pause: null });

        await expect(service.end('nope', {}, 'user-1')).rejects.toThrow(EntityNotFoundException);
    });

    it('should refuse to end a pause that already ended', async () => {
        const { service } = setup({ pause: aPause({ endsAt: new Date(Date.now() - 1000) }) });

        await expect(service.end('pause-1', {}, 'user-1')).rejects.toThrow('sudah berakhir');
    });

    it('should refuse an end that is not after the start', async () => {
        const { service } = setup({ pause: aPause({ startsAt: new Date(Date.now() + HOUR) }) });

        await expect(service.end('pause-1', {}, 'user-1')).rejects.toThrow(BusinessRuleException);
    });

    it('should shorten a scheduled end but never extend it', async () => {
        const scheduled = aPause({ endsAt: new Date(Date.now() + 4 * HOUR) });
        const { service } = setup({ pause: scheduled });

        await expect(
            service.end('pause-1', { endsAt: new Date(Date.now() + 6 * HOUR).toISOString() }, 'user-1'),
        ).rejects.toThrow('lebih awal');
        await expect(
            service.end('pause-1', { endsAt: new Date(Date.now() + 2 * HOUR).toISOString() }, 'user-1'),
        ).resolves.toBeDefined();
    });

    it('should report a lost race as already ended instead of overwriting', async () => {
        const { service } = setup({ endResult: undefined });

        await expect(service.end('pause-1', {}, 'user-1')).rejects.toThrow('sudah berakhir');
    });
});

describe('MonitoringPauseService.remove', () => {
    it('should delete a pause that never started', async () => {
        const { service } = setup({ destroyed: true });

        await expect(service.remove('pause-1')).resolves.toBeUndefined();
    });

    it('should keep a pause that already ran: it is part of the history', async () => {
        const { service } = setup({ destroyed: false });

        await expect(service.remove('pause-1')).rejects.toThrow('riwayat');
    });

    it('should not find a pause that does not exist', async () => {
        const { service } = setup({ destroyed: false, pause: null });

        await expect(service.remove('nope')).rejects.toThrow(EntityNotFoundException);
    });
});

describe('MonitoringPauseService.findSuppressing / isPaused', () => {
    const row = (phase: 'PAUSED' | 'PULLING_DOWN', pauseId: string): SuppressingPause => ({
        deviceId: 'device-1',
        pauseId,
        kind: 'MACHINE_OFF',
        startsAt: new Date(),
        endsAt: null,
        phase,
    });

    it('should prefer PAUSED over PULLING_DOWN when a device has both', async () => {
        const { service } = setup({ suppressing: [row('PULLING_DOWN', 'a'), row('PAUSED', 'b')] });

        const byDevice = await service.findSuppressing(['device-1'], new Date());

        expect(byDevice.get('device-1')?.pauseId).toBe('b');
    });

    it('should say whether alerts are suppressed', async () => {
        expect(await setup({ suppressing: [row('PAUSED', 'a')] }).service.isPaused('device-1', new Date())).toBe(true);
        expect(await setup({ suppressing: [] }).service.isPaused('device-1', new Date())).toBe(false);
    });
});
