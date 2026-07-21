import { TEMPERATURE_STATES, type TemperatureStateConfig } from './temperature-state';

export function getTemperatureState(temperature: number): TemperatureStateConfig {
  const state = TEMPERATURE_STATES.find(({ min, max }) => {
    const aboveMin = min === undefined || temperature > min;
    const belowMax = max === undefined || temperature <= max;

    return aboveMin && belowMax;
  });

  if (!state) {
    throw new Error(`Temperature ${temperature} is outside configured ranges.`);
  }

  return state;
}
