import { HttpException, HttpStatus } from '@nestjs/common';
import { ZodError } from 'zod';
import { AppException } from './app.exception';
import { CHECK_CONSTRAINTS, TABLE_LABELS, UNIQUE_CONSTRAINTS, type ConstraintRule } from './db_constraints';
import { ErrorCode, FieldErrors } from '@workspace/shared';

/**
 * Turns ANY thrown value into the status / code / message the client will see. Pure: no Nest request objects, no
 * logging, no I/O, so it can be unit-tested directly. The filter only adds logging and writes the response.
 */
export type MappedError = {
    statusCode: number;
    code: ErrorCode;
    message: string;
    errors?: FieldErrors;
    /** Extra detail for the server log only (e.g. the SQLSTATE and constraint). Never sent to the client. */
    logDetail?: string;
};

const VALIDATION_MESSAGE = 'Data yang dikirim tidak valid';
const INVALID_PARAM_MESSAGE = 'Format parameter tidak valid';
const INTERNAL_MESSAGE = 'Terjadi kesalahan pada server';
const UNAVAILABLE_MESSAGE = 'Layanan sedang tidak tersedia, coba lagi sesaat lagi';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;

/*  type guards */

type ZodErrorLike = Error & { issues: { path: PropertyKey[]; message: string }[] };

/**
 * `instanceof ZodError` is the normal path. The shape check is the fallback for the day the validator package and
 * the backend resolve two different copies of zod (pnpm installs one copy per version): `instanceof` is then false
 * and every validation error would silently turn into a 500. (zod 4's core class is named `$ZodError`.)
 */
function isZodError(value: unknown): value is ZodErrorLike {
    if (value instanceof ZodError) return true;

    return (
        value instanceof Error &&
        /ZodError$/.test(value.name) &&
        Array.isArray((value as unknown as UnknownRecord).issues)
    );
}

type PgErrorLike = {
    code: string;
    severity: string;
    message?: string;
    constraint?: string;
    table?: string;
    detail?: string;
};

/** node-postgres' DatabaseError: a 5-character SQLSTATE plus the `severity` field only server errors carry. */
function isPgError(value: unknown): value is PgErrorLike {
    return (
        isRecord(value) &&
        typeof value.code === 'string' &&
        /^[0-9A-Z]{5}$/.test(value.code) &&
        typeof value.severity === 'string'
    );
}

const CONNECTION_ERROR_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN']);
const CONNECTION_ERROR_MESSAGE =
    /Connection terminated|timeout exceeded when trying to connect|Client has encountered a connection error/i;

function isConnectionError(value: unknown): value is UnknownRecord {
    if (!isRecord(value)) return false;

    if (typeof value.code === 'string' && CONNECTION_ERROR_CODES.has(value.code)) return true;

    return typeof value.message === 'string' && CONNECTION_ERROR_MESSAGE.test(value.message);
}

type BetterAuthApiError = Error & { statusCode: number; body?: { message?: unknown; code?: unknown } };

function isBetterAuthApiError(value: unknown): value is BetterAuthApiError {
    return (
        value instanceof Error &&
        value.name === 'APIError' &&
        typeof (value as unknown as UnknownRecord).statusCode === 'number'
    );
}

/**
 * Errors from Express middleware (body-parser: invalid JSON, payload too large, ...) are `http-errors` objects, not
 * Nest exceptions. They carry a 4xx status and `expose: true`, which marks them as safe to treat as client errors.
 */
function getExposedClientStatus(value: unknown): number | undefined {
    if (!(value instanceof Error)) return undefined;

    const record = value as unknown as UnknownRecord;

    if (record.expose !== true) return undefined;

    const status = typeof record.statusCode === 'number' ? record.statusCode : record.status;

    return typeof status === 'number' && status >= 400 && status < 500 ? status : undefined;
}

/**
 * Drizzle wraps the driver error (`DrizzleQueryError.cause`), and its own message contains the SQL text and the
 * parameters. Walk the cause chain to the first value that satisfies `guard`.
 */
function findInCauseChain<T>(error: unknown, guard: (value: unknown) => value is T, maxDepth = 5): T | undefined {
    let current: unknown = error;

    for (let depth = 0; depth <= maxDepth && isRecord(current); depth++) {
        if (guard(current)) return current;

        current = current.cause;
    }

    return undefined;
}

/* status helpers */

const DEFAULT_MESSAGES: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'Permintaan tidak valid',
    [HttpStatus.UNAUTHORIZED]: 'Anda belum login atau sesi Anda telah berakhir',
    [HttpStatus.FORBIDDEN]: 'Anda tidak memiliki akses ke sumber daya ini',
    [HttpStatus.NOT_FOUND]: 'Data atau halaman yang diminta tidak ditemukan',
    [HttpStatus.METHOD_NOT_ALLOWED]: 'Metode permintaan tidak diizinkan',
    [HttpStatus.CONFLICT]: 'Terjadi konflik pada data',
    [HttpStatus.PAYLOAD_TOO_LARGE]: 'Ukuran data terlalu besar',
    [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'Format data tidak didukung',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'Permintaan tidak dapat diproses',
    [HttpStatus.TOO_MANY_REQUESTS]: 'Terlalu banyak permintaan, coba lagi nanti',
    [HttpStatus.SERVICE_UNAVAILABLE]: UNAVAILABLE_MESSAGE,
};

function defaultMessageFor(status: number): string {
    return DEFAULT_MESSAGES[status] ?? (status >= 500 ? INTERNAL_MESSAGE : 'Permintaan tidak dapat diproses');
}

/** A lookup map instead of a `switch`: the status is a plain number, the keys are enum members. */
const CODES_BY_STATUS: Record<number, ErrorCode> = {
    [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
    [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
    [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
    [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
    [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
    [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
};

function codeForStatus(status: number): ErrorCode {
    return CODES_BY_STATUS[status] ?? (status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.INVALID_INPUT);
}

/** Typed as a plain number so it can be compared with the numeric status of a thrown exception. */
const STATUS_INTERNAL_SERVER_ERROR: number = HttpStatus.INTERNAL_SERVER_ERROR;

/** Nest's built-in default texts ("Not Found", "Cannot GET /x"): English, so replace them; keep real messages. */
const GENERIC_NEST_MESSAGES = new Set([
    'Bad Request',
    'Unauthorized',
    'Forbidden',
    'Not Found',
    'Method Not Allowed',
    'Conflict',
    'Gone',
    'Payload Too Large',
    'Unsupported Media Type',
    'Unprocessable Entity',
    'Too Many Requests',
    'ThrottlerException: Too Many Requests', // @nestjs/throttler
    'Internal Server Error',
    'Service Unavailable',
    'Http Exception',
]);

const isGenericNestMessage = (message: string): boolean =>
    GENERIC_NEST_MESSAGES.has(message) || /^Cannot (GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD) /.test(message);

/* the mappers */

export function zodIssuesToFieldErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
    const errors: FieldErrors = {};

    for (const issue of issues) {
        const key = issue.path.length > 0 ? issue.path.map(String).join('.') : '_root';

        (errors[key] ??= []).push(issue.message);
    }

    return errors;
}

function fromHttpException(exception: HttpException): MappedError {
    const status = exception.getStatus();
    const response = exception.getResponse();

    let message = exception.message;
    let errors: FieldErrors | undefined;
    let code = codeForStatus(status);

    if (isRecord(response)) {
        if (Array.isArray(response.message)) {
            // Nest pipes / class-validator report a list of messages
            errors = { _root: response.message.map(String) };
            message = VALIDATION_MESSAGE;
            code = ErrorCode.VALIDATION_FAILED;
        } else if (typeof response.message === 'string') {
            message = response.message;
        }
    }

    // ParseUUIDPipe / ParseIntPipe / ... throw "Validation failed (uuid is expected)": English, and about a param
    if (!errors && /^Validation failed/i.test(message)) {
        message = INVALID_PARAM_MESSAGE;
        code = ErrorCode.INVALID_INPUT;
    }

    // A 500 never shows the thrown text: it may carry internals.
    if (status === STATUS_INTERNAL_SERVER_ERROR || isGenericNestMessage(message)) {
        message = defaultMessageFor(status);
    }

    return { statusCode: status, code, message, errors };
}

function fromBetterAuth(error: BetterAuthApiError): MappedError {
    const status = error.statusCode;
    const body = isRecord(error.body) ? error.body : {};

    const message =
        typeof body.message === 'string' && body.message.trim() !== '' ? body.message : defaultMessageFor(status);

    return {
        statusCode: status,
        code: codeForStatus(status),
        message: status >= 500 ? INTERNAL_MESSAGE : message,
        logDetail: typeof body.code === 'string' ? `better-auth code ${body.code}` : undefined,
    };
}

function fromExposedClientError(status: number, error: Error): MappedError {
    const type = (error as unknown as UnknownRecord).type;

    return {
        statusCode: status,
        code: codeForStatus(status),
        message: defaultMessageFor(status),
        logDetail: typeof type === 'string' ? `http error ${type}` : undefined,
    };
}

function fromRule(rule: ConstraintRule, statusCode: number, logDetail: string): MappedError {
    return {
        statusCode,
        code: rule.code,
        message: rule.message,
        errors: rule.field ? { [rule.field]: [rule.message] } : undefined,
        logDetail,
    };
}

function unavailable(logDetail?: string): MappedError {
    return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: UNAVAILABLE_MESSAGE,
        logDetail,
    };
}

/**
 * PostgreSQL errors the client can fix get a 4xx; connection / capacity problems get 503 so devices and the UI
 * retry; anything else returns undefined and falls through to a plain 500.
 */
function fromPgError(error: PgErrorLike): MappedError | undefined {
    const logDetail = `postgres ${error.code}${error.constraint ? ` constraint=${error.constraint}` : ''}`;

    switch (error.code) {
        case '23505': {
            // unique_violation
            const rule = error.constraint ? UNIQUE_CONSTRAINTS[error.constraint] : undefined;

            return rule
                ? fromRule(rule, HttpStatus.CONFLICT, logDetail)
                : {
                      statusCode: HttpStatus.CONFLICT,
                      code: ErrorCode.DUPLICATE_ENTITY,
                      message: 'Data sudah ada',
                      logDetail,
                  };
        }

        case '23P01':
            // exclusion_violation (e.g. overlapping ranges)
            return {
                statusCode: HttpStatus.CONFLICT,
                code: ErrorCode.DUPLICATE_ENTITY,
                message: 'Data bertabrakan dengan data yang sudah ada',
                logDetail,
            };

        case '23001':
        case '23503': {
            // restrict_violation / foreign_key_violation. Message texts below are PostgreSQL's English ones
            // (default lc_messages), so keep the server's locale on English.
            if (/is not present in table/i.test(error.detail ?? '')) {
                return {
                    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                    code: ErrorCode.REFERENCE_NOT_FOUND,
                    message: 'Data yang dirujuk tidak ditemukan',
                    logDetail,
                };
            }

            const label = error.table ? TABLE_LABELS[error.table] : undefined;

            return {
                statusCode: HttpStatus.CONFLICT,
                code: ErrorCode.RESOURCE_IN_USE,
                message: `Data tidak dapat dihapus karena masih dipakai oleh ${label ?? 'data lain'}`,
                logDetail,
            };
        }

        case '23502':
            // not_null_violation: validation should have caught it, so this is a safety net
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                code: ErrorCode.INVALID_INPUT,
                message: 'Ada data wajib yang belum diisi',
                logDetail,
            };

        case '23514': {
            // check_violation
            const rule = error.constraint ? CHECK_CONSTRAINTS[error.constraint] : undefined;

            return rule
                ? fromRule(rule, HttpStatus.UNPROCESSABLE_ENTITY, logDetail)
                : {
                      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                      code: ErrorCode.BUSINESS_RULE_VIOLATION,
                      message: 'Data melanggar aturan yang berlaku',
                      logDetail,
                  };
        }

        // invalid_text_representation (bad uuid), numeric_value_out_of_range, string_data_right_truncation,
        // invalid_datetime_format, datetime_field_overflow
        case '22P02':
        case '22003':
        case '22001':
        case '22007':
        case '22008':
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                code: ErrorCode.INVALID_INPUT,
                message: 'Format data tidak valid',
                logDetail,
            };

        // serialization_failure, deadlock_detected, lock_not_available: the caller may simply try again
        case '40001':
        case '40P01':
        case '55P03':
            return {
                statusCode: HttpStatus.CONFLICT,
                code: ErrorCode.CONCURRENT_UPDATE,
                message: 'Data sedang diubah oleh proses lain, coba lagi',
                logDetail,
            };

        // query_canceled (statement_timeout) and shutdowns
        case '57014':
        case '57P01':
        case '57P02':
        case '57P03':
            return unavailable(logDetail);
    }

    // class 08 = connection exception, class 53 = insufficient resources (e.g. too many connections)
    if (error.code.startsWith('08') || error.code.startsWith('53')) return unavailable(logDetail);

    return undefined;
}

export function mapException(exception: unknown): MappedError {
    // 1. errors thrown on purpose
    if (exception instanceof AppException) {
        return {
            statusCode: exception.getStatus(),
            code: exception.code,
            message: exception.message,
            errors: exception.errors,
        };
    }

    // 2. validation (the validation pipe throws the ZodError as is)
    if (isZodError(exception)) {
        return {
            statusCode: HttpStatus.BAD_REQUEST,
            code: ErrorCode.VALIDATION_FAILED,
            message: VALIDATION_MESSAGE,
            errors: zodIssuesToFieldErrors(exception.issues),
        };
    }

    // 3. Better Auth errors thrown from `auth.api.*` calls made inside services
    if (isBetterAuthApiError(exception)) return fromBetterAuth(exception);

    // 4. Nest's own exceptions (guards, pipes, unknown routes, ...)
    if (exception instanceof HttpException) return fromHttpException(exception);

    // 5. Express middleware errors (invalid JSON body, payload too large, ...)
    const clientStatus = getExposedClientStatus(exception);

    if (clientStatus !== undefined) return fromExposedClientError(clientStatus, exception as Error);

    // 6. database errors (possibly wrapped by Drizzle)
    const pgError = findInCauseChain(exception, isPgError);

    if (pgError) {
        const mapped = fromPgError(pgError);

        if (mapped) return mapped;
    }

    // 7. database unreachable / pool exhausted
    if (findInCauseChain(exception, isConnectionError)) {
        return unavailable('database connection problem');
    }

    // 8. anything else is a bug: say nothing about it to the client
    return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: INTERNAL_MESSAGE,
        logDetail: pgError ? `postgres ${pgError.code} (unmapped)` : undefined,
    };
}
