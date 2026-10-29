import type { ApiSuccessResponse, Location } from "@workspace/shared";
import type { CreateLocationInput, LocationQuery, UpdateLocationInput } from "@workspace/validator";

import { apiData, http } from "@/lib/http-client";

// Paths are relative to VITE_API_URL (which already ends in "/api").

export function getLocations(query: LocationQuery = {}, signal?: AbortSignal): Promise<Location[]> {
    return apiData(http.get<ApiSuccessResponse<Location[]>>("/location", { params: query, signal }));
}

export function createLocation(input: CreateLocationInput): Promise<Location> {
    return apiData(http.post<ApiSuccessResponse<Location>>("/location", input));
}

export function updateLocation(id: string, input: UpdateLocationInput): Promise<Location> {
    return apiData(http.patch<ApiSuccessResponse<Location>>(`/location/${id}`, input));
}

export async function deleteLocation(id: string): Promise<void> {
    await http.delete(`/location/${id}`);
}
