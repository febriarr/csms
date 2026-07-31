import { SelectDevices } from '../../database';
import { BadRequestError, NotFoundError } from '../../shared/errors';
import { DevicesRepository } from './devices.repository';
import { CreateDeviceInput, UpdateDeviceInput } from './devices.validator';

export class DevicesService {
  constructor(private readonly deviceRepository: DevicesRepository) {}

  async createrDevices(input: CreateDeviceInput): Promise<SelectDevices> {
    return this.deviceRepository.create(input);
  }

  async updateDevices(id: string, input: UpdateDeviceInput): Promise<SelectDevices> {
    const devicesUpdate = await this.deviceRepository.updateDevices(id, input);
    if (!devicesUpdate) {
      throw new NotFoundError(`Device with id ${id} not found`);
    }

    return devicesUpdate;
  }

  async renderStatusPage() {
    const rows = await this.deviceRepository.findAllWithLatestTemperature();
    const devices = rows.map(r => ({
      ...r,
      lastTemperature: r.temperatureLogs[0]?.temperature ?? null,
    }));

    return devices;
  }

  async findDeviceByIdWithAlerts(deviceId: string) {
    return this.deviceRepository.findDeviceByIdWithAlert(deviceId);
  }

  async findAll(): Promise<SelectDevices[]> {
    return this.deviceRepository.findAll();
  }

  async delete(id: string): Promise<SelectDevices> {
    const existing = await this.deviceRepository.findById(id);

    if (!existing) {
      throw new NotFoundError('Device tidak ditemukan.');
    }

    if (!existing.isActive) {
      throw new BadRequestError('Device sudah nonaktif.');
    }

    const device = await this.deviceRepository.deleteDevice(id);

    return device!;
  }
}
