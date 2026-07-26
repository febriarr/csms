import { AlertReason, SelectDevices } from '../../database';

export function buildAlertReason(
  reasonCode: AlertReason,
  context: { temperature: number; device: SelectDevices }
): string {
  const { temperature, device } = context;

  switch (reasonCode) {
    case 'DEFROST_DETECTED':
      return `Temperature ${temperature}°C entered defrost range (${device.defrostMinTemperature}°C to ${device.defrostMaxTemperature}°C).`;
    case 'WARNING_TEMPERATURE':
      return `Temperature ${temperature}°C exceeded warning threshold (${device.warningMinTemperature}°C to ${device.warningMaxTemperature}°C).`;
    case 'CRITICAL_TEMPERATURE':
      return `Temperature ${temperature}°C exceeded critical threshold (above ${device.criticalMinTemperature}°C).`;
    case 'TEMPERATURE_RECOVERED':
      return `Temperature ${temperature}°C returned to normal range (${device.normalMinTemperature}°C to ${device.normalMaxTemperature}°C).`;
    case 'DEVICE_OFFLINE':
      return `Device stopped sending data. Last seen at ${device.lastSeenAt?.toISOString() ?? 'unknown'}.`;
    case 'DEVICE_RECOVERED':
      return `Device resumed sending data.`;
  }
}
