import type { DatabaseService } from '@/database/database.service';
import type { DeviceOfflineService } from '@/device/device_offline.service';
import type { WhatsappService } from '@/whatsapp/whatsapp.service';
import { HealthService } from './health.service';

// Baileys is an ES module Jest cannot load; the service only needs the class as an injection token
jest.mock('@/whatsapp/whatsapp.service', () => ({ WhatsappService: class {} }));

function setup(options: {
    database?: 'up' | 'down' | 'hang';
    scheduler?: boolean;
    whatsapp?: { enabled: boolean; connected: boolean };
}) {
    const { database = 'up', scheduler = true, whatsapp = { enabled: false, connected: false } } = options;

    const execute = jest.fn(() => {
        if (database === 'down') return Promise.reject(new Error('connection refused'));
        if (database === 'hang') return new Promise(() => undefined);

        return Promise.resolve([]);
    });

    return new HealthService(
        { db: { execute } } as unknown as DatabaseService,
        { isSchedulerAlive: () => scheduler } as unknown as DeviceOfflineService,
        { getStatus: () => ({ ...whatsapp, qr: null }) } as unknown as WhatsappService,
    );
}

describe('HealthService', () => {
    afterEach(() => jest.useRealTimers());

    it('should be ok when everything works, and call a disabled WhatsApp fine', async () => {
        const report = await setup({}).check();

        expect(report.status).toBe('ok');
        expect(report.checks.database.status).toBe('up');
        expect(report.checks.whatsapp.status).toBe('disabled');
    });

    it('should be degraded, not down, when the scheduler is stuck', async () => {
        const report = await setup({ scheduler: false }).check();

        expect(report.status).toBe('degraded');
        expect(report.checks.scheduler.status).toBe('down');
    });

    it('should be degraded when WhatsApp is enabled but not connected', async () => {
        const report = await setup({ whatsapp: { enabled: true, connected: false } }).check();

        expect(report.status).toBe('degraded');
        expect(report.checks.whatsapp.status).toBe('down');
    });

    it('should be down when the database refuses the query', async () => {
        const report = await setup({ database: 'down' }).check();

        expect(report.status).toBe('down');
        expect(report.checks.database).toEqual({ status: 'down', latencyMs: null });
    });

    it('should be down when the database does not answer in time', async () => {
        jest.useFakeTimers();

        const pending = setup({ database: 'hang' }).check();

        await jest.advanceTimersByTimeAsync(2_001);

        expect((await pending).status).toBe('down');
    });
});
