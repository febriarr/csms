import { EntityNotFoundException } from '@/common/exception/app.exception';
import type { SelectAlert } from '@/database/schema';
import type { AlertRepository } from './alert.repository';
import { AlertService } from './alert.service';

const alert = (overrides: Partial<SelectAlert> = {}): SelectAlert =>
    ({ id: 'alert-1', acknowledgedAt: null, acknowledgedBy: null, ...overrides }) as SelectAlert;

function setup(fake: { acknowledged?: SelectAlert; existing?: SelectAlert | null; total?: number } = {}) {
    const repo = {
        acknowledge: () => Promise.resolve(fake.acknowledged),

        findOne: () => Promise.resolve(fake.existing === undefined ? alert() : fake.existing),

        findPage: () =>
            Promise.resolve({
                items: [],
                total: fake.total ?? 0,
            }),
    };

    return new AlertService(repo as unknown as AlertRepository);
}

describe('AlertService.acknowledge', () => {
    it('should return the alert it just acknowledged', async () => {
        const acknowledged = alert({ acknowledgedAt: new Date(), acknowledgedBy: 'user-1' });

        expect(await setup({ acknowledged }).acknowledge('alert-1', 'user-1')).toBe(acknowledged);
    });

    it('should keep the first acknowledgement when it is acknowledged again, instead of failing', async () => {
        const first = alert({ acknowledgedAt: new Date('2026-10-15T00:00:00.000Z'), acknowledgedBy: 'user-1' });

        expect(await setup({ acknowledged: undefined, existing: first }).acknowledge('alert-1', 'user-2')).toBe(first);
    });

    it('should return a 404 for an alert that does not exist', async () => {
        await expect(setup({ acknowledged: undefined, existing: null }).acknowledge('nope', 'user-1')).rejects.toThrow(
            EntityNotFoundException,
        );
    });
});

describe('AlertService.findAll', () => {
    it('should wrap the page with the paging metadata', async () => {
        const result = await setup({ total: 45 }).findAll({ page: 2, pageSize: 20 });

        expect(result).toEqual({
            data: [],
            metadata: { page: 2, pageSize: 20, totalItems: 45, totalPages: 3 },
        });
    });
});
