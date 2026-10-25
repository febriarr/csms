import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ColdStorageQuery, UpdateColdStorageInput } from "@workspace/validator";

import { createColdStorage, deleteColdStorage, getColdStorages, updateColdStorage } from "./cold-storage.api";

export const coldStorageKeys = {
    all: ["cold-storages"] as const,
    list: (query: ColdStorageQuery) => [...coldStorageKeys.all, "list", query] as const,
};

export function coldStoragesQueryOptions(query: ColdStorageQuery = {}) {
    return queryOptions({
        queryKey: coldStorageKeys.list(query),
        queryFn: ({ signal }) => getColdStorages(query, signal),
    });
}

/** Every distinct filter gets its own cache entry; the previous result stays on screen while the next one loads. */
export function useColdStorages(query: ColdStorageQuery = {}) {
    return useQuery({ ...coldStoragesQueryOptions(query), placeholderData: keepPreviousData });
}

// Returning the invalidation promise keeps a mutation pending until the list has been refetched,
// so dialogs close at the same moment the table shows the new data.
function useInvalidateColdStorages() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: coldStorageKeys.all });
}

export function useCreateColdStorage() {
    const invalidate = useInvalidateColdStorages();

    return useMutation({
        mutationFn: createColdStorage,
        onSuccess: invalidate,
    });
}

export function useUpdateColdStorage() {
    const invalidate = useInvalidateColdStorages();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UpdateColdStorageInput }) => updateColdStorage(id, input),
        onSuccess: invalidate,
    });
}

export function useDeleteColdStorage() {
    const invalidate = useInvalidateColdStorages();

    return useMutation({
        mutationFn: deleteColdStorage,
        onSuccess: invalidate,
    });
}
