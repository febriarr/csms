import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import type { NotificationLogQuery } from "@workspace/validator";

import { getNotificationLogs } from "./notification-log.api";

type LogListQuery = Partial<NotificationLogQuery>;

export const notificationLogKeys = {
    all: ["notification-log"] as const,
    list: (query: LogListQuery) => [...notificationLogKeys.all, "list", query] as const,
};

/** Messages move from pending to sent or failed while the dispatcher works, so the list is reloaded now and then. */
const REFRESH_MS = 30_000;

export function notificationLogQueryOptions(query: LogListQuery = {}) {
    return queryOptions({
        queryKey: notificationLogKeys.list(query),
        queryFn: ({ signal }) => getNotificationLogs(query, signal),
    });
}

export function useNotificationLogs(query: LogListQuery = {}) {
    return useQuery({
        ...notificationLogQueryOptions(query),
        placeholderData: keepPreviousData,
        refetchInterval: REFRESH_MS,
    });
}
