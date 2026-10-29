import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { UpdateDivisionInput } from "@workspace/validator";

import { createDivision, deleteDivision, getDivisions, updateDivision } from "./division.api";

export const divisionKeys = {
    all: ["divisions"] as const,
    list: () => [...divisionKeys.all, "list"] as const,
};

export const divisionsQueryOptions = queryOptions({
    queryKey: divisionKeys.list(),
    queryFn: ({ signal }) => getDivisions(signal),
});

export function useDivisions() {
    return useQuery(divisionsQueryOptions);
}

// Returning the invalidation promise keeps a mutation pending until the list has been refetched,
// so dialogs close at the same moment the table shows the new data.
function useInvalidateDivisions() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: divisionKeys.all });
}

export function useCreateDivision() {
    const invalidate = useInvalidateDivisions();

    return useMutation({
        mutationFn: createDivision,
        onSuccess: invalidate,
    });
}

export function useUpdateDivision() {
    const invalidate = useInvalidateDivisions();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UpdateDivisionInput }) => updateDivision(id, input),
        onSuccess: invalidate,
    });
}

export function useDeleteDivision() {
    const invalidate = useInvalidateDivisions();

    return useMutation({
        mutationFn: deleteDivision,
        onSuccess: invalidate,
    });
}
