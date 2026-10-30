import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorCode, type ErrorResponse } from "@workspace/shared";

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
    if (field) result[field] ??= getErrorMessage(error);

    return result;
}
