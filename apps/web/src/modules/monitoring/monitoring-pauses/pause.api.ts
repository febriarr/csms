import { apiData, http } from "@/lib/http-client";
import type { ApiSuccessResponse, MonitoringPauseView } from "@workspace/shared";
import type { CreatePauseInput, EndPauseInput, PauseQuery } from "@workspace/validator";

const BASE = "/monitoring-pause";

export function getPauses(query: PauseQuery = {}, signal?: AbortSignal): Promise<MonitoringPauseView[]> {
    return apiData(http.get<ApiSuccessResponse<MonitoringPauseView[]>>(BASE, { params: query, signal }));
}

export function createPause(input: CreatePauseInput): Promise<MonitoringPauseView> {
    return apiData(http.post<ApiSuccessResponse<MonitoringPauseView>>(BASE, input));
}

export function endPause(id: string, input: EndPauseInput): Promise<MonitoringPauseView> {
    return apiData(http.patch<ApiSuccessResponse<MonitoringPauseView>>(`${BASE}/${id}/end`, input));
}

export async function deletePause(id: string): Promise<void> {
    await http.delete(`${BASE}/${id}`);
}
