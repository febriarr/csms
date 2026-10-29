import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ListUsersQuery } from "@workspace/validator";
import { createUser, deleteUser, getUsers, updateUser, type UserChanges } from "./user.api";
import type { ErrorResponse } from "@workspace/shared";

type UserQuery = Partial<ListUsersQuery>;

export const userKeys = {
    all: ["users"] as const,
    list: (query: UserQuery) => [...userKeys.all, "list", query] as const,
};

export function userQueryOptions(query: UserQuery = {}) {
    return queryOptions({
        queryKey: userKeys.list(query),
        queryFn: ({ signal }) => getUsers(query, signal),
    });
}

export function useUsers(query: UserQuery = {}) {
    return useQuery({ ...userQueryOptions(query), placeholderData: keepPreviousData });
}

function useInvalidateUser() {
    const queryCLient = useQueryClient();
    return () => queryCLient.invalidateQueries({ queryKey: userKeys.all });
}

export function useCreateUser() {
    const invalidate = useInvalidateUser();

    return useMutation({
        mutationFn: createUser,
        onSuccess: invalidate,
    });
}

export function useUpdateUser() {
    const invalidate = useInvalidateUser();

    return useMutation<void, ErrorResponse, { id: string; changes: UserChanges }>({
        mutationFn: ({ id, changes }) => updateUser(id, changes),
        onSettled: invalidate,
    });
}

export function useDeleteUser() {
    const invalidate = useInvalidateUser();

    return useMutation({
        mutationFn: deleteUser,
        onSuccess: invalidate,
    });
}
