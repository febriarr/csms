import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { LocationQuery, UpdateLocationInput } from "@workspace/validator";

import { createLocation, deleteLocation, getLocations, updateLocation } from "./location.api";

export const locationKeys = {
    all: ["locations"] as const,
    list: (query: LocationQuery) => [...locationKeys.all, "list", query] as const,
};

export function locationsQueryOptions(query: LocationQuery = {}) {
    return queryOptions({
        queryKey: locationKeys.list(query),
        queryFn: ({ signal }) => getLocations(query, signal),
    });
}

/** Every distinct filter gets its own cache entry; the previous result stays on screen while the next one loads. */
export function useLocations(query: LocationQuery = {}) {
    return useQuery({ ...locationsQueryOptions(query), placeholderData: keepPreviousData });
}

// Returning the invalidation promise keeps a mutation pending until the list has been refetched,
// so dialogs close at the same moment the table shows the new data.
function useInvalidateLocations() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: locationKeys.all });
}

export function useCreateLocation() {
    const invalidate = useInvalidateLocations();

    return useMutation({
        mutationFn: createLocation,
        onSuccess: invalidate,
    });
}

export function useUpdateLocation() {
    const invalidate = useInvalidateLocations();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UpdateLocationInput }) => updateLocation(id, input),
        onSuccess: invalidate,
    });
}

export function useDeleteLocation() {
    const invalidate = useInvalidateLocations();

    return useMutation({
        mutationFn: deleteLocation,
        onSuccess: invalidate,
    });
}
