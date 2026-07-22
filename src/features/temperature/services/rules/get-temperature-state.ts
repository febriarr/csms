import { RuleDevice } from './rule-types';
import { TemperatureState } from './temperature-state';

export function getTemperatureState(device: RuleDevice, temperature: number): TemperatureState {
  if (temperature >= device.normalMinTemperature && temperature <= device.normalMaxTemperature) {
    return TemperatureState.NORMAL;
  }

  if (temperature >= device.defrostMinTemperature && temperature <= device.defrostMaxTemperature) {
    return TemperatureState.DEFROST;
  }

  if (temperature >= device.warningMinTemperature && temperature <= device.warningMaxTemperature) {
    return TemperatureState.WARNING;
  }

  if (temperature >= device.criticalMinTemperature) {
    return TemperatureState.CRITICAL;
  }

  throw new Error(`Temperature ${temperature} does not match any configured threshold.`);
}
