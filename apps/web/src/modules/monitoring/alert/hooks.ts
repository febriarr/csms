import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Alert as AlertRecord, ErrorResponse } from "@workspace/shared";
import type { AlertQuery } from "@workspace/validator";
import { acknowledgeAlert, getAlerts } from "./alert.api";

type AlertListQuery = Partial<AlertQuery>;

export const alertKeys = {
    all: ["alerts"] as const,
    list: (query: AlertListQuery) => [...alertKeys.all, "list", query] as const,
};

/** The live stream does not announce alerts yet, so the list is simply reloaded now and then. */
const REFRESH_MS = 30_000;

export function alertQueryOptions(query: AlertListQuery = {}) {
    return queryOptions({
        queryKey: alertKeys.list(query),
        queryFn: ({ signal }) => getAlerts(query, signal),
    });
}

export function useAlerts(query: AlertListQuery = {}) {
    return useQuery({ ...alertQueryOptions(query), placeholderData: keepPreviousData, refetchInterval: REFRESH_MS });
}

export function useAcknowledgeAlert() {
    const queryClient = useQueryClient();

    return useMutation<AlertRecord, ErrorResponse, string>({
        mutationFn: acknowledgeAlert,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: alertKeys.all }),
    });
}
