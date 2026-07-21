import { RuleDevice, RuleTemperature } from './rule-types';

export interface RuleContext {
  device: RuleDevice;
  current: RuleTemperature;
}
