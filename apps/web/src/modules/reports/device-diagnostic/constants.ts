import type { DiagnosticTrendPoint, ResetReason } from "@workspace/shared";

/** What each reset reason usually points at. The firmware reports the reason once, on the first message after boot. */
export const RESET_REASON_META: Record<ResetReason, { label: string; badge: string; hint: string }> = {
    PANIC: {
        label: "Panic",
        badge: "border-destructive/40 bg-destructive/10 text-destructive",
        hint: "The firmware crashed (exception) and restarted.",
    },
    BROWNOUT: {
        label: "Brownout",
        badge: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        hint: "The supply voltage dropped too low. Check the power supply and wiring.",
    },
    WATCHDOG: {
        label: "Watchdog",
        badge: "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
        hint: "The firmware stopped responding and was restarted by the watchdog.",
    },
    UNKNOWN: {
        label: "Unknown",
        badge: "border-border bg-muted text-muted-foreground",
        hint: "The device could not tell why it restarted.",
    },
};

/** The three failure counters. `color` is used by the chart, `text` by the numbers in tables and tiles. */
export const FAILURES = [
    { key: "sensorFailTotal", label: "Sensor", color: "var(--destructive)", text: "text-destructive" },
    { key: "wifiFailTotal", label: "Wi-Fi", color: "var(--warning)", text: "text-amber-600 dark:text-amber-400" },
    { key: "httpFailTotal", label: "HTTP", color: "#0ea5e9", text: "text-sky-600 dark:text-sky-400" },
] as const;

/** Signal strength of the Wi-Fi link, from the usual dBm bands. */
export function rssiQuality(rssi: number | null): { label: string; text: string } {
    if (rssi === null) return { label: "-", text: "text-muted-foreground" };
    if (rssi >= -60) return { label: "Good", text: "text-emerald-600 dark:text-emerald-400" };
    if (rssi >= -70) return { label: "Fair", text: "text-foreground" };
    if (rssi >= -80) return { label: "Weak", text: "text-amber-600 dark:text-amber-400" };

    return { label: "Poor", text: "text-destructive" };
}

export const formatRssi = (rssi: number | null) => (rssi === null ? "-" : `${rssi} dBm`);

const MS_PER_DAY = 86_400_000;

export type TrendDay = DiagnosticTrendPoint;

/**
 * The API only has a row for days with a failure, so a quiet day is missing. A chart needs it as a zero, otherwise
 * the bars of two distant days would sit next to each other.
 */
export function fillDays(from: string, to: string, points: DiagnosticTrendPoint[]): TrendDay[] {
    const byDay = new Map(points.map((point) => [point.day, point]));
    const result: TrendDay[] = [];

    // YYYY-MM-DD parses as UTC midnight, so adding whole days never skips or repeats a day
    for (let time = Date.parse(from); time <= Date.parse(to); time += MS_PER_DAY) {
        const day = new Date(time).toISOString().slice(0, 10);

        result.push(
            byDay.get(day) ?? { day, sensorFailTotal: 0, wifiFailTotal: 0, httpFailTotal: 0, avgRssi: null }
        );
    }

    return result;
}

/** "2026-10-30" -> "30/10" */
export const shortDay = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
