import { ErrorCode, type ErrorResponse } from "@workspace/shared";

/** Maps backend error codes to (Indonesian) messages; falls back to whatever the backend said. */
export function getReportErrorMessage(error: ErrorResponse): string {
    switch (error.code) {
        case ErrorCode.ENTITY_NOT_FOUND:
        case ErrorCode.NOT_FOUND:
            return "Device tidak ditemukan.";
        case ErrorCode.FORBIDDEN:
            return "Anda tidak memiliki akses untuk laporan ini.";
        default:
            return error.message;
    }
}
