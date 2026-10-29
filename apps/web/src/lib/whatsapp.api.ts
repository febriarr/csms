import { apiData, http } from "@/lib/http-client";
import type { ApiSuccessResponse } from "@workspace/shared";

/** Mirrors WhatsappStatusResponse of the backend (GET /whatsapp/status, super_admin only). */
export type WhatsappStatus = {
    enabled: boolean;
    connected: boolean;
    /** A data URL of the pairing QR code, present only while the account is not linked. */
    qrImage: string | null;
};

export function getWhatsappStatus(signal?: AbortSignal): Promise<WhatsappStatus> {
    return apiData(http.get<ApiSuccessResponse<WhatsappStatus>>("/whatsapp/status", { signal }));
}
