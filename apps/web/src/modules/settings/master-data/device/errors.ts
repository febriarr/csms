import { ErrorCode, type ErrorResponse } from "@workspace/shared";

/** Maps backend error codes to (Indonesian) messages; falls back to whatever the backend said. */
export function getDeviceErrorMessage(error: ErrorResponse): string {
    switch (error.code) {
        case ErrorCode.DEVICE_CODE_TAKEN:
            return "Kode device sudah digunakan.";
        case ErrorCode.DEVICE_POINT_TAKEN:
            return "Titik tersebut sudah dipakai device lain di cold room ini.";
        case ErrorCode.REFERENCE_NOT_FOUND:
            return "Cold room yang dipilih tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.RESOURCE_IN_USE:
            return "Device masih dipakai dan tidak bisa dihapus.";
        case ErrorCode.ENTITY_NOT_FOUND:
        case ErrorCode.NOT_FOUND:
            return "Device tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.FORBIDDEN:
            return "Anda tidak memiliki akses untuk aksi ini.";
        default:
            // INVALID_THRESHOLD_ORDER and validation errors already carry a specific message from the backend.
            return error.message;
    }
}

/** Error codes that belong to one particular form field. */
const CODE_TO_FIELD: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.DEVICE_CODE_TAKEN]: "code",
    [ErrorCode.DEVICE_POINT_TAKEN]: "pointLabel",
    [ErrorCode.REFERENCE_NOT_FOUND]: "coldStorageId",
};

/** field -> first message, from the backend's `errors` map plus code-specific mappings. "_root" = no field. */
export function getServerFieldErrors(error: ErrorResponse | null | undefined): Record<string, string> {
    if (!error) return {};

    const result: Record<string, string> = {};
    for (const [field, messages] of Object.entries(error.errors ?? {})) {
        if (messages[0]) result[field] = messages[0];
    }

    const field = CODE_TO_FIELD[error.code];
    if (field) result[field] ??= getDeviceErrorMessage(error);

    return result;
}
