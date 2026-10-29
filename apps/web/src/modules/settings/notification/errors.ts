import { ErrorCode, type ErrorResponse } from "@workspace/shared";

/** Maps backend error codes to (Indonesian) messages; falls back to whatever the backend said. */
export function getNotificationErrorMessage(error: ErrorResponse): string {
    switch (error.code) {
        case ErrorCode.RECIPIENT_TARGET_TAKEN:
            return "Nomor/email ini sudah terdaftar pada channel yang sama.";
        case ErrorCode.SUBSCRIPTION_DUPLICATE:
            return "Ada langganan yang duplikat.";
        case ErrorCode.INVALID_SUBSCRIPTION_SCOPE:
            return "Langganan tidak valid: target tidak sesuai dengan cakupannya.";
        case ErrorCode.REFERENCE_NOT_FOUND:
            return "Divisi atau area yang dipilih tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.ENTITY_NOT_FOUND:
        case ErrorCode.NOT_FOUND:
            return "Penerima notifikasi tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.FORBIDDEN:
            return "Anda tidak memiliki akses untuk aksi ini.";
        default:
            return error.message;
    }
}

/** Error codes that belong to one particular form field. */
const CODE_TO_FIELD: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.RECIPIENT_TARGET_TAKEN]: "target",
    [ErrorCode.SUBSCRIPTION_DUPLICATE]: "subscriptions",
    [ErrorCode.INVALID_SUBSCRIPTION_SCOPE]: "subscriptions",
};

/** field -> first message, from the backend's `errors` map plus code-specific mappings. */
export function getServerFieldErrors(error: ErrorResponse | null | undefined): Record<string, string> {
    if (!error) return {};

    const result: Record<string, string> = {};
    for (const [field, messages] of Object.entries(error.errors ?? {})) {
        if (messages[0]) result[field] = messages[0];
    }

    const field = CODE_TO_FIELD[error.code];
    if (field) result[field] ??= getNotificationErrorMessage(error);

    return result;
}
