import axios, { type AxiosResponse } from "axios";
import type { ApiSuccessResponse, WithMetadata } from "@workspace/shared";

import { toErrorResponse } from "./api-error";

declare module "axios" {
    interface AxiosRequestConfig {
        /**
         * Skip the global "401 -> session expired" handling. Set it on requests that answer 401 as a normal
         * outcome (get-session, login, logout).
         */
        skipUnauthorizedHandler?: boolean;
    }
}

export const http = axios.create({
    // Host plus API prefix, e.g. http://localhost:3000/api. Requests only spell out the rest (/auth/..., /division).
    baseURL: import.meta.env.VITE_API_URL,
    // Better Auth keeps the session in an httpOnly cookie, so the browser must send it on every request.
    withCredentials: true,
    timeout: 15_000,
    headers: { Accept: "application/json" },
});

let unauthorizedHandler: (() => void) | null = null;

/** AuthProvider registers this so the HTTP layer doesn't need to know about React, the router or the query cache. */
export function setUnauthorizedHandler(handler: () => void) {
    unauthorizedHandler = handler;
    return () => {
        if (unauthorizedHandler === handler) unauthorizedHandler = null;
    };
}

http.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        // Aborted requests (TanStack Query cancels on unmount) are not failures.
        if (axios.isCancel(error)) return Promise.reject(error);

        const errorResponse = toErrorResponse(error);
        const skip = axios.isAxiosError(error) && error.config?.skipUnauthorizedHandler;
        if (errorResponse.statusCode === 401 && !skip) unauthorizedHandler?.();

        // Callers receive the backend's ErrorResponse itself.
        return Promise.reject(errorResponse);
    }
);

/** Unwraps ApiSuccessResponse<T> -> T.  `apiData(http.get<ApiSuccessResponse<Device[]>>("/api/devices"))` */
export async function apiData<T>(request: Promise<AxiosResponse<ApiSuccessResponse<T>>>): Promise<T> {
    return (await request).data.data;
}

/** Unwraps a paginated ApiSuccessResponse<T> -> { data, metadata }. */
export async function apiPaginated<T>(
    request: Promise<AxiosResponse<ApiSuccessResponse<T>>>
): Promise<WithMetadata<T>> {
    const { data, metadata } = (await request).data;
    if (!metadata) throw new Error("Expected pagination metadata in the response.");
    return { data, metadata };
}
