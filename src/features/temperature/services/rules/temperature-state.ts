export const TemperatureState = {
  NORMAL: 'NORMAL',
  DEFROST: 'DEFROST',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;

export type TemperatureState = (typeof TemperatureState)[keyof typeof TemperatureState];

export interface TemperatureStateConfig {
  state: TemperatureState;

  min?: number;
  max?: number;

  message: string;

  /**
   * Semakin besar semakin prioritas.
   */
  severity: number;
}

export const TEMPERATURE_STATES: readonly TemperatureStateConfig[] = [
  {
    state: TemperatureState.NORMAL,
    min: -25,
    max: -18,
    message: 'Temperature is within the normal operating range.',
    severity: 0,
  },
  {
    state: TemperatureState.DEFROST,
    min: -18,
    max: -15,
    message: 'Temperature entered the defrost range.',
    severity: 1,
  },
  {
    state: TemperatureState.WARNING,
    min: -15,
    max: -12,
    message: 'Temperature entered the warning range.',
    severity: 2,
  },
  {
    state: TemperatureState.CRITICAL,
    min: -12,
    message: 'Critical temperature detected.',
    severity: 3,
  },
] as const;
