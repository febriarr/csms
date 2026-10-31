import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Alert, ErrorResponse } from "@workspace/shared";

import { acknowledgeAlert } from "@/modules/monitoring/alert/alert.api";
import { alertKeys } from "@/modules/monitoring/alert/hooks";

import { getOverview } from "./overview.api";

export const overviewKeys = {
    all: ["overview"] as const,
};

/** The page has no live stream: it asks again at this interval, and again when the tab gets focus back. */
export const OVERVIEW_REFRESH_MS = 30_000;

export function overviewQueryOptions() {
    return queryOptions({
        queryKey: overviewKeys.all,
        queryFn: ({ signal }) => getOverview(signal),
    });
}

export function useOverview() {
    return useQuery({
        ...overviewQueryOptions(),
        placeholderData: keepPreviousData,
        refetchInterval: OVERVIEW_REFRESH_MS,
        refetchOnWindowFocus: true,
        // a refresh that fails must not wipe the numbers on screen: the page keeps showing the last good ones
        retry: 1,
    });
}

/** Acknowledges from the overview: the alert list page and the overview both change, so both reload. */
export function useAcknowledgeFromOverview() {
    const queryClient = useQueryClient();

    return useMutation<Alert, ErrorResponse, string>({
        mutationFn: acknowledgeAlert,
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: overviewKeys.all }),
                queryClient.invalidateQueries({ queryKey: alertKeys.all }),
            ]),
    });
}
