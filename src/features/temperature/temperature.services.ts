import { SelectTemperature } from '../../database';
import { NotFoundError } from '../../shared/errors';
import { buildAlertReason } from '../../shared/utils/buildReason';
import { getAlertReason } from '../../shared/utils/getAlertReason';
import { AlertsRepository } from '../alerts/alerts.repository';
import { DevicesRepository } from '../devices/devices.repository';
import { getTemperatureState } from './rules/get-temperature-state';
import { TemperatureRepository } from './temperature.repository';
import { ResponseTemperatureDTO } from './temperature.response.dto';
import { CreateTemperatureDto } from './temperature.validator';

export class TemperatureService {
  constructor(
    private readonly repo: TemperatureRepository,
    private readonly deviceRepository: DevicesRepository,
    private readonly alertRepository: AlertsRepository
  ) {}

  // testing doang
  async create(input: CreateTemperatureDto): Promise<ResponseTemperatureDTO> {
    const device = await this.deviceRepository.findByCode(input.deviceCode);
    if (!device) {
      throw new NotFoundError(`Device with code ${input.deviceCode} not found.`);
    }

    const data = await this.repo.create({
      ...input,
      deviceId: device.id,
      recordedAt: new Date(input.timestamp),
      receivedAt: new Date(),
    });

    await this.deviceRepository.updateLastSeen(device.id);

    const newState = getTemperatureState(device, input.temperature);

    if (newState !== device.state) {
      const reasonCode = getAlertReason(device.state, newState);
      const reason = buildAlertReason(reasonCode, {
        temperature: input.temperature,
        device,
      });

      await this.deviceRepository.updateState(device.id, newState);

      await this.alertRepository.create({
        deviceId: device.id,
        fromState: device.state,
        toState: newState,
        reasonCode,
        reason,
        occurredAt: data.recordedAt,
      });

      if (newState === 'WARNING' || newState === 'CRITICAL') {
        // TODO: kirim ke notification channel beneran + insert ke notification_logs
        console.log(`Temperature entered ${newState}: ${reason}`);
      }
    }

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
