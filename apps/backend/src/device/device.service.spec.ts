import { EntityNotFoundException, ValidationException } from '@/common/exception/app.exception';
import type { MonitoringPauseRepository } from '@/monitoring_pause/monitoring_pause.repository';
import { MonitoringPauseService } from '@/monitoring_pause/monitoring_pause.service';
import type { SuppressingPause } from '@workspace/shared';
import type { CreateDeviceInput, UpdateDeviceInput } from '@workspace/validator';
import { aDevice } from './device.fixture';
import type { DeviceRepository } from './device.repository';
import { DeviceService } from './device.service';

type Fake = {
    coldStorageExists?: boolean;
    softDeleted?: boolean;
    updated?: boolean;
    suppressing?: SuppressingPause[];
};

function setup(fake: Fake = {}) {
    const created: Record<string, unknown>[] = [];
    const changes: Record<string, unknown>[] = [];
    const existing = aDevice();

    const repo = {
        findMany: () => Promise.resolve([aDevice({ id: 'a' }), aDevice({ id: 'b' })]),
        findOneWithPlace: (id: string) => Promise.resolve(id === 'missing' ? null : aDevice({ id })),
        findPlain: (id: string) => Promise.resolve(id === 'missing' ? null : { ...existing, id }),
        coldStorageExists: () => Promise.resolve(fake.coldStorageExists ?? true),
        create: (input: Record<string, unknown>) => {
            created.push(input);

            return Promise.resolve({ ...existing, ...input, id: 'new-device' });
        },
        updateById: (_id: string, input: Record<string, unknown>) => {
            changes.push(input);

            return Promise.resolve(fake.updated === false ? undefined : { ...existing, ...input });
        },
        softDelete: () => Promise.resolve(fake.softDeleted ?? true),
    };

    // The real pause service on a fake repository: only the database query is faked, so the way a pause becomes
    // `monitoring` (findSuppressing + toMonitoring) cannot drift away from what this spec expects.
    const pauses = new MonitoringPauseService({
        findSuppressing: () => Promise.resolve(fake.suppressing ?? []),
    } as unknown as MonitoringPauseRepository);

    const service = new DeviceService(repo as unknown as DeviceRepository, pauses);

    return { service, created, changes };
}

const createInput = (overrides: Partial<CreateDeviceInput> = {}): CreateDeviceInput =>
    ({
        code: 'SPIRAL-01',
        name: 'Spiral 1',
        coldStorageId: 'cold-storage-1',
        warningThreshold: -10,
        criticalThreshold: -5,
        heartbeatIntervalSeconds: 30,
        ...overrides,
    }) satisfies Partial<CreateDeviceInput> as CreateDeviceInput;

describe('DeviceService.findAll / findOne', () => {
    it('should mark devices that are paused or pulling down, and the rest as active', async () => {
        const pause: SuppressingPause = {
            deviceId: 'a',
            pauseId: 'p1',
            kind: 'MACHINE_OFF',
            startsAt: new Date('2026-10-15T00:00:00.000Z'),
            endsAt: null,
            phase: 'PAUSED',
        };
        const { service } = setup({ suppressing: [pause] });

        const [first, second] = await service.findAll({});

        expect(first.monitoring).toEqual({
            status: 'PAUSED',
            pause: { id: 'p1', kind: 'MACHINE_OFF', startsAt: pause.startsAt, endsAt: null, phase: 'PAUSED' },
        });
        expect(second.monitoring).toEqual({ status: 'ACTIVE', pause: null });
    });

    it('should return a 404 for a device that does not exist', async () => {
        await expect(setup().service.findOne('missing')).rejects.toThrow(EntityNotFoundException);
    });
});

describe('DeviceService.create', () => {
    it('should store a spiral without a defrost threshold as null', async () => {
        const { service, created } = setup();

        await service.create(createInput());

        expect(created[0]).toMatchObject({
            code: 'SPIRAL-01',
            defrostThreshold: null,
            pointLabel: null,
            firmwareVersion: null,
        });
    });

    it('should refuse a cold storage that does not exist', async () => {
        const { service, created } = setup({ coldStorageExists: false });

        await expect(service.create(createInput())).rejects.toThrow('Cold storage');
        expect(created.length).toBe(0);
    });
});

describe('DeviceService.update', () => {
    // stored thresholds of the fixture device: defrost -20, warning -15, critical -5

    it('should refuse a new warning threshold that lands above the STORED critical one', async () => {
        const { service, changes } = setup();

        const error = await service
            .update('device-1', { warningThreshold: -4 } as UpdateDeviceInput)
            .then(() => null)
            .catch((e: unknown) => e);

        expect(error instanceof ValidationException).toBe(true);
        expect(Object.keys((error as ValidationException).errors ?? {})).toEqual(['criticalThreshold']);
        expect(changes.length).toBe(0);
    });

    it('should refuse a new defrost threshold that lands above the stored warning one', async () => {
        const { service } = setup();

        await expect(service.update('device-1', { defrostThreshold: -10 } as UpdateDeviceInput)).rejects.toThrow(
            ValidationException,
        );
    });

    it('should let a device lose its defrost state with an explicit null', async () => {
        const { service, changes } = setup();

        await service.update('device-1', { defrostThreshold: null } as UpdateDeviceInput);

        expect(changes[0]).toEqual({ defrostThreshold: null });
    });

    it('should accept a valid partial update and send only what changed', async () => {
        const { service, changes } = setup();

        await service.update('device-1', { name: 'Freezer 1 (baru)', warningThreshold: -14 } as UpdateDeviceInput);

        expect(changes[0]).toEqual({ name: 'Freezer 1 (baru)', warningThreshold: -14 });
    });

    it('should check the new cold storage only when it changes', async () => {
        const unchanged = setup({ coldStorageExists: false });
        await expect(
            unchanged.service.update('device-1', { coldStorageId: 'cold-storage-1' } as UpdateDeviceInput),
        ).resolves.toBeDefined();

        const moved = setup({ coldStorageExists: false });
        await expect(
            moved.service.update('device-1', { coldStorageId: 'cold-storage-2' } as UpdateDeviceInput),
        ).rejects.toThrow('Cold storage');
    });

    it('should return a 404 for a device that does not exist', async () => {
        await expect(setup().service.update('missing', { name: 'x' } as UpdateDeviceInput)).rejects.toThrow(
            EntityNotFoundException,
        );
    });
});

describe('DeviceService.remove', () => {
    it('should soft delete, and report a 404 when there was nothing to delete', async () => {
        await expect(setup().service.remove('device-1', 'user-1')).resolves.toBeUndefined();
        await expect(setup({ softDeleted: false }).service.remove('device-1', 'user-1')).rejects.toThrow(
            EntityNotFoundException,
        );
    });
});
