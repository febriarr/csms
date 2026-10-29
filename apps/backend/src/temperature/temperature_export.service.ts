import { dayRangeInAppTimezone } from '@/common/utils/app_timezone';
import { formatDateTime } from '@/common/utils/format_date_time';
import { Injectable, StreamableFile } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PassThrough, Readable } from 'node:stream';
import { TemperatureRepository } from './temperature.repository';
import type { ReportDays, ReportDevice, TemperatureReading } from '@workspace/shared';

const CSV_TYPE = 'text/csv; charset=utf-8';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Builds the downloadable report. Both formats are produced as a stream, chunk by chunk, so a month of readings
 * (tens of thousands of rows) never sits in memory as one big array.
 */
@Injectable()
export class TemperatureExportService {
    constructor(private readonly temperatures: TemperatureRepository) {}

    /** Plain CSV with a byte order mark, so Excel opens the "°C" correctly. No title rows: it is meant for tools. */
    csv(device: ReportDevice, days: ReportDays): StreamableFile {
        const source = this.csvChunks(device, days);

        return new StreamableFile(Readable.from(source), {
            type: CSV_TYPE,
            disposition: `attachment; filename="${this.filename(device, days, 'csv')}"`,
        });
    }

    xlsx(device: ReportDevice, days: ReportDays): StreamableFile {
        const stream = new PassThrough();
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: false, useSharedStrings: false });
        const sheet = workbook.addWorksheet('Suhu');

        sheet.addRow([`Laporan suhu ${device.name} (${device.code})`]).commit();
        sheet.addRow([`Periode ${days.from} s/d ${days.to}`]).commit();
        sheet.addRow([]).commit();
        sheet.addRow(['No', 'Waktu', 'Suhu (°C)']).commit();

        // runs while the response is being sent; a failure ends the stream with an error instead of a half file
        void (async () => {
            try {
                let no = 0;

                for await (const rows of this.readings(device, days)) {
                    for (const row of rows) {
                        sheet.addRow([++no, formatDateTime(row.recordedAt), row.temperature]).commit();
                    }
                }

                sheet.commit();
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
        yield '\uFEFFNo,Waktu,Suhu (°C)\n';

        let no = 0;

        for await (const rows of this.readings(device, days)) {
            yield rows.map((row) => `${++no},${formatDateTime(row.recordedAt)},${row.temperature}`).join('\n') + '\n';
        }
    }

    private readings(device: ReportDevice, days: ReportDays): AsyncGenerator<TemperatureReading[]> {
        return this.temperatures.iterateRange(device.id, dayRangeInAppTimezone(days.from, days.to));
    }

    /** The code goes into a header: keep it to characters that are safe there. */
    private filename(device: ReportDevice, days: ReportDays, extension: 'csv' | 'xlsx'): string {
        const code = device.code.replace(/[^A-Za-z0-9_-]/g, '_');

        return `laporan-suhu-${code}-${days.from}_${days.to}.${extension}`;
    }
}
