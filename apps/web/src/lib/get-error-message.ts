import { ErrorCode, type ErrorResponse } from "@workspace/shared";

/**
 * Maps backend error codes to Indonesian user-facing messages.
 * Falls back to the backend-provided message when no specific mapping exists.
 */
export function getErrorMessage(error: ErrorResponse): string {
    switch (error.code) {
        // Generic
        case ErrorCode.VALIDATION_FAILED:
            return "Data yang diberikan tidak valid.";

        case ErrorCode.INVALID_INPUT:
            return "Input yang diberikan tidak valid.";

        case ErrorCode.UNAUTHORIZED:
            return "Sesi Anda telah berakhir. Silakan masuk kembali.";

        case ErrorCode.FORBIDDEN:
            return "Anda tidak memiliki akses untuk melakukan tindakan ini.";

        case ErrorCode.NOT_FOUND:
        case ErrorCode.ENTITY_NOT_FOUND:
            return "Data yang diminta tidak ditemukan.";

        case ErrorCode.CONFLICT:
            return "Terjadi konflik pada data. Silakan coba lagi.";

        case ErrorCode.DUPLICATE_ENTITY:
            return "Data tersebut sudah ada.";

        case ErrorCode.RESOURCE_IN_USE:
            return "Data sedang digunakan dan tidak dapat dihapus.";

        case ErrorCode.REFERENCE_NOT_FOUND:
            return "Data terkait tidak ditemukan.";

        case ErrorCode.BUSINESS_RULE_VIOLATION:
            return "Permintaan tidak dapat diproses karena melanggar aturan bisnis.";

        case ErrorCode.CONCURRENT_UPDATE:
            return "Data telah berubah oleh pengguna lain. Silakan muat ulang dan coba lagi.";

        case ErrorCode.TOO_MANY_REQUESTS:
            return "Terlalu banyak permintaan. Silakan coba lagi nanti.";

        case ErrorCode.SERVICE_UNAVAILABLE:
            return "Layanan sedang tidak tersedia. Silakan coba lagi nanti.";

        case ErrorCode.INTERNAL_ERROR:
            return "Terjadi kesalahan pada server. Silakan coba lagi.";

        // Device
        case ErrorCode.DEVICE_CODE_TAKEN:
            return "Kode device sudah digunakan.";

        case ErrorCode.DEVICE_POINT_TAKEN:
            return "Device point sudah digunakan.";

        // Cold Storage
        case ErrorCode.COLD_STORAGE_NAME_TAKEN:
            return "Nama cold storage sudah digunakan.";

        // Division
        case ErrorCode.DIVISION_NAME_TAKEN:
            return "Nama division sudah digunakan.";

        // Location
        case ErrorCode.LOCATION_NAME_TAKEN:
            return "Nama location sudah digunakan.";

        // Notification / Subscription
        case ErrorCode.RECIPIENT_TARGET_TAKEN:
            return "Target penerima sudah digunakan.";

        case ErrorCode.SUBSCRIPTION_DUPLICATE:
            return "Subscription tersebut sudah terdaftar.";

        case ErrorCode.INVALID_SUBSCRIPTION_SCOPE:
            return "Scope subscription tidak valid.";

        // Threshold
        case ErrorCode.INVALID_THRESHOLD_ORDER:
            return "Urutan threshold tidak valid.";

        // Device pause
        case ErrorCode.INVALID_PAUSE_TARGET:
            return "Target pause tidak valid.";

        case ErrorCode.INVALID_PAUSE_RANGE:
            return "Rentang waktu pause tidak valid.";

        // User / Auth
        case ErrorCode.EMAIL_TAKEN:
            return "Email sudah digunakan.";

        case ErrorCode.USERNAME_TAKEN:
            return "Username sudah digunakan.";

        default:
            return error.message;
    }
}
