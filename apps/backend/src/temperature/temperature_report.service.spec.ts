import type { AlertService } from '@/alert/alert.service';
import { EntityNotFoundException, ValidationException } from '@/common/exception/app.exception';
import type { DeviceRepository } from '@/device/device.repository';
import { aDevice } from '@/device/device.fixture';
import type { MonitoringPauseService } from '@/monitoring_pause/monitoring_pause.service';
import type { ReportAlertEvent, ReportDevice, ReportPauseEvent, TemperatureReading } from '@workspace/shared';
import type { TemperatureRepository } from './temperature.repository';
import { TemperatureReportService } from './temperature_report.service';

type Options = {
    device?: ReturnType<typeof aDevice> | null;
    page?: { items: TemperatureReading[]; total: number };
    chunks?: TemperatureReading[][];
    alerts?: ReportAlertEvent[];
    pauses?: ReportPauseEvent[];
};

function setup(options: Options = {}) {
    const device = options.device === undefined ? aDevice() : options.device;
    const pageCalls: unknown[][] = [];
    const alertCalls: unknown[][] = [];
    const pauseCalls: unknown[][] = [];

    const temperatures = {
        findPage: (...args: unknown[]) => {
            pageCalls.push(args);

            return Promise.resolve(options.page ?? { items: [], total: 0 });
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        iterateRange: async function* () {
            for (const chunk of options.chunks ?? []) yield chunk;
        },
        countByStateAndEvaluation: () => Promise.resolve([{ state: 'NORMAL', evaluation: 'EVALUATED', total: 3 }]),
    };
    const devices = { findAnyById: () => Promise.resolve(device) };
    const alerts = {
        findForReport: (...args: unknown[]) => {
            alertCalls.push(args);

            return Promise.resolve(options.alerts ?? []);
        },
    };
    const pauses = {
        findForReport: (...args: unknown[]) => {
            pauseCalls.push(args);

            return Promise.resolve(options.pauses ?? []);
        },
    };

    const service = new TemperatureReportService(
        temperatures as unknown as TemperatureRepository,
        devices as unknown as DeviceRepository,
        alerts as unknown as AlertService,
        pauses as unknown as MonitoringPauseService,
    );

    return { service, pageCalls, alertCalls, pauseCalls };
}

const at = (seconds: number) => new Date(Date.UTC(2026, 9, 15, 0, 0, seconds));

const reading = (seconds: number, overrides: Partial<TemperatureReading> = {}): TemperatureReading => ({
    recordedAt: at(seconds),
    temperature: -22,
    receivedAt: at(seconds + 1),
    state: 'NORMAL',
    evaluation: 'EVALUATED',
    pauseId: null,
    ...overrides,
});

const warningAlert = (seconds: number): ReportAlertEvent => ({
    type: 'ALERT',
    at: at(seconds),
    fromState: 'NORMAL',
    toState: 'WARNING',
    reasonCode: 'WARNING_TEMPERATURE',
    reason: 'Temperature -12°C exceeded warning threshold.',
    temperature: -12,
});

const device: ReportDevice = { id: 'device-1', code: 'FRZ-01', name: 'Chiller 1', coldStorageId: 'cs-1' };
const days = { from: '2026-10-15', to: '2026-10-15' };

describe('TemperatureReportService.findReport', () => {
    const query = { deviceId: 'device-1', from: '2026-10-01', to: '2026-10-07', page: 2, pageSize: 50 };

    it('should say which of device, from and to is missing', async () => {
        const { service } = setup();

        const error = await service
            .findReport({ page: 1, pageSize: 50 })
            .then(() => null)
            .catch((e: unknown) => e);

        expect(error instanceof ValidationException).toBe(true);
        expect(Object.keys((error as ValidationException).errors ?? {}).sort()).toEqual(['deviceId', 'from', 'to']);
    });

    it('should return the rows of the page with their notes and the pagination metadata', async () => {
        // newest first, as findPage returns them
        const items = [reading(30, { state: 'WARNING' }), reading(0)];
        const { service, pageCalls } = setup({ page: { items, total: 101 }, alerts: [warningAlert(30)] });

        const result = await service.findReport(query);

        expect(result.data.map((row) => row.note)).toEqual(['Temperature -12°C exceeded warning threshold.', null]);
        expect(result.data[0]).toMatchObject({ temperature: -22, state: 'WARNING', evaluation: 'EVALUATED' });
        expect(result.metadata).toEqual({ page: 2, pageSize: 50, totalItems: 101, totalPages: 3 });

        // findPage(deviceId, range, page, pageSize)
        expect(pageCalls[0][0]).toBe('device-1');
        expect(pageCalls[0][2]).toBe(2);
        expect(pageCalls[0][3]).toBe(50);
    });

    it('should read alerts and pauses only for the stretch of time the page covers', async () => {
        const items = [reading(30), reading(0)];
        const { service, alertCalls, pauseCalls } = setup({ page: { items, total: 2 } });

        await service.findReport(query);

        const expected = { from: at(0), to: new Date(at(30).getTime() + 1) };

        // findForReport(deviceId, range) / findForReport({ deviceId, coldStorageId }, range)
        expect(alertCalls[0]).toEqual(['device-1', expected]);
        expect(pauseCalls[0][0]).toEqual({ deviceId: 'device-1', coldStorageId: aDevice().coldStorageId });
        expect(pauseCalls[0][1]).toEqual(expected);
    });

    it('should report zero pages, and read no events, when nothing was recorded in the period', async () => {
        const { service, alertCalls } = setup();

        const result = await service.findReport(query);

        expect(result.data).toEqual([]);
        expect(result.metadata.totalItems).toBe(0);
        expect(result.metadata.totalPages).toBe(0);
        expect(alertCalls.length).toBe(0);
    });

    it('should reject an unknown device with a 404 instead of an empty report', async () => {
        const { service, pageCalls } = setup({ device: null });

        await expect(service.findReport(query)).rejects.toThrow(EntityNotFoundException);
        expect(pageCalls.length).toBe(0);
    });
});

describe('TemperatureReportService.streamRows', () => {
    it('should read alerts and pauses once and explain every chunk with them', async () => {
        const { service, alertCalls, pauseCalls } = setup({
            chunks: [[reading(0), reading(30, { state: 'WARNING' })], [reading(60, { state: 'WARNING' })]],
            alerts: [warningAlert(30)],
        });

        const chunks: unknown[][] = [];

        for await (const rows of service.streamRows(device, days)) chunks.push(rows);

        expect(chunks.length).toBe(2);
        expect(alertCalls.length).toBe(1);
        expect(pauseCalls.length).toBe(1);

        const notes = chunks.flat().map((row) => (row as { note: string | null }).note);

        expect(notes[0]).toBeNull();
        expect(notes[1]).toContain('exceeded warning threshold');
        expect(notes[2]).toContain('Still WARNING');
    });

    it('should yield nothing for a period without readings', async () => {
        const { service } = setup();
        const chunks: unknown[] = [];

        for await (const rows of service.streamRows(device, days)) chunks.push(rows);

        expect(chunks).toEqual([]);
    });
});

describe('TemperatureReportService.findEvents / findSummary', () => {
    it('should merge alerts and pauses in time order', async () => {
        const pause: ReportPauseEvent = {
            type: 'PAUSE',
            id: 'p1',
            at: at(10),
            kind: 'MAINTENANCE',
            scope: 'COLD_STORAGE',
            endsAt: null,
            maxPulldownMinutes: 0,
            note: null,
        };
        const { service } = setup({ alerts: [warningAlert(30), warningAlert(5)], pauses: [pause] });

        const events = await service.findEvents(device, days);

        expect(events.map((event) => event.at)).toEqual([at(5), at(10), at(30)]);
    });

    it('should summarize the counts of the period', async () => {
        const { service } = setup();

        const summary = await service.findSummary(device, days);

        expect(summary.total).toBe(3);
        expect(summary.byState.NORMAL).toBe(3);
    });
});
