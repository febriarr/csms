import { apiData, http } from "@/lib/http-client";
import type { ApiSuccessResponse } from "@workspace/shared";

/** How far back the card sparklines look. */
export const SPARKLINE_MINUTES = 180;

export type SeriesPoint = { t: number; v: number };

type RecentReadingsResponse = Record<string, { recordedAt: string; temperature: number }[]>;

/**
 * Oldest first, readings of the last `minutes` minutes, downsampled on the server (for example the average per
 * minute, so at most ~180 points per device).
 */
export async function getRecentReadings(
    deviceIds: string[],
    minutes: number,
    signal?: AbortSignal
): Promise<Record<string, SeriesPoint[]>> {
    const data = await apiData(
        http.get<ApiSuccessResponse<RecentReadingsResponse>>("/temperature/recent", {
            params: { deviceIds: deviceIds.join(","), minutes },
            signal,
        })
    );

    return Object.fromEntries(
        Object.entries(data).map(([id, rows]) => [
            id,
            rows.map((row) => ({ t: Date.parse(row.recordedAt), v: row.temperature })),
        ])
    );
}
