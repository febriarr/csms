import type { TemperatureRepository } from './temperature.repository';
import { RETENTION_BATCH_SIZE, TemperatureRetentionService, retentionCutoff } from './temperature_retention.service';

describe('retentionCutoff', () => {
    it('should be exactly five years before now', () => {
        expect(retentionCutoff(new Date('2026-10-30T20:00:00.000Z')).toISOString()).toBe('2021-10-30T20:00:00.000Z');
    });

    it('should never be later than five years back on 29 February, so nothing is deleted early', () => {
        const cutoff = retentionCutoff(new Date('2028-02-29T03:00:00.000Z'));

        // 29 Feb 2023 does not exist: the cutoff is the 28th, a day more kept, never a day less
        expect(cutoff.toISOString()).toBe('2023-02-28T03:00:00.000Z');
    });

    it('should keep 29 February when the year five years back is a leap year too', () => {
        expect(retentionCutoff(new Date('2032-02-29T03:00:00.000Z'), 4).toISOString()).toBe('2028-02-29T03:00:00.000Z');
    });
});

describe('TemperatureRetentionService', () => {
    const NOW = new Date('2026-10-30T20:00:00.000Z');

    function setup(batches: Record<string, number[] | Error>) {
        const calls: { deviceId: string; cutoff: Date; limit: number }[] = [];

        const repo = {
            findAllDeviceIds: () => Promise.resolve(Object.keys(batches)),
            deleteOlderThan: (deviceId: string, cutoff: Date, limit: number) => {
                calls.push({ deviceId, cutoff, limit });

                const plan = batches[deviceId];

                if (plan instanceof Error) return Promise.reject(plan);

                return Promise.resolve(plan.shift() ?? 0);
            },
        };

        const service = new TemperatureRetentionService(repo as unknown as TemperatureRepository);

        return { service, calls };
    }

    it('should delete with the five year cutoff', async () => {
        const { service, calls } = setup({ a: [0] });

        await service.deleteExpired(NOW);

        expect(calls[0].cutoff.toISOString()).toBe('2021-10-30T20:00:00.000Z');
        expect(calls[0].limit).toBe(RETENTION_BATCH_SIZE);
    });

    it('should keep deleting a device in batches until a batch comes back short', async () => {
        const { service, calls } = setup({ a: [RETENTION_BATCH_SIZE, RETENTION_BATCH_SIZE, 120] });

        const total = await service.deleteExpired(NOW);

        expect(total).toBe(RETENTION_BATCH_SIZE * 2 + 120);
        expect(calls).toHaveLength(3);
    });

    it('should stop after one call for a device with nothing to delete', async () => {
        const { service, calls } = setup({ a: [0], b: [0] });

        expect(await service.deleteExpired(NOW)).toBe(0);
        expect(calls.map((call) => call.deviceId)).toEqual(['a', 'b']);
    });

    it('should carry on with the other devices when one fails', async () => {
        const { service } = setup({ a: new Error('lock timeout'), b: [40] });
        const logged = jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

        expect(await service.deleteExpired(NOW)).toBe(40);
        expect(logged).toHaveBeenCalledTimes(1);
    });

    it('should not start a second run while one is still going', async () => {
        let release: (value: number) => void = () => undefined;
        const { service, calls } = setup({ a: [0] });
        const repo = service['temperatures'] as unknown as { deleteOlderThan: () => Promise<number> };

        repo.deleteOlderThan = jest.fn(() => new Promise<number>((resolve) => (release = resolve)));
        jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);

        const first = service.run();
        await service.run();

        expect(repo.deleteOlderThan).toHaveBeenCalledTimes(1);

        release(0);
        await first;
        expect(calls).toHaveLength(0);
    });
});
