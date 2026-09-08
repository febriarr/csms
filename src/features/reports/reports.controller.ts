import type { Response } from 'express';
import { TypedRequest } from '../../types/typed-request';
import { DevicesService } from '../devices/devices.service';
import { ReportsService } from './reports.service';

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
}
