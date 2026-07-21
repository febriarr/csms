export type TemperatureState = 'NORMAL' | 'DEFROST' | 'WARNING' | 'CRITICAL';

export interface RuleResult {
  state: TemperatureState;

  message: string;
}
