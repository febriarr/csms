import { apiData, apiPaginated, http } from "@/lib/http-client";
import type {
    ApiSuccessResponse,
    DiagnosticLogItem,
    DiagnosticSummaryReport,
    DiagnosticTrendReport,
    WithMetadata,
} from "@workspace/shared";

/** Both dates or neither: without them the API reports the last 7 days. */
export type DiagnosticPeriod = { from?: string; to?: string };

export type DiagnosticTrendParams = DiagnosticPeriod & { deviceId: string };

export type DiagnosticDetailParams = DiagnosticTrendParams & { page: number; pageSize: number };

/** Devices with at least one failure in the period, worst first. */
export function getDiagnosticSummary(params: DiagnosticPeriod, signal?: AbortSignal): Promise<DiagnosticSummaryReport> {
    return apiData(http.get<ApiSuccessResponse<DiagnosticSummaryReport>>("/diagnostic/summary", { params, signal }));
}

/** Failures per calendar day of one device. */
export function getDiagnosticTrend(
    params: DiagnosticTrendParams,
    signal?: AbortSignal
): Promise<DiagnosticTrendReport> {
    return apiData(http.get<ApiSuccessResponse<DiagnosticTrendReport>>("/diagnostic/trend", { params, signal }));
}

/** The individual rows behind the totals of one device, newest first. */
export function getDiagnosticDetail(
    params: DiagnosticDetailParams,
    signal?: AbortSignal
): Promise<WithMetadata<DiagnosticLogItem[]>> {
    return apiPaginated(http.get<ApiSuccessResponse<DiagnosticLogItem[]>>("/diagnostic/detail", { params, signal }));
}
