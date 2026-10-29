import { apiData, apiPaginated, http } from "@/lib/http-client";
import type {
    ApiSuccessResponse,
    ReportEvent,
    TemperatureReportRow,
    TemperatureReportSummary,
    WithMetadata,
} from "@workspace/shared";

/** Device and period of a report. `from` / `to` are calendar days (YYYY-MM-DD) in the plant's time zone. */
export type ReportParams = { deviceId: string; from: string; to: string };

export type ReportPageParams = ReportParams & { page: number; pageSize: number };

export type ExportFormat = "xlsx" | "csv";

export type ExportParams = ReportParams & { format: ExportFormat; filename: string };

/** One page of readings, newest first. */
export function getReport(
    params: ReportPageParams,
    signal?: AbortSignal
): Promise<WithMetadata<TemperatureReportRow[]>> {
    return apiPaginated(
        http.get<ApiSuccessResponse<TemperatureReportRow[]>>("/temperature/report", { params, signal })
    );
}

/** Alerts and planned pauses of the period, in time order. */
export function getReportEvents(params: ReportParams, signal?: AbortSignal): Promise<ReportEvent[]> {
    return apiData(http.get<ApiSuccessResponse<ReportEvent[]>>("/temperature/report/events", { params, signal }));
}

/** NEEDS A NEW BACKEND ENDPOINT: GET /temperature/report/summary (same query as /report/events). */
export function getReportSummary(params: ReportParams, signal?: AbortSignal): Promise<TemperatureReportSummary> {
    return apiData(
        http.get<ApiSuccessResponse<TemperatureReportSummary>>("/temperature/report/summary", { params, signal })
    );
}

/** The file name the API chose (`attachment; filename="..."`), or null when the header is missing or not exposed. */
function filenameFromHeader(header: unknown): string | null {
    if (typeof header !== "string") return null;

    return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? null;
}

/**
 * Downloads the report file. The API streams it, so a month of readings can take a while: the default 15 s timeout
 * of the HTTP client would cut it off. `filename` is only the fallback for when the API's own name is not readable.
 */
export async function downloadReport({ filename, ...params }: ExportParams): Promise<void> {
    const response = await http.get<Blob>("/temperature/report/export", {
        params,
        responseType: "blob",
        timeout: 120_000,
    });

    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");

    link.href = url;
    link.download = filenameFromHeader(response.headers["content-disposition"]) ?? filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // revoked a moment later: some browsers start the download asynchronously
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
