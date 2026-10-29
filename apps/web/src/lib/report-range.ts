import { MAX_REPORT_RANGE_DAYS } from "@workspace/validator";

const MS_PER_DAY = 86_400_000;

/** Same rule as the API: from <= to, and at most MAX_REPORT_RANGE_DAYS days apart. Null when the range is fine. */
export function getRangeProblem(from: string | undefined, to: string | undefined): string | null {
    if (!from || !to) return null;

    const days = (Date.parse(to) - Date.parse(from)) / MS_PER_DAY;

    return days > MAX_REPORT_RANGE_DAYS ? `Rentang tanggal maksimal ${MAX_REPORT_RANGE_DAYS} hari.` : null;
}
