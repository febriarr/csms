import type { ApiSuccessResponse, Division } from "@workspace/shared";
import type { CreateDivisionInput, UpdateDivisionInput } from "@workspace/validator";

import { apiData, http } from "@/lib/http-client";

// Paths are relative to VITE_API_URL (which already ends in "/api").

export function getDivisions(signal?: AbortSignal): Promise<Division[]> {
    return apiData(http.get<ApiSuccessResponse<Division[]>>("/division", { signal }));
}

export function createDivision(input: CreateDivisionInput): Promise<Division> {
    return apiData(http.post<ApiSuccessResponse<Division>>("/division", input));
}

export function updateDivision(id: string, input: UpdateDivisionInput): Promise<Division> {
    return apiData(http.patch<ApiSuccessResponse<Division>>(`/division/${id}`, input));
}

export async function deleteDivision(id: string): Promise<void> {
    await http.delete(`/division/${id}`);
}
