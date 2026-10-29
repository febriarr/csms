import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EndPauseInput, PauseQuery } from "@workspace/validator";
import { createPause, deletePause, endPause, getPauses } from "./pause.api";

export const pauseKeys = {
    all: ["monitoring-pauses"] as const,
    list: (query: PauseQuery) => [...pauseKeys.all, "list", query] as const,
};

/** The timeline (SCHEDULED -> ACTIVE -> ENDED) follows the server clock, so the list refreshes by itself. */
const REFRESH_MS = 60_000;

export function pauseQueryOptions(query: PauseQuery = {}) {
    return queryOptions({
        queryKey: pauseKeys.list(query),
        queryFn: ({ signal }) => getPauses(query, signal),
    });
}

export function usePauses(query: PauseQuery = {}) {
    return useQuery({ ...pauseQueryOptions(query), placeholderData: keepPreviousData, refetchInterval: REFRESH_MS });
}

function useInvalidatePauses() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: pauseKeys.all });
}

export function useCreatePause() {
    const invalidate = useInvalidatePauses();

    return useMutation({
        mutationFn: createPause,
        onSuccess: invalidate,
    });
}

export function useEndPause() {
    const invalidate = useInvalidatePauses();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: EndPauseInput }) => endPause(id, input),
        onSuccess: invalidate,
    });
}

export function useDeletePause() {
    const invalidate = useInvalidatePauses();

    return useMutation({
        mutationFn: deletePause,
        onSuccess: invalidate,
    });
}
