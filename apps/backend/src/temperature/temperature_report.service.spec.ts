import type { AlertService } from '@/alert/alert.service';
import { EntityNotFoundException, ValidationException } from '@/common/exception/app.exception';
import type { DeviceRepository } from '@/device/device.repository';
import { aDevice } from '@/device/device.fixture';
import type { MonitoringPauseService } from '@/monitoring_pause/monitoring_pause.service';
import type { ReportAlertEvent, ReportDevice, ReportPauseEvent, TemperatureReading } from '@workspace/shared';
import type { HourlyAggregate } from './temperature.type';
import type { TemperatureRepository } from './temperature.repository';
import { TemperatureReportService } from './temperature_report.service';

type Options = {
    device?: ReturnType<typeof aDevice> | null;
    page?: { items: TemperatureReading[]; total: number };
    chunks?: TemperatureReading[][];
    hourly?: HourlyAggregate[];
    alerts?: ReportAlertEvent[];
    pauses?: ReportPauseEvent[];
};

function setup(options: Options = {}) {
    const device = options.device === undefined ? aDevice() : options.device;
    const pageCalls: unknown[][] = [];
    const alertCalls: unknown[][] = [];
    const pauseCalls: unknown[][] = [];
    const hourlyCalls: unknown[][] = [];

    const temperatures = {
        findPage: (...args: unknown[]) => {
            pageCalls.push(args);

            return Promise.resolve(options.page ?? { items: [], total: 0 });
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        iterateRange: async function* () {
            for (const chunk of options.chunks ?? []) yield chunk;
        },
        findHourly: (...args: unknown[]) => {
            hourlyCalls.push(args);

            return Promise.resolve(options.hourly ?? []);
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

    return { service, pageCalls, alertCalls, pauseCalls, hourlyCalls };
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

const device: ReportDevice = {
    id: 'device-1',
    code: 'FRZ-01',
    name: 'Chiller 1',
    coldStorageId: 'cs-1',
    heartbeatIntervalSeconds: 30,
};
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

describe('TemperatureReportService.findHourly', () => {
    // the whole of 15 OCT 2026 in WIB, looked at when it is over
    const AFTER = new Date('2026-10-20T00:00:00.000Z');
    const firstHour = new Date('2026-10-14T17:00:00.000Z');

    const aggregate = (overrides: Partial<HourlyAggregate> = {}): HourlyAggregate => ({
        hour: firstHour,
        readings: 120,
        min: -23,
        avg: -22,
        max: -21,
        worstState: 'NORMAL',
        warningCount: 0,
        criticalCount: 0,
        pausedCount: 0,
        pullingDownCount: 0,
        inactiveCount: 0,
        lateCount: 0,
        evaluatedExcursions: 0,
        ...overrides,
    });

    it('should ask the database for the range of the period, in the plant time zone', async () => {
        const { service, hourlyCalls } = setup();

        await service.findHourly(device, days, AFTER);

        expect(hourlyCalls[0]).toEqual(['device-1', { from: firstHour, to: new Date('2026-10-15T17:00:00.000Z') }]);
    });

    it('should return a row for every hour of the period, with the hours the database had nothing for', async () => {
        const { service } = setup({ hourly: [aggregate()] });

        const rows = await service.findHourly(device, days, AFTER);

        expect(rows.length).toBe(24);
        expect(rows[0]).toMatchObject({ readings: 120, coverage: 100, minTemperature: -23, maxTemperature: -21 });
        expect(rows[1]).toMatchObject({ readings: 0, note: 'No readings received.' });
    });

    it('should measure coverage against the heartbeat of the device', async () => {
        const { service } = setup({ hourly: [aggregate({ readings: 60 })] });

        const [first] = await service.findHourly({ ...device, heartbeatIntervalSeconds: 60 }, days, AFTER);

        // 60 s heartbeat: 60 an hour
        expect(first).toMatchObject({ expectedReadings: 60, coverage: 100 });
    });

    it('should put the alerts of the hour in its note', async () => {
        const { service, alertCalls } = setup({
            hourly: [aggregate()],
            alerts: [warningAlert(0)],
        });

        // warningAlert(0) is 00:00:00 UTC on 15 OCT = 07:00 WIB: that hour has no aggregate, so it is a gap with an alert
        const rows = await service.findHourly(device, days, AFTER);
        const hour = rows.find((row) => row.hour.getTime() === Date.UTC(2026, 9, 15, 0));

        expect(hour?.note).toBe('No readings received. 1 alert: WARNING at 07:00.');
        expect(alertCalls.length).toBe(1);
    });

    it('should leave out hours that have not happened yet', async () => {
        const { service } = setup();

        // 02:30 WIB on the 15th: the hours of 00:00, 01:00 and 02:00 WIB
        const rows = await service.findHourly(device, days, new Date('2026-10-14T19:30:00.000Z'));

        expect(rows.length).toBe(3);
        expect(rows[2].inProgress).toBe(true);
    });
});
