/**
 * The operating time zone of the plant. WIB (Asia/Jakarta, UTC+7) has no daylight saving, so a fixed offset is
 * exact and no time zone library is needed. If devices ever run in WITA or WIT, change both constants together.
 */
export const APP_TIMEZONE = 'Asia/Jakarta';
export const APP_UTC_OFFSET = '+07:00';

const MS_PER_DAY = 86_400_000;

/**
 * Turns an inclusive pair of calendar dates (YYYY-MM-DD, as users pick them) into a half-open instant range
 * `[from, to)`: midnight WIB of `from` up to, but not including, midnight WIB of the day after `to`.
 * A half-open range has no "23:59:59.999" edge case and never double counts a boundary reading.
 */
export function dayRangeInAppTimezone(from: string, to: string): { from: Date; to: Date } {
    const start = new Date(`${from}T00:00:00.000${APP_UTC_OFFSET}`);
    const end = new Date(new Date(`${to}T00:00:00.000${APP_UTC_OFFSET}`).getTime() + MS_PER_DAY);

    return { from: start, to: end };
}

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/** Today's calendar date in WIB as YYYY-MM-DD. */
export function todayInAppTimezone(now: Date = new Date()): string {
    const parts = dateFormatter.formatToParts(now);
    const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';

    return `${part('year')}-${part('month')}-${part('day')}`;
}

/** The whole of today in WIB as a half-open instant range. */
export function todayRangeInAppTimezone(now: Date = new Date()): { from: Date; to: Date } {
    const today = todayInAppTimezone(now);

    return dayRangeInAppTimezone(today, today);
}

/** A calendar date (YYYY-MM-DD) moved by a number of days; negative goes back. Calendar math, no time zone involved. */
export function addDaysToDate(date: string, days: number): string {
    return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
}
