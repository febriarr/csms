import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorCode, type ErrorResponse } from "@workspace/shared";

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
    if (field) result[field] ??= getErrorMessage(error);

    return result;
}
