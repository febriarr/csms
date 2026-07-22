export const TemperatureState = {
  NORMAL: 'NORMAL',
  DEFROST: 'DEFROST',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;

export type TemperatureState = (typeof TemperatureState)[keyof typeof TemperatureState];
