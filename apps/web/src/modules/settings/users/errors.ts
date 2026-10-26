import { ErrorCode, type ErrorResponse } from "@workspace/shared";

/**
 * Maps backend error codes to (Indonesian) messages; falls back to whatever the backend said.
 */
export function getUserErrorMessage(error: ErrorResponse): string {
    switch (error.code) {
        case ErrorCode.USERNAME_TAKEN:
            return "Username sudah digunakan.";
        case ErrorCode.EMAIL_TAKEN:
            return "Email sudah digunakan.";
        case ErrorCode.ENTITY_NOT_FOUND:
        case ErrorCode.NOT_FOUND:
            return "User tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.FORBIDDEN:
            return "Anda tidak memiliki akses untuk aksi ini.";
        default:
            return error.message;
    }
}

/** Error codes that belong to one particular form field. */
const CODE_TO_FIELD: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.USERNAME_TAKEN]: "username",
};

/** field -> first message, from the backends `errors` map plus code-specific mappings. "_root" = no field. */
export function getServerFieldErrors(error: ErrorResponse | null | undefined): Record<string, string> {
    if (!error) return {};

    const result: Record<string, string> = {};
    for (const [field, messages] of Object.entries(error.errors ?? {})) {
        if (messages[0]) result[field] = messages[0];
    }

    const field = CODE_TO_FIELD[error.code];
    if (field) result[field] ??= getUserErrorMessage(error);

    return result;
}
