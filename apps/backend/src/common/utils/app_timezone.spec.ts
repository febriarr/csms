import { dayRangeInAppTimezone } from './app_timezone';

describe('dayRangeInAppTimezone', () => {
    it('should start at local midnight of the first day', () => {
        const { from } = dayRangeInAppTimezone('2026-10-01', '2026-10-07');

        expect(from).toEqual(new Date('2026-09-30T17:00:00.000Z'));
    });

    it('should end at local midnight after the last day, so the last day is included', () => {
        const { to } = dayRangeInAppTimezone('2026-10-01', '2026-10-07');

        expect(to).toEqual(new Date('2026-10-07T17:00:00.000Z'));
    });
});
