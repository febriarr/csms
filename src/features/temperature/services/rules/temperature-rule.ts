import { RuleContext } from './rule-context';
import { RuleResult } from './rule-result';

export interface TemperatureRule {
  evaluate(context: RuleContext): Promise<RuleResult | null>;
}
