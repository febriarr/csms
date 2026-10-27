import { apiData, http } from "@/lib/http-client";
import type { ApiSuccessResponse, NotificationRecipientWithSubscriptions } from "@workspace/shared";
import type {
    CreateNotificationRecipientInput,
    NotificationRecipientQuery,
    ReplaceSubscriptionsInput,
    UpdateNotificationRecipientInput,
} from "@workspace/validator";

const BASE = "/notification-recipients";

export function getRecipients(
    query: NotificationRecipientQuery = {},
    signal?: AbortSignal
): Promise<NotificationRecipientWithSubscriptions[]> {
    return apiData(
        http.get<ApiSuccessResponse<NotificationRecipientWithSubscriptions[]>>(BASE, {
            params: query,
            signal,
        })
    );
}

export function createRecipient(
    input: CreateNotificationRecipientInput
): Promise<NotificationRecipientWithSubscriptions> {
    return apiData(http.post<ApiSuccessResponse<NotificationRecipientWithSubscriptions>>(BASE, input));
}

export function updateRecipient(
    id: string,
    input: UpdateNotificationRecipientInput
): Promise<NotificationRecipientWithSubscriptions> {
    return apiData(http.patch<ApiSuccessResponse<NotificationRecipientWithSubscriptions>>(`${BASE}/${id}`, input));
}

export async function deleteRecipient(id: string): Promise<void> {
    await http.delete(`${BASE}/${id}`);
}

/** "Save" of the subscription screen: the sent list replaces the current one. */
export function replaceSubscriptions(
    id: string,
    input: ReplaceSubscriptionsInput
): Promise<NotificationRecipientWithSubscriptions> {
    return apiData(
        http.put<ApiSuccessResponse<NotificationRecipientWithSubscriptions>>(`${BASE}/${id}/subscriptions`, input)
    );
}
