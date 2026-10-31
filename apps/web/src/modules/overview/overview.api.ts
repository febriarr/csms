import { apiData, http } from "@/lib/http-client";
import type { ApiSuccessResponse, Overview } from "@workspace/shared";

export function getOverview(signal?: AbortSignal): Promise<Overview> {
    return apiData(http.get<ApiSuccessResponse<Overview>>("/overview", { signal }));
}
