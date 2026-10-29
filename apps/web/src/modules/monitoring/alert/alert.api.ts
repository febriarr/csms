import { apiData, apiPaginated, http } from "@/lib/http-client";
import type { Alert, ApiSuccessResponse, ListAlert, WithMetadata } from "@workspace/shared";
import type { AlertQuery } from "@workspace/validator";

export function getAlerts(query: Partial<AlertQuery> = {}, signal?: AbortSignal): Promise<WithMetadata<ListAlert[]>> {
    return apiPaginated(http.get<ApiSuccessResponse<ListAlert[]>>("/alert", { params: query, signal }));
}

/** Acknowledging twice is not an error on the backend: the first acknowledgement (who and when) is kept. */
export function acknowledgeAlert(id: string): Promise<Alert> {
    return apiData(http.patch<ApiSuccessResponse<Alert>>(`/alert/${id}/acknowledge`));
}
