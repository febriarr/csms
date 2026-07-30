import type { Request, Response } from 'express';
import { devicesService } from '../container';

class DashboardController {
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

  public index = (req: Request, res: Response): void => {
    this.renderDashboard(
      req,
      res,
      'dashboard/index',
      '/dashboard',
      'Dashboard',
      'Ringkasan panel administrasi yang responsif.'
    );
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

  public devices = async (req: Request, res: Response) => {
    const devices = await devicesService.findAll();

    res.render('dashboard/devices', {
      title: 'Device Management',
      layout: 'layouts/dashboard',
      pageTitle: 'Devices',
      currentPath: '/dashboard/devices',
      pageDescription: 'Manage devices anda.',
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
      pageScripts: ['/js/create-device.js'],
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

export default new DashboardController();
