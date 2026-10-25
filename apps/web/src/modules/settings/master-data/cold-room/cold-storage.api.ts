import type { ApiSuccessResponse, ColdStorage, ListColdStorage } from "@workspace/shared";
import type { ColdStorageQuery, CreateColdStorageInput, UpdateColdStorageInput } from "@workspace/validator";

import { apiData, http } from "@/lib/http-client";

// Paths are relative to VITE_API_URL (which already ends in "/api").

export function getColdStorages(query: ColdStorageQuery = {}, signal?: AbortSignal): Promise<ListColdStorage[]> {
    return apiData(http.get<ApiSuccessResponse<ListColdStorage[]>>("/cold-storage", { params: query, signal }));
}

export function createColdStorage(input: CreateColdStorageInput): Promise<ColdStorage> {
    return apiData(http.post<ApiSuccessResponse<ColdStorage>>("/cold-storage", input));
}

export function updateColdStorage(id: string, input: UpdateColdStorageInput): Promise<ColdStorage> {
    return apiData(http.patch<ApiSuccessResponse<ColdStorage>>(`/cold-storage/${id}`, input));
}

export async function deleteColdStorage(id: string): Promise<void> {
    await http.delete(`/cold-storage/${id}`);
}
