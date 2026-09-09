import type { Response } from 'express';
import { TypedRequest } from '../../types/typed-request';
import { DevicesService } from '../devices/devices.service';
import { ReportsService } from './reports.service';
import { buildTemperatureCsv, buildTemperatureExcelBuffer } from './report.export';
import { TemperatureExportQuery } from './reports.validator';

type TemperatureReportRawQuery = {
  deviceId?: string;
  from?: string;
  to?: string;
  page?: string;
};

export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly devicesService: DevicesService
  ) {}

  public temperatureReport = async (req: TypedRequest<unknown, TemperatureReportRawQuery>, res: Response) => {
    const { deviceId, from, to } = req.query;
    const page = Number(req.query.page) || 1;
    const devices = await this.devicesService.findAll();

    const hasFilter = Boolean(deviceId && from && to);

    const report = hasFilter
      ? await this.reportsService.getTemperatureHistory({ deviceId: deviceId!, from: from!, to: to!, page })
      : null;

    res.render('dashboard/reports/temperature', {
      title: 'Reports',
      layout: 'layouts/dashboard',
      currentPath: '/dashboard/reports/temperature',
      pageTitle: 'Reports',
      pageDescription: 'Pilih device dan rentang tanggal untuk melihat histori suhu.',
      pageScripts: ['/js/temperature-report.js'],
      devices,
      report,
      filters: { deviceId, from, to },
    });
  };

  public exportTemperatureReport = async (req: TypedRequest<unknown, TemperatureExportQuery>, res: Response) => {
    const { deviceId, from, to, format } = req.query;

    const device = await this.devicesService.findById(deviceId);
    if (!device) {
      return res.status(404).json({ message: 'Device tidak ditemukan' });
    }

    const logs = await this.reportsService.getTemperatureHistoryForExport({ deviceId, from, to });
    const filename = `laporan-suhu-${device.name}-${from}_${to}`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(buildTemperatureCsv(logs));
    }

    const buffer = await buildTemperatureExcelBuffer(logs, { deviceName: device.name, from, to });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    return res.send(buffer);
  };
}
