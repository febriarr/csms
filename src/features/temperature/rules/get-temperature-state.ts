import { SelectDevices } from '../../../database';
import { TemperatureState } from './temperature-state';

type DeviceThreshold = Pick<
  SelectDevices,
  | 'normalMinTemperature'
  | 'normalMaxTemperature'
  | 'defrostMinTemperature'
  | 'defrostMaxTemperature'
  | 'warningMinTemperature'
  | 'warningMaxTemperature'
  | 'criticalMinTemperature'
>;

export function getTemperatureState(device: DeviceThreshold, temperature: number): TemperatureState {
  if (temperature >= device.criticalMinTemperature) {
    return TemperatureState.CRITICAL;
  }
  if (temperature > device.warningMinTemperature && temperature <= device.warningMaxTemperature) {
    return TemperatureState.WARNING;
  }
  if (temperature > device.defrostMinTemperature && temperature <= device.defrostMaxTemperature) {
    return TemperatureState.DEFROST;
  }
  return TemperatureState.NORMAL;
}
