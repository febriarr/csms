import type { TemperatureRule } from './temperature-rule';
import type { RuleContext } from './rule-context';
import type { RuleResult } from './rule-result';

import { getTemperatureState } from './get-temperature-state';
import { TemperatureState } from './temperature-state';

export class ThresholdRule implements TemperatureRule {
  async evaluate(context: RuleContext): Promise<RuleResult | null> {
    const state = getTemperatureState(context.device, context.current.temperature);

    if (state === TemperatureState.NORMAL) {
      return null;
    }

    return {
      state,
      message: `Temperature entered ${state} state.`,
    };
  }
}
