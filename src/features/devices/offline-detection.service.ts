import { SelectDevices } from '../../database';
import { NOTIFICATION_RECIPIENTS_CHANNEL } from '../../shared/constants';
import { logger } from '../../shared/logger';
import { buildAlertReason } from '../../shared/utils/buildReason';
import { getAlertReason } from '../../shared/utils/getAlertReason';
import { whatsappQueue } from '../../shared/whatsapp/whatsapp.queue';
import { toWhatsAppJid } from '../../shared/whatsapp/whatsapp.utils';
import { deviceEventBus } from '../../sse/device-events';
import { AlertsRepository } from '../alerts/alerts.repository';
import { NotificationsRecipientsRepository } from '../notifications-recipients/notifications-recipients.repository';
import { DevicesRepository } from './devices.repository';

type PendingWhatsAppAlert = {
  message: string;
  severity: 'OFFLINE';
  recipients: string[];
};

/**
 * Periodically-invoked business logic that flips stale devices to OFFLINE.
 * Mirrors the state-transition -> alert -> queue pattern already used by
 * TemperatureService, so the two code paths stay easy to compare.
 */
export class OfflineDetectionService {
  constructor(
    private readonly deviceRepository: DevicesRepository,
    private readonly alertRepository: AlertsRepository,
    private readonly notificationRecipientsRepository: NotificationsRecipientsRepository
  ) {}

  async run(): Promise<void> {
    const staleDevices = await this.deviceRepository.findStaleDevices();

    if (staleDevices.length === 0) return;

    logger.info({ count: staleDevices.length }, 'Marking stale devices as OFFLINE');

    for (const device of staleDevices) {
      try {
        await this.markOffline(device);
      } catch (err) {
        logger.error({ err, deviceId: device.id }, 'Failed to mark device offline');
      }
    }
  }

  private async markOffline(device: SelectDevices): Promise<void> {
    const { finalDevice, pendingAlert } = await this.deviceRepository.withTransaction(async tx => {
      const reasonCode = getAlertReason(device.state, 'OFFLINE');
      // `temperature` is unused for the DEVICE_OFFLINE branch of buildAlertReason.
      const reason = buildAlertReason(reasonCode, { temperature: 0, device });

      const updatedDevice = await this.deviceRepository.updateState(device.id, 'OFFLINE', tx);

      await this.alertRepository.create(
        {
          deviceId: device.id,
          fromState: device.state,
          toState: 'OFFLINE',
          reasonCode,
          reason,
          occurredAt: new Date(),
        },
        tx
      );

      const recipients = await this.notificationRecipientsRepository.findActiveByChannel(
        NOTIFICATION_RECIPIENTS_CHANNEL.WHATSAPP,
        tx
      );

      let alert: PendingWhatsAppAlert | null = null;
      if (recipients.length > 0) {
        alert = {
          message: this.buildOfflineMessage(device.name, device.code, device.lastSeenAt),
          severity: 'OFFLINE',
          recipients: recipients.map(r => toWhatsAppJid(r.target)),
        };
      } else {
        logger.warn('No active WhatsApp recipients registered for offline alert');
      }

      return { finalDevice: updatedDevice, pendingAlert: alert };
    });

    deviceEventBus.broadcast('device-update', {
      id: finalDevice?.id,
      code: finalDevice?.code,
      name: finalDevice?.name,
      location: finalDevice?.location,
      state: finalDevice?.state,
      isActive: finalDevice?.isActive,
      lastSeenAt: finalDevice?.lastSeenAt,
      stateChangedAt: finalDevice?.stateChangedAt,
      // no lastTemperature here on purpose — this event isn't triggered by a new reading
    });

    if (pendingAlert) {
      // Highest priority: a silent device is at least as urgent as a CRITICAL reading.
      await whatsappQueue.add('bulk-alert', pendingAlert, { priority: 1 });
    }
  }

  private buildOfflineMessage(deviceName: string, deviceCode: string, lastSeenAt: Date | null): string {
    return `🔌 *OFFLINE*\nDevice: *${deviceName}*\nCode: *${deviceCode}*\nLast seen: ${
      lastSeenAt ? lastSeenAt.toLocaleString('id-ID') : 'unknown'
    }\nDetected: ${new Date().toLocaleString('id-ID')}`;
  }
}
