import { apiPaginated, http } from "@/lib/http-client";
import type { ApiSuccessResponse, ListNotificationLog, WithMetadata } from "@workspace/shared";
import type { NotificationLogQuery } from "@workspace/validator";

export function getNotificationLogs(
    query: Partial<NotificationLogQuery> = {},
    signal?: AbortSignal
): Promise<WithMetadata<ListNotificationLog[]>> {
    return apiPaginated(
        http.get<ApiSuccessResponse<ListNotificationLog[]>>("/notification-log", { params: query, signal })
    );
}
