import type { DeviceService } from '@/device/device.service';
import type { DiagnosticService } from '@/diagnostic/diagnostic.service';
import type { WhatsappService } from '@/whatsapp/whatsapp.service';
import { aDevice } from '@/device/device.fixture';
import type { DeviceView, DiagnosticSummaryItem } from '@workspace/shared';
import type { OverviewRepository } from './overview.repository';
import { OverviewService } from './overview.service';

// Baileys is an ES module Jest cannot load; the service only needs the class as an injection token
jest.mock('@/whatsapp/whatsapp.service', () => ({ WhatsappService: class {} }));

const NOW = new Date('2026-10-30T10:25:00.000Z');

function diagnosticItem(code: string): DiagnosticSummaryItem {
    return {
        deviceId: code,
        deviceCode: code,
        deviceName: code,
        coldStorageName: 'Chiller 1',
        sensorFailTotal: 1,
        wifiFailTotal: 0,
        httpFailTotal: 0,
        total: 1,
        avgRssi: null,
        lastReason: null,
    };
}

function setup() {
    const device = { ...aDevice({ state: 'CRITICAL' }), monitoring: { status: 'ACTIVE', pause: null } } as DeviceView;

    const repo = {
        countOpenAlerts: jest.fn().mockResolvedValue([{ toState: 'CRITICAL', total: 2 }]),
        findOpenAlerts: jest.fn().mockResolvedValue([]),
        countAlertsPerHour: jest.fn().mockResolvedValue([]),
        countNotifications: jest.fn().mockResolvedValue([{ status: 'SUCCESS', total: 5 }]),
        findCurrentPauses: jest.fn().mockResolvedValue([]),
    };
    const devices = { findAll: jest.fn().mockResolvedValue([device]) };
    const diagnostics = {
        today: jest.fn().mockResolvedValue({
            from: '2026-10-30',
            to: '2026-10-30',
            items: ['A', 'B', 'C', 'D', 'E'].map(diagnosticItem),
        }),
    };
    const whatsapp = { getStatus: jest.fn().mockReturnValue({ enabled: true, connected: false, qr: 'secret-code' }) };

    const service = new OverviewService(
        repo as unknown as OverviewRepository,
        devices as unknown as DeviceService,
        diagnostics as unknown as DiagnosticService,
        whatsapp as unknown as WhatsappService,
    );

    return { service, repo, devices, diagnostics };
}

describe('OverviewService', () => {
    it('should gather every block of the page into one response', async () => {
        const { service } = setup();

        const overview = await service.get(NOW);

        expect(overview.generatedAt).toBe(NOW);
        expect(overview.devices.byState.CRITICAL).toBe(1);
        expect(overview.openAlerts).toEqual({ total: 2, critical: 2, warning: 0, offline: 0 });
        expect(overview.problemColdStorages).toHaveLength(1);
        expect(overview.alertsLast24h).toHaveLength(24);
        expect(overview.notifications.today).toEqual({ pending: 0, success: 5, failed: 0 });
    });

    it('should show only the worst few diagnostics but report how many devices are affected', async () => {
        const { service } = setup();

        const { diagnostics } = await service.get(NOW);

        expect(diagnostics.affectedDevices).toBe(5);
        expect(diagnostics.top.map((item) => item.deviceCode)).toEqual(['A', 'B', 'C']);
    });

    it('should never hand the WhatsApp pairing code to a user who only reads the overview', async () => {
        const { service } = setup();

        const { notifications } = await service.get(NOW);

        expect(notifications.whatsapp).toEqual({ enabled: true, connected: false });
        expect(JSON.stringify(notifications)).not.toContain('secret-code');
    });

    it('should ask for the alert counts of the chart window and of today in the plant time zone', async () => {
        const { service, repo } = setup();

        await service.get(NOW);

        expect(repo.countAlertsPerHour).toHaveBeenCalledWith({ from: new Date('2026-10-29T11:00:00.000Z'), to: NOW });
        // 10:25 UTC is 17:25 WIB: today in WIB started at 17:00 UTC the day before
        expect(repo.countNotifications).toHaveBeenCalledWith({
            from: new Date('2026-10-29T17:00:00.000Z'),
            to: new Date('2026-10-30T17:00:00.000Z'),
        });
    });
});
