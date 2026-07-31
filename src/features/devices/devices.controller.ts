import type { Request, Response } from 'express';
import { DevicesService } from './devices.service';
import { TypedRequest } from '../../types/typed-request';
import { CreateDeviceInput } from './devices.validator';
import { successResponse } from '../../shared/reponse/success-response';

export class DeviceController {
  constructor(private readonly devicesService: DevicesService) {}

  create = async (req: TypedRequest<CreateDeviceInput>, res: Response) => {
    const data = await this.devicesService.createrDevices(req.body);

    return successResponse(res, {
      data,
    });
  };

  renderStatusPage = async (_req: Request, res: Response) => {
    const devices = await this.devicesService.renderStatusPage();

    res.render('status', {
      title: 'Status',
      devices,
      pageScripts: ['/js/device-status.js'],
    });
  };

  findDeviceByIdWithAlert = async (req: Request, res: Response) => {
    const { deviceId } = req.params;
    const device = await this.devicesService.findDeviceByIdWithAlerts(deviceId as string);

    if (!device) {
      return res.render('partials/device-alert-list', {
        alerts: [],
        error: 'Device tidak ditemukan.',
        layout: false,
      });
    }

    res.render('partials/device-alert-list', {
      alerts: device.alerts,
      error: null,
      layout: false,
    });
  };

  deleteDevice = async (req: Request, res: Response) => {
    const { id } = req.params;

    const data = await this.devicesService.delete(id as string);

    return successResponse(res, {
      data,
    });
  };
}
