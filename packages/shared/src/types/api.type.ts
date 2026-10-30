export interface PaginationMeta {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ApiSuccessResponse<T> {
    success: boolean;
    data: T;
    metadata?: PaginationMeta;
}

export interface WithMetadata<T> {
    data: T;
    metadata: PaginationMeta;
}

/**
 * Machine-readable error codes. The frontend switches on these (never on the message text), so the values are
 * part of the API contract: add new ones, do not rename existing ones.
 */
export const ErrorCode = {
    // generic
    VALIDATION_FAILED: "VALIDATION_FAILED",
    INVALID_INPUT: "INVALID_INPUT",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    NOT_FOUND: "NOT_FOUND",
    ENTITY_NOT_FOUND: "ENTITY_NOT_FOUND",
    CONFLICT: "CONFLICT",
    DUPLICATE_ENTITY: "DUPLICATE_ENTITY",
    RESOURCE_IN_USE: "RESOURCE_IN_USE",
    REFERENCE_NOT_FOUND: "REFERENCE_NOT_FOUND",
    BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
    CONCURRENT_UPDATE: "CONCURRENT_UPDATE",
    TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
    SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
    INTERNAL_ERROR: "INTERNAL_ERROR",

    // specific: mapped from database constraints (see db_constraints.ts)
    DEVICE_CODE_TAKEN: "DEVICE_CODE_TAKEN",
    DEVICE_POINT_TAKEN: "DEVICE_POINT_TAKEN",
    COLD_STORAGE_NAME_TAKEN: "COLD_STORAGE_NAME_TAKEN",
    DIVISION_NAME_TAKEN: "DIVISION_NAME_TAKEN",
    LOCATION_NAME_TAKEN: "LOCATION_NAME_TAKEN",
    RECIPIENT_TARGET_TAKEN: "RECIPIENT_TARGET_TAKEN",
    SUBSCRIPTION_DUPLICATE: "SUBSCRIPTION_DUPLICATE",
    INVALID_THRESHOLD_ORDER: "INVALID_THRESHOLD_ORDER",
    INVALID_PAUSE_TARGET: "INVALID_PAUSE_TARGET",
    INVALID_PAUSE_RANGE: "INVALID_PAUSE_RANGE",
    INVALID_SUBSCRIPTION_SCOPE: "INVALID_SUBSCRIPTION_SCOPE",
    EMAIL_TAKEN: "EMAIL_TAKEN",
    USERNAME_TAKEN: "USERNAME_TAKEN",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** field name -> messages. "_root" holds the messages that belong to no particular field. */
export type FieldErrors = Record<string, string[]>;

/**
 * The only shape the API ever returns for a failed request.
 */
export type ErrorResponse = {
    success: false;
    statusCode: number;
    code: ErrorCode;
    message: string;
    errors?: FieldErrors;
    timestamp: string;
    /** Path only, without the query string. */
    path: string;
    /** Outside production and for 5xx only: what actually went wrong. Never present in production. */
    debug?: { message: string; stack?: string };
};
