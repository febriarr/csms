import type { Request, Response } from 'express';
import { TypedRequest } from '../types/typed-request';
import { SearchQuery } from '../features/devices/devices.validator';
import { DevicesService } from '../features/devices/devices.service';
import { DeviceDiagnosticsLogsService } from '../features/device-diagnostic-logs/device-diagnostics-logs.service';

export class DashboardController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly diagnosticsService: DeviceDiagnosticsLogsService
  ) {}

  private renderDashboard(
    req: Request,
    res: Response,
    page: string,
    path: string,
    title: string,
    description: string
  ): void {
    res.render(page, {
      title,
      layout: 'layouts/dashboard',
      currentPath: path,
      pageTitle: title,
      pageDescription: description,
    });
  }

  public index = async (req: Request, res: Response): Promise<void> => {
    const diagnosticsToday = await this.diagnosticsService.getDiagnosticsSummaryToday();

    res.render('dashboard/overview', {
      title: 'Overview',
      layout: 'layouts/dashboard',
      currentPath: '/dashboard',
      pageTitle: 'Overview',
      pageDescription: 'Ringkasan panel administrasi yang responsif.',
      diagnosticsToday,
    });
  };

  public users = (req: Request, res: Response): void => {
    this.renderDashboard(
      req,
      res,
      'dashboard/index',
      '/dashboard/users',
      'Users',
      'Kelola pengguna aplikasi dari panel ini.'
    );
  };

  public devices = async (req: TypedRequest<unknown, SearchQuery>, res: Response) => {
    const { search } = req.query;
    const devices = await this.devicesService.findAll(search);

    res.render('dashboard/devices', {
      title: 'Device Management',
      layout: 'layouts/dashboard',
      pageTitle: 'Devices',
      currentPath: '/dashboard/devices',
      pageDescription: 'Manage devices anda.',
      pageScripts: ['/js/devices.js'],
      currentSearch: search,
      devices,
    });
  };

  public createDevice = async (req: Request, res: Response) => {
    res.render('dashboard/create-device', {
      title: 'Form Create Device',
      layout: 'layouts/dashboard',
      pageTitle: 'Form Create Device',
      currentPath: '/dashboard/devices',
      pageDescription: 'Isi input dibawah ini',
      pageScripts: ['/js/devices.js'],
    });
  };

  public updateDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = await this.devicesService.findById(id as string);

    res.render('dashboard/update-device', {
      title: 'Form Update Device',
      layout: 'layouts/dashboard',
      pageTitle: 'Form Update Device',
      currentPath: '/dashboard/devices',
      pageDescription: 'Isi input dibawah ini',
      data: data,
      pageScripts: ['/js/update-device.js'],
    });
  };

  public notificationLogs = (req: Request, res: Response): void => {
    this.renderDashboard(
      req,
      res,
      'dashboard/index',
      '/dashboard/notification-logs',
      'Notification Logs',
      'Lihat riwayat notifikasi yang telah dikirim.'
    );
  };

  public notificationRecipients = (req: Request, res: Response): void => {
    this.renderDashboard(
      req,
      res,
      'dashboard/index',
      '/dashboard/notifications-recipients',
      'Notification Recipients',
      'Kelola penerima notifikasi yang terdaftar.'
    );
  };
}
