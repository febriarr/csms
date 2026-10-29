import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ErrorResponse } from "@workspace/shared";

import {
    downloadReport,
    getReport,
    getReportEvents,
    getReportSummary,
    type ExportParams,
    type ReportPageParams,
    type ReportParams,
} from "./temperature-history.api";

export const reportKeys = {
    all: ["temperature-report"] as const,
    list: (params: ReportPageParams | undefined) => [...reportKeys.all, "list", params] as const,
    events: (params: ReportParams | undefined) => [...reportKeys.all, "events", params] as const,
    summary: (params: ReportParams | undefined) => [...reportKeys.all, "summary", params] as const,
};

/** History does not change by itself, only the current day grows: no polling, a short stale time is enough. */
const STALE_MS = 30_000;

const samePeriod = (a: ReportParams | undefined, b: ReportParams | undefined) =>
    a?.deviceId === b?.deviceId && a?.from === b?.from && a?.to === b?.to;

/** Pass `undefined` while the filters are incomplete: nothing is requested then. */
export function useReport(params: ReportPageParams | undefined) {
    return useQuery({
        queryKey: reportKeys.list(params),
        queryFn: params ? ({ signal }) => getReport(params, signal) : skipToken,
        staleTime: STALE_MS,
        // the previous page stays on screen while the next one loads, but never the rows of another device or period
        placeholderData: (previousData, previousQuery) =>
            samePeriod(previousQuery?.queryKey[2], params) ? previousData : undefined,
    });
}

export function useReportEvents(params: ReportParams | undefined) {
    return useQuery({
        queryKey: reportKeys.events(params),
        queryFn: params ? ({ signal }) => getReportEvents(params, signal) : skipToken,
        staleTime: STALE_MS,
    });
}

export function useReportSummary(params: ReportParams | undefined) {
    return useQuery({
        queryKey: reportKeys.summary(params),
        queryFn: params ? ({ signal }) => getReportSummary(params, signal) : skipToken,
        staleTime: STALE_MS,
    });
}

export function useExportReport() {
    return useMutation<void, ErrorResponse, ExportParams>({ mutationFn: downloadReport });
}

/** Reloads everything of the report, for a period that includes today. */
export function useRefreshReport() {
    const queryClient = useQueryClient();

    return () => queryClient.invalidateQueries({ queryKey: reportKeys.all });
}
