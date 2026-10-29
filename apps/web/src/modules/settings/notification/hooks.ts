import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
    NotificationRecipientQuery,
    ReplaceSubscriptionsInput,
    UpdateNotificationRecipientInput,
} from "@workspace/validator";
import {
    createRecipient,
    deleteRecipient,
    getRecipients,
    replaceSubscriptions,
    updateRecipient,
} from "./notification.api";

export const notificationKeys = {
    all: ["notification-recipients"] as const,
    list: (query: NotificationRecipientQuery) => [...notificationKeys.all, "list", query] as const,
};

export function recipientQueryOptions(query: NotificationRecipientQuery = {}) {
    return queryOptions({
        queryKey: notificationKeys.list(query),
        queryFn: ({ signal }) => getRecipients(query, signal),
    });
}

export function useRecipients(query: NotificationRecipientQuery = {}) {
    return useQuery({ ...recipientQueryOptions(query), placeholderData: keepPreviousData });
}

function useInvalidateRecipients() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useCreateRecipient() {
    const invalidate = useInvalidateRecipients();

    return useMutation({
        mutationFn: createRecipient,
        onSuccess: invalidate,
    });
}

export function useUpdateRecipient() {
    const invalidate = useInvalidateRecipients();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UpdateNotificationRecipientInput }) =>
            updateRecipient(id, input),
        onSuccess: invalidate,
    });
}

export function useDeleteRecipient() {
    const invalidate = useInvalidateRecipients();

    return useMutation({
        mutationFn: deleteRecipient,
        onSuccess: invalidate,
    });
}

export function useReplaceSubscriptions() {
    const invalidate = useInvalidateRecipients();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: ReplaceSubscriptionsInput }) =>
            replaceSubscriptions(id, input),
        onSuccess: invalidate,
    });
}
