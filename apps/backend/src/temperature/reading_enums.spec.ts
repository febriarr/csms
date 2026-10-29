import { readingEvaluationEnum, temperatureStateEnum } from '@/database/schema/enums';
import { READING_EVALUATIONS, TEMPERATURE_STATES } from '@workspace/validator';

/** The validator package copies the enum values on purpose (the browser must not import the database package). */
describe('shared enums stay in sync with the database enums', () => {
    it('should have the same temperature states', () => {
        expect([...TEMPERATURE_STATES]).toEqual([...temperatureStateEnum.enumValues]);
    });

    it('should have the same reading evaluations', () => {
        expect([...READING_EVALUATIONS]).toEqual([...readingEvaluationEnum.enumValues]);
    });
});
