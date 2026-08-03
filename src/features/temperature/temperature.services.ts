import { SelectTemperature } from '../../database';
import { NotFoundError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { buildAlertReason } from '../../shared/utils/buildReason';
import { getAlertReason } from '../../shared/utils/getAlertReason';
import { whatsappQueue } from '../../shared/whatsapp/whatsapp.queue';
import { toWhatsAppJid } from '../../shared/whatsapp/whatsapp.utils';
import { deviceEventBus } from '../../sse/device-events';
import { AlertsRepository } from '../alerts/alerts.repository';
import { DevicesRepository } from '../devices/devices.repository';
import { NotificationsRecipientsRepository } from '../notifications-recipients/notifications-recipients.repository';
import { getTemperatureState } from './rules/get-temperature-state';
import { TemperatureRepository } from './temperature.repository';
import { ResponseTemperatureDTO } from './temperature.response.dto';
import { CreateTemperatureDto } from './temperature.validator';

type PendingWhatsAppAlert = {
  message: string;
  severity: 'WARNING' | 'CRITICAL';
  recipients: string[];
};
export class TemperatureService {
  constructor(
    private readonly repo: TemperatureRepository,
    private readonly deviceRepository: DevicesRepository,
    private readonly alertRepository: AlertsRepository,
    private readonly notificationRecipientsRepository: NotificationsRecipientsRepository
  ) {}

  // testing doang
  async create(input: CreateTemperatureDto): Promise<ResponseTemperatureDTO> {
    const { responseData, pendingAlert } = await this.repo.withTransaction(async tx => {
      const device = await this.deviceRepository.findByCode(input.deviceCode);
      if (!device) {
        throw new NotFoundError(`Device with code ${input.deviceCode} not found.`);
      }

      const data = await this.repo.create(
        {
          ...input,
          deviceId: device.id,
          recordedAt: new Date(input.timestamp),
          receivedAt: new Date(),
        },
        tx
      );

      const updatedDevice = await this.deviceRepository.updateLastSeen(device.id, tx);

      const newState = getTemperatureState(device, input.temperature);

      let finalDevice = updatedDevice;
      let alert: PendingWhatsAppAlert | null = null;

      if (newState !== device.state) {
        const reasonCode = getAlertReason(device.state, newState);
        const reason = buildAlertReason(reasonCode, {
          temperature: input.temperature,
          device,
        });

        finalDevice = await this.deviceRepository.updateState(device.id, newState, tx);

        await this.alertRepository.create(
          {
            deviceId: device.id,
            fromState: device.state,
            toState: newState,
            reasonCode,
            reason,
            occurredAt: data.recordedAt,
          },
          tx
        );

        if (newState === 'WARNING' || newState === 'CRITICAL') {
          const recipients = await this.notificationRecipientsRepository.findActiveByChannel('whatsapp', tx);

          if (recipients.length > 0) {
            alert = {
              message: this.buildAlertMessage(device.name, device.code, newState, input.temperature, reason),
              severity: newState,
              recipients: recipients.map(r => toWhatsAppJid(r.target)),
            };
          } else {
            logger.warn('Tidak ada recipient WhatsApp aktif terdaftar');
          }
        }
      }

      deviceEventBus.broadcast('device-update', {
        id: finalDevice?.id,
        code: finalDevice?.code,
        name: finalDevice?.name,
        location: finalDevice?.location,
        state: finalDevice?.state,
        isActive: finalDevice?.isActive,
        lastTemperature: input.temperature,
        lastSeenAt: finalDevice?.lastSeenAt,
        stateChangedAt: finalDevice?.stateChangedAt,
      });

      return { responseData: this.toResponse(data), pendingAlert: alert };
    });

    // transaksi sudah commit sukses di titik ini -> baru aman untuk enqueue
    if (pendingAlert) {
      await whatsappQueue.add('bulk-alert', pendingAlert, {
        priority: pendingAlert.severity === 'CRITICAL' ? 1 : 5, // critical diproses lebih dulu
      });
    }

    return responseData;
  }

  private buildAlertMessage(
    deviceName: string,
    deviceCode: string,
    state: 'WARNING' | 'CRITICAL',
    temp: number,
    reason: string
  ): string {
    const emoji = state === 'CRITICAL' ? '🚨' : '⚠️';
    return `${emoji} *${state}*\nDevice: *${deviceName}*\nCode: *${deviceCode}*\nTemperature: *${temp}°C*\nReason: ${reason}\nTimestamp: ${new Date().toLocaleString('id-ID')}`;
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
