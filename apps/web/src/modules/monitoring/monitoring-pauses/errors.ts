import { ErrorCode, type ErrorResponse } from "@workspace/shared";

/** Maps backend error codes to (Indonesian) messages; falls back to whatever the backend said. */
export function getPauseErrorMessage(error: ErrorResponse): string {
    switch (error.code) {
        case ErrorCode.INVALID_PAUSE_TARGET:
            return "Pilih tepat satu target: device atau cold room.";
        case ErrorCode.INVALID_PAUSE_RANGE:
            return "Waktu selesai harus setelah waktu mulai.";
        case ErrorCode.REFERENCE_NOT_FOUND:
            return "Device atau cold room yang dipilih tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.ENTITY_NOT_FOUND:
        case ErrorCode.NOT_FOUND:
            return "Pause tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.FORBIDDEN:
            return "Anda tidak memiliki akses untuk aksi ini.";
        default:
            return error.message;
    }
}

/** Error codes that belong to one particular form field. The create form shows the target error under "Target". */
const CODE_TO_FIELD: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.INVALID_PAUSE_TARGET]: "deviceId",
    [ErrorCode.REFERENCE_NOT_FOUND]: "deviceId",
    [ErrorCode.INVALID_PAUSE_RANGE]: "endsAt",
};

/** field -> first message, from the backend's `errors` map plus code-specific mappings. */
export function getServerFieldErrors(error: ErrorResponse | null | undefined): Record<string, string> {
    if (!error) return {};

    const result: Record<string, string> = {};
    for (const [field, messages] of Object.entries(error.errors ?? {})) {
        if (messages[0]) result[field] = messages[0];
    }

    const field = CODE_TO_FIELD[error.code];
    if (field) result[field] ??= getPauseErrorMessage(error);

    return result;
}
