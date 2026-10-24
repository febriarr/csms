import { isAxiosError } from "axios";
import { ErrorCode, type ErrorResponse } from "@workspace/shared";

// Every failed query/mutation now has `ErrorResponse` as its error type, no generics needed at call sites.
declare module "@tanstack/react-query" {
    interface Register {
        defaultError: ErrorResponse;
    }
}

export function isErrorResponse(value: unknown): value is ErrorResponse {
    return (
        typeof value === "object" &&
        value !== null &&
        (value as ErrorResponse).success === false &&
        typeof (value as ErrorResponse).code === "string"
    );
}

/** First message for a field, or for "_root" (messages that belong to no particular field). */
export function getFieldError(error: ErrorResponse | null | undefined, field: string): string | undefined {
    return error?.errors?.[field]?.[0];
}

function synthetic(statusCode: number, code: ErrorCode, message: string): ErrorResponse {
    return { success: false, statusCode, code, message, timestamp: new Date().toISOString(), path: "" };
}

/**
 * The backend always answers with ErrorResponse, so that is passed through untouched. Only failures the backend
 * cannot describe get a synthetic one: no response at all (offline, CORS, timeout) or a non-JSON body (proxy page).
 */
export function toErrorResponse(error: unknown): ErrorResponse {
    if (isErrorResponse(error)) return error;

    if (isAxiosError(error)) {
        if (isErrorResponse(error.response?.data)) return error.response.data;

        if (!error.response) {
            return synthetic(
                0,
                ErrorCode.SERVICE_UNAVAILABLE,
                "Cannot reach the server. Check your connection and try again."
            );
        }

        const { status } = error.response;
        const code = status >= 502 && status <= 504 ? ErrorCode.SERVICE_UNAVAILABLE : ErrorCode.INTERNAL_ERROR;
        return synthetic(status, code, error.message);
    }

    return synthetic(0, ErrorCode.INTERNAL_ERROR, error instanceof Error ? error.message : "Unexpected error.");
}
