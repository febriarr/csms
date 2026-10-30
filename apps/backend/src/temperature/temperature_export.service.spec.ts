import type { ReportDevice, ReportEvent, TemperatureHourlyRow, TemperatureReportRow } from '@workspace/shared';
import ExcelJS from 'exceljs';
import type { Readable } from 'node:stream';
import { TemperatureExportService } from './temperature_export.service';
import type { TemperatureReportService } from './temperature_report.service';

const device: ReportDevice = {
    id: 'device-1',
    code: 'FRZ/01',
    name: 'Chiller 1',
    coldStorageId: 'cs-1',
    heartbeatIntervalSeconds: 30,
};
const days = { from: '2026-10-15', to: '2026-10-15' };

const T0 = new Date('2026-10-15T03:00:00.000Z'); // 10:00:00 WIB

const row = (overrides: Partial<TemperatureReportRow> = {}): TemperatureReportRow => ({
    recordedAt: T0,
    temperature: -22,
    receivedAt: T0,
    state: 'NORMAL',
    evaluation: 'EVALUATED',
    note: null,
    ...overrides,
});

const hour = (overrides: Partial<TemperatureHourlyRow> = {}): TemperatureHourlyRow => ({
    hour: T0,
    readings: 120,
    expectedReadings: 120,
    coverage: 100,
    minTemperature: -23,
    avgTemperature: -22.1,
    maxTemperature: -20.5,
    worstState: 'NORMAL',
    warningCount: 0,
    criticalCount: 0,
    notEvaluated: 0,
    inProgress: false,
    note: null,
    ...overrides,
});

type Fake = {
    rows?: TemperatureReportRow[][];
    hours?: TemperatureHourlyRow[];
    events?: ReportEvent[];
    failSummary?: boolean;
};

function setup(fake: Fake = {}) {
    const reports = {
        // eslint-disable-next-line @typescript-eslint/require-await
        streamRows: async function* () {
            for (const chunk of fake.rows ?? []) yield chunk;
        },
        findHourly: () => Promise.resolve(fake.hours ?? []),
        findEvents: () => Promise.resolve(fake.events ?? []),
        findSummary: () =>
            fake.failSummary
                ? Promise.reject(new Error('database went away'))
                : Promise.resolve({
                      total: 3,
                      byState: { NORMAL: 2, DEFROST: 0, WARNING: 0, CRITICAL: 1 },
                      byEvaluation: { EVALUATED: 2, PAUSED: 1, PULLING_DOWN: 0, DEVICE_INACTIVE: 0, LATE_ARRIVAL: 0 },
                  }),
    };

    return new TemperatureExportService(reports as unknown as TemperatureReportService);
}

async function read(stream: Readable): Promise<Buffer> {
    const parts: Buffer[] = [];

    for await (const part of stream) parts.push(Buffer.from(part as Uint8Array));

    return Buffer.concat(parts);
}

const text = async (file: { getStream: () => Readable }) => (await read(file.getStream())).toString('utf8');

/** The lines of a CSV without the byte order mark (String.trim would strip it too, hiding a missing one). */
const linesOf = (csv: string) =>
    csv
        .replace(/^\uFEFF/, '')
        .trimEnd()
        .split('\n');

describe('TemperatureExportService.csv (raw)', () => {
    it('should start with a byte order mark and the five columns', async () => {
        const csv = await text(setup().csv(device, days));

        expect(csv.charCodeAt(0)).toBe(0xfeff);
        expect(csv.slice(1)).toBe('No,Time,Temperature (°C),Status,Note\n');
    });

    it('should write one numbered line per reading, across chunks', async () => {
        const service = setup({
            rows: [[row(), row({ temperature: -21 })], [row({ temperature: -5, state: 'CRITICAL' })]],
        });

        const lines = linesOf(await text(service.csv(device, days)));

        expect(lines.slice(1)).toEqual([
            '1,15-OCT-2026 10:00:00,-22,NORMAL,',
            '2,15-OCT-2026 10:00:00,-21,NORMAL,',
            '3,15-OCT-2026 10:00:00,-5,CRITICAL,',
        ]);
    });

    it('should quote a note that holds a comma or a quote, so it stays one cell', async () => {
        const service = setup({ rows: [[row({ note: 'Alerts suppressed: "pause", maintenance.' })]] });

        const csv = await text(service.csv(device, days));

        expect(csv).toContain(',NORMAL,"Alerts suppressed: ""pause"", maintenance."\n');
    });

    it('should keep the code safe in the file name', () => {
        const headers = setup().csv(device, days).getHeaders();

        expect(headers.disposition).toBe('attachment; filename="temperature-report-FRZ_01-2026-10-15_2026-10-15.csv"');
        expect(headers.type).toBe('text/csv; charset=utf-8');
    });
});

describe('TemperatureExportService.csv (hourly)', () => {
    it('should have the hourly columns and an empty cell where an hour has no temperature', async () => {
        const service = setup({
            hours: [
                hour({ worstState: 'WARNING', warningCount: 3, note: 'x' }),
                hour({
                    readings: 0,
                    coverage: 0,
                    minTemperature: null,
                    avgTemperature: null,
                    maxTemperature: null,
                    worstState: null,
                    note: 'No readings received.',
                }),
            ],
        });

        const csv = await text(service.csv(device, days, 'hourly'));
        const lines = linesOf(csv);

        expect(csv.charCodeAt(0)).toBe(0xfeff);
        expect(lines[0]).toBe(
            'No,Hour,Readings,Coverage (%),Min (°C),Avg (°C),Max (°C),Worst status,WARNING,CRITICAL,Not evaluated,Note',
        );
        expect(lines[1]).toBe('1,15-OCT-2026 10:00:00,120,100,-23,-22.1,-20.5,WARNING,3,0,0,x');
        expect(lines[2]).toBe('2,15-OCT-2026 10:00:00,0,0,,,,,0,0,0,No readings received.');
    });

    it('should name the file as an hourly report', () => {
        expect(setup().csv(device, days, 'hourly').getHeaders().disposition).toContain('temperature-hourly-FRZ_01-');
    });

    it('should write only the header for a period without hours', async () => {
        const csv = await text(setup().csv(device, days, 'hourly'));

        expect(linesOf(csv).length).toBe(1);
    });
});

describe('TemperatureExportService.xlsx', () => {
    const load = async (file: { getStream: () => Readable }) => {
        const workbook = new ExcelJS.Workbook();

        await workbook.xlsx.load((await read(file.getStream())) as unknown as ArrayBuffer);

        return workbook;
    };

    const cells = (sheet: ExcelJS.Worksheet, rowNumber: number) =>
        (sheet.getRow(rowNumber).values as unknown[]).slice(1);

    it('should have a Temperature sheet with title, period, summary, header and the rows, then an Events sheet', async () => {
        const service = setup({
            rows: [[row({ note: 'Alerts suppressed: planned pause.' })]],
            events: [
                {
                    type: 'ALERT',
                    at: T0,
                    fromState: 'NORMAL',
                    toState: 'WARNING',
                    reasonCode: 'WARNING_TEMPERATURE',
                    reason: 'Temperature -12°C exceeded warning threshold.',
                    temperature: -12,
                },
            ],
        });

        const workbook = await load(service.xlsx(device, days));

        expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Temperature', 'Events']);

        const sheet = workbook.getWorksheet('Temperature')!;

        expect(cells(sheet, 1)).toEqual(['Temperature report Chiller 1 (FRZ/01)']);
        expect(cells(sheet, 2)).toEqual(['Period 2026-10-15 to 2026-10-15']);
        expect(String(cells(sheet, 3)[0])).toContain('Readings 3: NORMAL 2');
        expect(String(cells(sheet, 3)[0])).toContain('not evaluated (pause, monitoring off or late arrival): 1');
        expect(cells(sheet, 5)).toEqual(['No', 'Time', 'Temperature (°C)', 'Status', 'Note']);
        expect(cells(sheet, 6)).toEqual([
            1,
            '15-OCT-2026 10:00:00',
            -22,
            'NORMAL',
            'Alerts suppressed: planned pause.',
        ]);

        const events = workbook.getWorksheet('Events')!;

        expect(cells(events, 1)).toEqual(['Time', 'Type', 'Detail', 'Temperature (°C)']);
        expect(cells(events, 2)).toEqual([
            '15-OCT-2026 10:00:00',
            'ALERT NORMAL to WARNING',
            'Temperature -12°C exceeded warning threshold.',
            -12,
        ]);
    });

    it('should size the columns so a date and a note are not cut off, wrap the note and freeze the header', async () => {
        const workbook = await load(setup({ rows: [[row({ note: 'x'.repeat(200) })]] }).xlsx(device, days));
        const sheet = workbook.getWorksheet('Temperature')!;

        // No, Time, Temperature, Status, Note
        const widths = [1, 2, 3, 4, 5].map((index) => sheet.getColumn(index).width ?? 0);

        expect(widths[1]).toBeGreaterThanOrEqual(21); // "15-OCT-2026 10:00:00" is 20 characters
        expect(widths[4]).toBeGreaterThanOrEqual(60);
        expect(sheet.getColumn(5).alignment?.wrapText).toBe(true);
        expect(sheet.getRow(5).font?.bold).toBe(true);
        expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 5 });

        const events = workbook.getWorksheet('Events')!;

        expect(events.getColumn(3).width ?? 0).toBeGreaterThanOrEqual(60);
        expect(events.getColumn(3).alignment?.wrapText).toBe(true);
        expect(events.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    });

    it('should write the hourly sheet with the coverage caption', async () => {
        const service = setup({ hours: [hour({ note: 'Low coverage.' })] });

        const workbook = await load(service.xlsx(device, days, 'hourly'));
        const sheet = workbook.getWorksheet('Hourly')!;

        expect(cells(sheet, 1)).toEqual(['Hourly temperature report Chiller 1 (FRZ/01)']);
        expect(String(cells(sheet, 4)[0])).toContain('Coverage is approximate');
        expect(String(cells(sheet, 4)[0])).toContain('now 30 s');
        expect(cells(sheet, 6)[0]).toBe('No');
        expect(cells(sheet, 7)).toEqual([
            1,
            '15-OCT-2026 10:00:00',
            120,
            100,
            -23,
            -22.1,
            -20.5,
            'NORMAL',
            0,
            0,
            0,
            'Low coverage.',
        ]);
    });

    it('should end the stream with an error instead of a half file when reading fails', async () => {
        const file = setup({ failSummary: true }).xlsx(device, days);

        await expect(read(file.getStream())).rejects.toThrow('database went away');
    });
});
