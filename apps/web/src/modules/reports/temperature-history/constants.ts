import { MAX_REPORT_RANGE_DAYS, type ReadingEvaluation } from "@workspace/validator";

import type { ExportFormat, ExportGranularity } from "./temperature-history.api";

export const EVALUATION_META: Record<ReadingEvaluation, { label: string; hint: string }> = {
    EVALUATED: { label: "Evaluated", hint: "The reading went through the normal alert rules." },
    PAUSED: { label: "Paused", hint: "A planned pause was running, so no alert was looked at." },
    PULLING_DOWN: {
        label: "Pulling down",
        hint: "The pause had ended and the machine was still given time to cool down.",
    },
    DEVICE_INACTIVE: { label: "Inactive", hint: "Monitoring was switched off for the device." },
    LATE_ARRIVAL: { label: "Late arrival", hint: "Older than the newest reading: kept as history only." },
};

/** Same limit as the API: below this share of the expected readings an hour is called thinly covered. */
export const LOW_COVERAGE_PERCENT = 80;

const MS_PER_DAY = 86_400_000;

/** Same rule as the API: from <= to, and at most MAX_REPORT_RANGE_DAYS days apart. Null when the range is fine. */
export function getRangeProblem(from: string | undefined, to: string | undefined): string | null {
    if (!from || !to) return null;

    const days = (Date.parse(to) - Date.parse(from)) / MS_PER_DAY;

    return days > MAX_REPORT_RANGE_DAYS ? `Rentang tanggal maksimal ${MAX_REPORT_RANGE_DAYS} hari.` : null;
}

/** Same pattern as the API's own file name, so a downloaded file looks the same wherever it was made. */
export function exportFilename(
    deviceCode: string,
    from: string,
    to: string,
    format: ExportFormat,
    granularity: ExportGranularity = "raw"
): string {
    const code = deviceCode.replace(/[^A-Za-z0-9_-]/g, "_");
    const prefix = granularity === "hourly" ? "temperature-hourly" : "temperature-report";

    return `${prefix}-${code}-${from}_${to}.${format}`;
}
