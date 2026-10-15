import type { ErrorCode } from './error_codes';

/** field name -> messages. "_root" holds the messages that belong to no particular field. */
export type FieldErrors = Record<string, string[]>;

/**
 * The only shape the API ever returns for a failed request. Keep it free of backend imports so the React app
 * can reuse it (move this file and error_codes.ts into a shared package when the frontend needs them).
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
