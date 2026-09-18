import { AlertReason, SelectDevices } from '../../database';
import { formatDateTime } from '../../middleware/view-helper';

export function buildAlertReason(
  reasonCode: AlertReason,
  context: { temperature: number; device: SelectDevices }
): string {
  const { temperature, device } = context;

  switch (reasonCode) {
    case 'DEFROST_DETECTED':
      return `Temperature ${temperature}°C entered defrost range (${device.defrostThreshold}°C to ${device.warningThreshold}°C).`;
    case 'WARNING_TEMPERATURE':
      return `Temperature ${temperature}°C exceeded warning threshold (${device.warningThreshold}°C to ${device.criticalThreshold}°C).`;
    case 'CRITICAL_TEMPERATURE':
      return `Temperature ${temperature}°C exceeded critical threshold (above ${device.criticalThreshold}°C).`;
    case 'TEMPERATURE_RECOVERED':
      return `Temperature ${temperature}°C returned to normal range (up to ${device.defrostThreshold}°C).`;
    case 'DEVICE_OFFLINE':
      return `Device stopped sending data. Last seen at ${formatDateTime(device.lastSeenAt)}.`;
    case 'DEVICE_RECOVERED':
      return `Device resumed sending data.`;
  }
}
