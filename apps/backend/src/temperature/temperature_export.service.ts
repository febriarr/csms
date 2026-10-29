import { formatDateTime } from '@/common/utils/format_date_time';
import { Injectable, StreamableFile } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PassThrough, Readable } from 'node:stream';
import type { ReportDays, ReportDevice, TemperatureReportRow, TemperatureReportSummary } from '@workspace/shared';
import { TemperatureReportService } from './temperature_report.service';
import { ReportUtils } from './temperature_report.utils';

const CSV_TYPE = 'text/csv; charset=utf-8';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const READINGS_HEADER = ['No', 'Time', 'Temperature (°C)', 'Status', 'Note'] as const;
const EVENTS_HEADER = ['Time', 'Type', 'Detail', 'Temperature (°C)'] as const;

/**
 * Builds the downloadable report. Both formats are produced as a stream, chunk by chunk, so a month of readings
 * (tens of thousands of rows) never sits in memory as one big array. What goes into the rows (status, note,
 * events) is decided by TemperatureReportService; this class only writes it down.
 */
@Injectable()
export class TemperatureExportService {
    constructor(private readonly reports: TemperatureReportService) {}

    /**
     * Plain CSV with a byte order mark, so Excel opens the "°C" correctly. No title rows and no second sheet: it is
     * meant for tools, one header and one line per reading.
     */
    csv(device: ReportDevice, days: ReportDays): StreamableFile {
        const source = this.csvChunks(device, days);

        return new StreamableFile(Readable.from(source), {
            type: CSV_TYPE,
            disposition: `attachment; filename="${this.filename(device, days, 'csv')}"`,
        });
    }

    /**
     * Sheet "Temperature": title, period, a one-line summary, then every reading with its status and note.
     * Sheet "Events": the alerts and planned pauses of the period in time order.
     */
    xlsx(device: ReportDevice, days: ReportDays): StreamableFile {
        const stream = new PassThrough();
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: false, useSharedStrings: false });

        // runs while the response is being sent; a failure ends the stream with an error instead of a half file
        void (async () => {
            try {
                // read before the first byte is written: a failure here must not leave a half-written header
                const [summary, events] = await Promise.all([
                    this.reports.findSummary(device, days),
                    this.reports.findEvents(device, days),
                ]);

                const readings = workbook.addWorksheet('Temperature');

                readings.addRow([`Temperature report ${device.name} (${device.code})`]).commit();
                readings.addRow([`Period ${days.from} to ${days.to}`]).commit();
                readings.addRow([this.summaryLine(summary)]).commit();
                readings.addRow([]).commit();
                readings.addRow([...READINGS_HEADER]).commit();

                let no = 0;

                for await (const rows of this.reports.streamRows(device, days)) {
                    for (const row of rows) {
                        readings.addRow([++no, ...this.readingCells(row)]).commit();
                    }
                }

                readings.commit();

                const eventSheet = workbook.addWorksheet('Events');

                eventSheet.addRow([...EVENTS_HEADER]).commit();

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
            disposition: `attachment; filename="${this.filename(device, days, 'xlsx')}"`,
        });
    }

    private async *csvChunks(device: ReportDevice, days: ReportDays): AsyncGenerator<string> {
        /** Byte order mark: makes Excel read the CSV as UTF-8, so "°C" shows correctly. Written as an escape on purpose. */
        const BOM = '\uFEFF';
        yield `${BOM}${READINGS_HEADER.map((name) => this.csvCell(name)).join(',')}\n`;

        let no = 0;

        for await (const rows of this.reports.streamRows(device, days)) {
            yield rows
                .map((row) => [++no, ...this.readingCells(row)].map((cell) => this.csvCell(cell)).join(','))
                .join('\n') + '\n';
        }
    }

    /** Time, temperature, status, note: the same four cells in both formats. */
    private readingCells(row: TemperatureReportRow): [string, number, string, string] {
        return [formatDateTime(row.recordedAt), row.temperature, row.state, row.note ?? ''];
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
    private csvCell(value: string | number): string {
        const text = String(value);

        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    /** The code goes into a header: keep it to characters that are safe there. */
    private filename(device: ReportDevice, days: ReportDays, extension: 'csv' | 'xlsx'): string {
        const code = device.code.replace(/[^A-Za-z0-9_-]/g, '_');

        return `temperature-report-${code}-${days.from}_${days.to}.${extension}`;
    }
}
