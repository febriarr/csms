import { SelectTemperature } from '../../database';
import { NotFoundError } from '../../shared/errors';
import { DevicesRepository } from '../devices/devices.repository';
import { TemperatureRepository } from './temperature.repository';
import { ResponseTemperatureDTO } from './temperature.response.dto';
import { CreateTemperatureDto } from './temperature.validator';

export class TemperatureServices {
  constructor(
    private readonly repo: TemperatureRepository,
    private readonly deviceRepository: DevicesRepository
  ) {}

  // cuma untuk testing
  async create(input: CreateTemperatureDto): Promise<ResponseTemperatureDTO> {
    const device = await this.deviceRepository.findByCode(input.deviceCode);
    if (!device) {
      throw new NotFoundError(`device with code ${input.deviceCode} Not Found.`);
    }
    const data = await this.repo.create({
      ...input,
      deviceId: device.id,
      recordedAt: new Date(input.timestamp),
      receivedAt: new Date(),
    });

    return this.toResponse(data);
  }

  private toResponse(data: SelectTemperature): ResponseTemperatureDTO {
    return new ResponseTemperatureDTO({
      id: data.id,
      deviceId: data.deviceId,
      temperature: data.temperature,
      recordedAt: data.recordedAt,
      receivedAt: data.receivedAt,
    });
  }
}
