import type { RuleContext } from './rule-context';
import type { RuleResult } from './rule-result';
import type { TemperatureRule } from './temperature-rule';

export class RuleEngine {
  constructor(private readonly rules: TemperatureRule[]) {}

  async evaluate(context: RuleContext): Promise<RuleResult[]> {
    const results: RuleResult[] = [];

    for (const rule of this.rules) {
      const result = await rule.evaluate(context);

      if (result) {
        results.push(result);
      }
    }

    return results;
  }
}
