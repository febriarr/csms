const TIME_ZONE = "Asia/Jakarta";

// Fixed table instead of Intl's short month names: those differ between locales and ICU versions
// (en-GB prints "Sept"), and the output must always be exactly three letters.
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

// Built once: constructing an Intl.DateTimeFormat costs far more than calling format().
// hourCycle 'h23' keeps midnight as 00 (hour12: false can print 24 in some engines).
const partsFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});

type DateInput = Date | string | number | null | undefined;

/** Calendar parts of `input` in the app time zone, or null when there is no valid date. */
function toParts(input: DateInput): Record<string, string> | null {
    if (input === null || input === undefined) return null;

    const date = input instanceof Date ? input : new Date(input);

    if (Number.isNaN(date.getTime())) return null;

    const parts: Record<string, string> = {};

    for (const { type, value } of partsFormatter.formatToParts(date)) {
        parts[type] = value;
    }

    return parts;
}

/** 15-OCT-2026 — the calendar day in Asia/Jakarta. "-" when there is no valid date. */
export function formatDate(input: DateInput): string {
    const parts = toParts(input);

    if (!parts) return "-";

    return `${parts.day}-${MONTHS[Number(parts.month) - 1]}-${parts.year}`;
}

/** 15-OCT-2026 03:00:00 — 24-hour clock in Asia/Jakarta. "-" when there is no valid date. */
export function formatDateTime(input: DateInput): string {
    const parts = toParts(input);

    if (!parts) return "-";

    return `${formatDate(input)} ${parts.hour}:${parts.minute}:${parts.second}`;
}
