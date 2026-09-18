import { SelectDevices } from '../../../database';
import { TemperatureState } from './temperature-state';

type DeviceThreshold = Pick<SelectDevices, 'defrostThreshold' | 'warningThreshold' | 'criticalThreshold'>;

export function getTemperatureState(device: DeviceThreshold, temperature: number): TemperatureState {
  if (temperature >= device.criticalThreshold!) {
    return TemperatureState.CRITICAL;
  }
  if (temperature >= device.warningThreshold!) {
    return TemperatureState.WARNING;
  }
  if (temperature >= device.defrostThreshold!) {
    return TemperatureState.DEFROST;
  }
  return TemperatureState.NORMAL;
}
