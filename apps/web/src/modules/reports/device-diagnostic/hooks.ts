import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query";

import {
    getDiagnosticDetail,
    getDiagnosticSummary,
    getDiagnosticTrend,
    type DiagnosticDetailParams,
    type DiagnosticPeriod,
    type DiagnosticTrendParams,
} from "./diagnostic.api";

export const diagnosticKeys = {
    all: ["diagnostic"] as const,
    summary: (params: DiagnosticPeriod | undefined) => [...diagnosticKeys.all, "summary", params] as const,
    trend: (params: DiagnosticTrendParams | undefined) => [...diagnosticKeys.all, "trend", params] as const,
    detail: (params: DiagnosticDetailParams | undefined) => [...diagnosticKeys.all, "detail", params] as const,
};

/** Failures are written while devices report, so the list is reloaded now and then. */
const REFRESH_MS = 60_000;

/** Pass `undefined` while the chosen period is not valid: nothing is requested then. */
export function useDiagnosticSummary(params: DiagnosticPeriod | undefined) {
    return useQuery({
        queryKey: diagnosticKeys.summary(params),
        queryFn: params ? ({ signal }) => getDiagnosticSummary(params, signal) : skipToken,
        placeholderData: keepPreviousData,
        refetchInterval: REFRESH_MS,
    });
}

/** Pass `undefined` while no device is open: nothing is requested then. */
export function useDiagnosticTrend(params: DiagnosticTrendParams | undefined) {
    return useQuery({
        queryKey: diagnosticKeys.trend(params),
        queryFn: params ? ({ signal }) => getDiagnosticTrend(params, signal) : skipToken,
    });
}

export function useDiagnosticDetail(params: DiagnosticDetailParams | undefined) {
    return useQuery({
        queryKey: diagnosticKeys.detail(params),
        queryFn: params ? ({ signal }) => getDiagnosticDetail(params, signal) : skipToken,
        placeholderData: keepPreviousData,
    });
}
