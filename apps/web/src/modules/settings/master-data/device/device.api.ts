import { apiData, http } from "@/lib/http-client";
import { type ApiSuccessResponse, type DeviceView } from "@workspace/shared";
import type { CreateDeviceInput, DeviceQuery, UpdateDeviceInput } from "@workspace/validator";

export function getDevices(query: DeviceQuery = {}, signal?: AbortSignal): Promise<DeviceView[]> {
    return apiData(
        http.get<ApiSuccessResponse<DeviceView[]>>("/device", {
            params: query,
            signal,
        })
    );
}

export function createDevice(input: CreateDeviceInput): Promise<DeviceView> {
    return apiData(http.post<ApiSuccessResponse<DeviceView>>("/device", input));
}

export function updateDevice(id: string, input: UpdateDeviceInput): Promise<DeviceView> {
    return apiData(http.patch<ApiSuccessResponse<DeviceView>>(`/device/${id}`, input));
}

export async function deleteDevice(id: string): Promise<void> {
    await http.delete(`/device/${id}`);
}
