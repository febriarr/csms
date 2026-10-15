import { formatDate, formatDateTime } from './format_date_time';

describe('formatDate / formatDateTime (Asia/Jakarta, DD-MON-YYYY)', () => {
    it('should format a date as DD-MON-YYYY in upper case', () => {
        expect(formatDate(new Date('2026-10-15T05:00:00.000Z'))).toBe('15-OCT-2026');
    });

    it('should add the 24-hour time for formatDateTime', () => {
        expect(formatDateTime(new Date('2026-10-14T20:00:00.000Z'))).toBe('15-OCT-2026 03:00:00');
        expect(formatDateTime(new Date('2026-10-15T09:05:07.000Z'))).toBe('15-OCT-2026 16:05:07');
    });

    it('should use the Jakarta calendar day, not the UTC one', () => {
        // 20:00 UTC is already tomorrow in Jakarta (UTC+7)
        expect(formatDate(new Date('2026-10-14T20:00:00.000Z'))).toBe('15-OCT-2026');
        expect(formatDate(new Date('2026-10-14T16:59:59.000Z'))).toBe('14-OCT-2026');
    });

    it('should print midnight as 00, never 24', () => {
        expect(formatDateTime(new Date('2025-12-31T17:00:00.000Z'))).toBe('01-JAN-2026 00:00:00');
    });

    it('should zero-pad the day', () => {
        expect(formatDate(new Date('2026-10-05T05:00:00.000Z'))).toBe('05-OCT-2026');
    });

    it('should give a three-letter month for all twelve months (including SEP)', () => {
        const expected = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

        expected.forEach((month, index) => {
            expect(formatDate(new Date(Date.UTC(2026, index, 15, 5)))).toBe(`15-${month}-2026`);
        });
    });

    it('should accept ISO strings and epoch milliseconds', () => {
        expect(formatDate('2026-10-15T05:00:00.000Z')).toBe('15-OCT-2026');
        expect(formatDate(Date.UTC(2026, 9, 15, 5))).toBe('15-OCT-2026');
    });

    it('should return "-" for missing or invalid dates', () => {
        expect(formatDate(null)).toBe('-');
        expect(formatDate(undefined)).toBe('-');
        expect(formatDate('bukan tanggal')).toBe('-');
        expect(formatDateTime(new Date('invalid'))).toBe('-');
    });
});
