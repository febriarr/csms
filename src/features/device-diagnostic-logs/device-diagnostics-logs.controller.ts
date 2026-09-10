import { getTodayDateStringInAppTimezone } from '../../shared/constants/timezone';
import { TypedRequest } from '../../types/typed-request';
import { DeviceDiagnosticsLogsService } from './device-diagnostics-logs.service';
import { Response } from 'express';

type DiagnosticsReportRawQuery = {
  deviceId?: string;
  from?: string;
  to?: string;
};

type DiagnosticsDetailRawQuery = {
  deviceId: string;
  from?: string;
  to?: string;
  page?: string;
  pageSize?: string;
};

export class DeviceDiagnosticsLogsController {
  constructor(private readonly service: DeviceDiagnosticsLogsService) {}

  public diagnosticsReport = async (req: TypedRequest<unknown, DiagnosticsReportRawQuery>, res: Response) => {
    const today = getTodayDateStringInAppTimezone();
    const from = req.query.from || today;
    const to = req.query.to || today;
    const { deviceId } = req.query;

    const [summary, trend] = await Promise.all([
      this.service.getDiagnosticsSummary({ from, to }),
      deviceId ? this.service.getDiagnosticsTrend({ deviceId, from, to }) : Promise.resolve(null),
    ]);

    const selectedDevice = deviceId ? summary.find(row => row.deviceId === deviceId) : null;

    res.render('dashboard/reports/diagnostics', {
      title: 'Diagnostics',
      layout: 'layouts/dashboard',
      currentPath: '/dashboard/reports/diagnostics',
      pageTitle: 'Diagnostics',
      pageDescription: 'Pantau jumlah kegagalan sensor, WiFi, dan HTTP tiap device.',
      pageStyles: ['/vendor/apexcharts.css'],
      pageVendor: ['/vendor/apexcharts.min.js'],
      pageScripts: ['/js/diagnostics-report.js'],
      summary,
      trend,
      selectedDevice,
      filters: { deviceId, from, to },
    });
  };

  public diagnosticsDetail = async (req: TypedRequest<unknown, DiagnosticsDetailRawQuery>, res: Response) => {
    const today = getTodayDateStringInAppTimezone();
    const from = req.query.from || today;
    const to = req.query.to || today;
    const { deviceId } = req.query;

    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const { device, logs } = await this.service.getDiagnosticsDetail({
      deviceId,
      from,
      to,
      page,
      pageSize,
    });

    res.render('dashboard/reports/diagnostics-detail', {
      title: `Diagnostics Detail - ${device.name}`,
      layout: 'layouts/dashboard',
      currentPath: '/dashboard/reports/diagnostics',
      pageTitle: `Diagnostics Detail`,
      pageDescription: `Riwayat kejadian sensor/WiFi/HTTP untuk ${device.name} (${device.code}).`,
      device,
      logs,
      filters: { deviceId, from, to },
    });
  };
}
