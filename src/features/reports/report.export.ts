import ExcelJS from 'exceljs';
import type { SelectTemperature } from '../../database';

function toRow(log: SelectTemperature) {
  return {
    date: log.recordedAt.toLocaleDateString('id-ID'),
    time: log.recordedAt.toLocaleTimeString('id-ID'),
    temperature: log.temperature,
  };
}

export function buildTemperatureCsv(logs: SelectTemperature[]): string {
  const escape = (value: unknown) => {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = ['Tanggal', 'Waktu', 'Suhu (°C)'];
  const lines = logs.map(log => {
    const r = toRow(log);
    return [r.date, r.time, r.temperature].map(escape).join(',');
  });

  return [header.join(','), ...lines].join('\n');
}

export async function buildTemperatureExcelBuffer(
  logs: SelectTemperature[],
  meta: { deviceName: string; from: string; to: string }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Laporan Suhu');

  // Info header di baris pertama, sebelum tabel data
  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = `Device: ${meta.deviceName}`;
  sheet.mergeCells('A2:C2');
  sheet.getCell('A2').value = `Periode: ${meta.from} s/d ${meta.to}`;
  sheet.addRow([]); // baris kosong pemisah

  const headerRowIndex = 4;
  sheet.getRow(headerRowIndex).values = ['Tanggal', 'Waktu', 'Suhu (°C)'];
  sheet.getRow(headerRowIndex).font = { bold: true };
  sheet.columns = [{ width: 15 }, { width: 12 }, { width: 14 }];

  logs.forEach(log => {
    const r = toRow(log);
    sheet.addRow([r.date, r.time, r.temperature]);
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
