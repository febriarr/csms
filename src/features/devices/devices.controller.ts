import type { Request, Response } from 'express';
import { DevicesService } from './devices.service';

export class DeviceController {
  constructor(private readonly devicesService: DevicesService) {}

  renderStatusPage = async (_req: Request, res: Response) => {
    const devices = await this.devicesService.renderStatusPage();

    res.render('status', {
      title: 'Status',
      devices,
      pageScripts: ['/js/device-status.js'],
    });
  };
}
