import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DeviceQuery, UpdateDeviceInput } from "@workspace/validator";
import { createDevice, deleteDevice, getDevices, updateDevice } from "./device.api";

export const deviceKeys = {
    all: ["devices"] as const,
    list: (query: DeviceQuery) => [...deviceKeys.all, "list", query] as const,
};

export function deviceQueryOptions(query: DeviceQuery = {}) {
    return queryOptions({
        queryKey: deviceKeys.list(query),
        queryFn: ({ signal }) => getDevices(query, signal),
    });
}

export function useDevices(query: DeviceQuery = {}) {
    return useQuery({ ...deviceQueryOptions(query), placeholderData: keepPreviousData });
}

function useInvalidateDevices() {
    const queryClient = useQueryClient();
    return () =>
        queryClient.invalidateQueries({
            queryKey: deviceKeys.all,
        });
}

export function useCreateDevice() {
    const invalidate = useInvalidateDevices();

    return useMutation({
        mutationFn: createDevice,
        onSuccess: invalidate,
    });
}

export function useUpdateDevice() {
    const invalidate = useInvalidateDevices();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UpdateDeviceInput }) => updateDevice(id, input),
        onSuccess: invalidate,
    });
}

export function useDeleteDevice() {
    const invalidate = useInvalidateDevices();

    return useMutation({
        mutationFn: deleteDevice,
        onSuccess: invalidate,
    });
}
