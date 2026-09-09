import { getTodayDateStringInAppTimezone } from '../../shared/constants/timezone';
import { TypedRequest } from '../../types/typed-request';
import { DeviceDiagnosticsLogsService } from './device-diagnostics-logs.service';
import { Response } from 'express';

type DiagnosticsReportRawQuery = {
  deviceId?: string;
  from?: string;
  to?: string;
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
}
