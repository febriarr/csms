import { formatDateTime } from '@/common/utils/format_date_time';
import { Injectable, StreamableFile } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PassThrough, Readable } from 'node:stream';
import type {
    ReportDays,
    ReportDevice,
    TemperatureHourlyRow,
    TemperatureReportRow,
    TemperatureReportSummary,
} from '@workspace/shared';
import { TemperatureReportService } from './temperature_report.service';
import { ReportUtils } from './temperature_report.utils';

const CSV_TYPE = 'text/csv; charset=utf-8';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Byte order mark: makes Excel read the CSV as UTF-8, so "°C" shows correctly. Written as an escape on purpose. */
const BOM = '\uFEFF';

type Cell = string | number | null;

/**
 * A column of a sheet. `width` is in characters of the sheet's default font: wide enough for the longest value the
 * column normally holds, so a date or a note is not cut off by the next column. `wrap` lets a long text continue on
 * the next line inside its cell instead of running on (or being cut) at the column edge.
 */
type Column = { header: string; width: number; wrap?: boolean };

/** "15-OCT-2026 10:00:00" is 20 characters. */
const TIME_WIDTH = 22;
const NO_WIDTH = 7;
const NOTE_WIDTH = 80;

const EVENTS_COLUMNS: readonly Column[] = [
    { header: 'Time', width: TIME_WIDTH },
    { header: 'Type', width: 28 },
    { header: 'Detail', width: 90, wrap: true },
    { header: 'Temperature (°C)', width: 18 },
];

/** The raw report is one line per reading, the hourly report one line per hour. */
export type ExportGranularity = 'raw' | 'hourly';

/**
 * Everything that differs between the reports: what the sheet is called, its columns, how a row becomes cells and
 * where the rows come from. The writing of CSV and XLSX is the same for all of them.
 */
type ReportSource<Row> = {
    title: string;
    /** Shown under the title in the XLSX only: how to read numbers that are not exact. */
    caption: string | null;
    sheet: string;
    /** The columns after "No", which the writer adds. */
    columns: readonly Column[];
    cells: (row: Row) => Cell[];
    rows: () => AsyncIterable<Row[]>;
    filenamePrefix: string;
};

/**
 * Builds the downloadable report. Both formats are produced as a stream, chunk by chunk, so a month of readings
 * (tens of thousands of rows) never sits in memory as one big array. What goes into the rows (status, note,
 * events, hours) is decided by TemperatureReportService; this class only writes it down.
 */
@Injectable()
export class TemperatureExportService {
    constructor(private readonly reports: TemperatureReportService) {}

    /**
     * Plain CSV with a byte order mark. No title rows and no second sheet: it is meant for tools, one header and one
     * line per reading (or per hour).
     */
    csv(device: ReportDevice, days: ReportDays, granularity: ExportGranularity = 'raw'): StreamableFile {
        return granularity === 'hourly'
            ? this.csvOf(device, days, this.hourlySource(device, days))
            : this.csvOf(device, days, this.rawSource(device, days));
    }

    /**
     * Sheet "Temperature" (or "Hourly"): title, period, a one-line summary, then the rows.
     * Sheet "Events": the alerts and planned pauses of the period in time order.
     */
    xlsx(device: ReportDevice, days: ReportDays, granularity: ExportGranularity = 'raw'): StreamableFile {
        return granularity === 'hourly'
            ? this.xlsxOf(device, days, this.hourlySource(device, days))
            : this.xlsxOf(device, days, this.rawSource(device, days));
    }

    /* the two reports */

    private rawSource(device: ReportDevice, days: ReportDays): ReportSource<TemperatureReportRow> {
        return {
            title: `Temperature report ${device.name} (${device.code})`,
            caption: null,
            sheet: 'Temperature',
            columns: [
                { header: 'Time', width: TIME_WIDTH },
                { header: 'Temperature (°C)', width: 18 },
                { header: 'Status', width: 12 },
                { header: 'Note', width: NOTE_WIDTH, wrap: true },
            ],
            cells: (row) => [formatDateTime(row.recordedAt), row.temperature, row.state, row.note ?? ''],
            rows: () => this.reports.streamRows(device, days),
            filenamePrefix: 'temperature-report',
        };
    }

    private hourlySource(device: ReportDevice, days: ReportDays): ReportSource<TemperatureHourlyRow> {
        return {
            title: `Hourly temperature report ${device.name} (${device.code})`,
            caption:
                `Coverage is approximate: readings received against what the heartbeat interval of the device ` +
                `(now ${device.heartbeatIntervalSeconds} s) says should have arrived.`,
            sheet: 'Hourly',
            columns: [
                { header: 'Hour', width: TIME_WIDTH },
                { header: 'Readings', width: 11 },
                { header: 'Coverage (%)', width: 14 },
                { header: 'Min (°C)', width: 11 },
                { header: 'Avg (°C)', width: 11 },
                { header: 'Max (°C)', width: 11 },
                { header: 'Worst status', width: 14 },
                { header: 'WARNING', width: 11 },
                { header: 'CRITICAL', width: 11 },
                { header: 'Not evaluated', width: 15 },
                { header: 'Note', width: NOTE_WIDTH, wrap: true },
            ],
            cells: (row) => [
                formatDateTime(row.hour),
                row.readings,
                row.coverage,
                row.minTemperature,
                row.avgTemperature,
                row.maxTemperature,
                row.worstState ?? '',
                row.warningCount,
                row.criticalCount,
                row.notEvaluated,
                row.note ?? '',
            ],
            rows: () => this.hourlyChunks(device, days),
            filenamePrefix: 'temperature-hourly',
        };
    }

    /** A month is at most 744 hours, so the hourly report is one chunk. */
    private async *hourlyChunks(device: ReportDevice, days: ReportDays): AsyncGenerator<TemperatureHourlyRow[]> {
        yield await this.reports.findHourly(device, days);
    }

    /* writers */

    private csvOf<Row>(device: ReportDevice, days: ReportDays, source: ReportSource<Row>): StreamableFile {
        const chunks = this.csvChunks(source);

        return new StreamableFile(Readable.from(chunks), {
            type: CSV_TYPE,
            disposition: `attachment; filename="${this.filename(source, device, days, 'csv')}"`,
        });
    }

    private xlsxOf<Row>(device: ReportDevice, days: ReportDays, source: ReportSource<Row>): StreamableFile {
        const stream = new PassThrough();
        // useStyles: column widths are always written, but wrapping and the bold header are styles
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: true, useSharedStrings: false });

        // runs while the response is being sent; a failure ends the stream with an error instead of a half file
        void (async () => {
            try {
                // read before the first byte is written: a failure here must not leave a half-written header
                const [summary, events] = await Promise.all([
                    this.reports.findSummary(device, days),
                    this.reports.findEvents(device, days),
                ]);

                // title, period, summary, [caption], blank line, then the header: freeze everything above the data
                const headerRow = source.caption ? 6 : 5;
                const sheet = workbook.addWorksheet(source.sheet, {
                    views: [{ state: 'frozen', ySplit: headerRow }],
                });

                this.setColumns(sheet, [{ header: 'No', width: NO_WIDTH }, ...source.columns]);

                this.addTitle(sheet, source.title, true);
                this.addTitle(sheet, `Period ${days.from} to ${days.to}`);
                this.addTitle(sheet, this.summaryLine(summary));

                if (source.caption) this.addTitle(sheet, source.caption);

                sheet.addRow([]).commit();
                this.addHeader(sheet, ['No', ...source.columns.map((column) => column.header)]);

                let no = 0;

                for await (const rows of source.rows()) {
                    for (const row of rows) {
                        sheet.addRow([++no, ...source.cells(row)]).commit();
                    }
                }

                sheet.commit();

                const eventSheet = workbook.addWorksheet('Events', { views: [{ state: 'frozen', ySplit: 1 }] });

                this.setColumns(eventSheet, EVENTS_COLUMNS);
                this.addHeader(
                    eventSheet,
                    EVENTS_COLUMNS.map((column) => column.header),
                );

                for (const event of events) {
                    eventSheet
                        .addRow([
                            formatDateTime(event.at),
                            event.type === 'ALERT'
                                ? `ALERT ${event.fromState} to ${event.toState}`
                                : `PAUSE ${event.kind}`,
                            ReportUtils.describeEvent(event),
                            event.type === 'ALERT' ? event.temperature : null,
                        ])
                        .commit();
                }

                eventSheet.commit();
                await workbook.commit();
            } catch (error) {
                stream.destroy(error instanceof Error ? error : new Error(String(error)));
            }
        })();

        return new StreamableFile(stream, {
            type: XLSX_TYPE,
            disposition: `attachment; filename="${this.filename(source, device, days, 'xlsx')}"`,
        });
    }

    private async *csvChunks<Row>(source: ReportSource<Row>): AsyncGenerator<string> {
        yield `${BOM}${['No', ...source.columns.map((column) => column.header)].map((name) => this.csvCell(name)).join(',')}\n`;

        let no = 0;

        for await (const rows of source.rows()) {
            if (rows.length === 0) continue;

            yield rows
                .map((row) => [++no, ...source.cells(row)].map((cell) => this.csvCell(cell)).join(','))
                .join('\n') + '\n';
        }
    }

    /** Widths for every column, and wrapping for the long-text ones (note, detail). */
    private setColumns(sheet: ExcelJS.Worksheet, columns: readonly Column[]): void {
        sheet.columns = columns.map((column) => ({
            width: column.width,
            ...(column.wrap ? { style: { alignment: { wrapText: true, vertical: 'top' as const } } } : {}),
        }));
    }

    /** A line of text above the table. It is not wrapped: it runs over the empty cells to its right. */
    private addTitle(sheet: ExcelJS.Worksheet, text: string, bold = false): void {
        const row = sheet.addRow([text]);

        if (bold) row.font = { bold: true, size: 13 };

        row.commit();
    }

    /** Bold, with a line below, so the header stands out from the data when frozen. */
    private addHeader(sheet: ExcelJS.Worksheet, names: string[]): void {
        const row = sheet.addRow(names);

        row.font = { bold: true };
        row.alignment = { vertical: 'top' };
        row.eachCell((cell) => {
            cell.border = { bottom: { style: 'thin' } };
        });
        row.commit();
    }

    private summaryLine(summary: TemperatureReportSummary): string {
        const { byState, byEvaluation, total } = summary;
        const unevaluated = total - byEvaluation.EVALUATED;

        return (
            `Readings ${total}: NORMAL ${byState.NORMAL}, DEFROST ${byState.DEFROST}, ` +
            `WARNING ${byState.WARNING}, CRITICAL ${byState.CRITICAL}. ` +
            `Alerts not evaluated (pause, monitoring off or late arrival): ${unevaluated}.`
        );
    }

    /** Quotes a cell when it holds a comma, a quote or a line break (RFC 4180). Notes are free text. */
    private csvCell(value: Cell): string {
        if (value === null) return '';

        const text = String(value);

        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    /** The code goes into a header: keep it to characters that are safe there. */
    private filename<Row>(
        source: ReportSource<Row>,
        device: ReportDevice,
        days: ReportDays,
        extension: 'csv' | 'xlsx',
    ): string {
        const code = device.code.replace(/[^A-Za-z0-9_-]/g, '_');

        return `${source.filenamePrefix}-${code}-${days.from}_${days.to}.${extension}`;
    }
}
