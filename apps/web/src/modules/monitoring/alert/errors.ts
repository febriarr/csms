import { ErrorCode, type ErrorResponse } from "@workspace/shared";

/** Maps backend error codes to (Indonesian) messages; falls back to whatever the backend said. */
export function getAlertErrorMessage(error: ErrorResponse): string {
    switch (error.code) {
        case ErrorCode.ENTITY_NOT_FOUND:
        case ErrorCode.NOT_FOUND:
            return "Alert tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.FORBIDDEN:
            return "Anda tidak memiliki akses untuk aksi ini.";
        default:
            return error.message;
    }
}
