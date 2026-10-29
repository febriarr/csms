import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error_codes';
import type { FieldErrors } from './error_response.type';

export type AppExceptionOptions = {
    code: ErrorCode;
    errors?: FieldErrors;
    cause?: unknown;
};

/**
 * Base class of every error the application throws ON PURPOSE: the client did something it can fix or understand.
 * It is an HttpException so Nest's own machinery (guards, interceptors) treats it normally; the filter adds `code`
 * and `errors` to the response.
 */
export class AppException extends HttpException {
    readonly code: ErrorCode;
    readonly errors?: FieldErrors;

    constructor(message: string, status: HttpStatus, options: AppExceptionOptions) {
        super(message, status, { cause: options.cause });

        this.code = options.code;
        this.errors = options.errors;
    }
}

/** 404 — a row the request refers to does not exist. */
export class EntityNotFoundException extends AppException {
    constructor(entity: string, id?: string, code: ErrorCode = ErrorCode.ENTITY_NOT_FOUND) {
        super(id ? `${entity} dengan ID ${id} tidak ditemukan` : `${entity} tidak ditemukan`, HttpStatus.NOT_FOUND, {
            code,
        });
    }
}

/** 409 — creating or renaming something that would collide with an existing row. */
export class DuplicateEntityException extends AppException {
    constructor(message: string, options: { code?: ErrorCode; field?: string } = {}) {
        super(message, HttpStatus.CONFLICT, {
            code: options.code ?? ErrorCode.DUPLICATE_ENTITY,
            errors: options.field ? { [options.field]: [message] } : undefined,
        });
    }
}

/** 409 — deleting something that other rows still depend on. */
export class ResourceInUseException extends AppException {
    constructor(message: string) {
        super(message, HttpStatus.CONFLICT, { code: ErrorCode.RESOURCE_IN_USE });
    }
}

/** 422 — the request is well-formed but the domain refuses it (e.g. ending a pause that already ended). */
export class BusinessRuleException extends AppException {
    constructor(message: string, options: { code?: ErrorCode; errors?: FieldErrors } = {}) {
        super(message, HttpStatus.UNPROCESSABLE_ENTITY, {
            code: options.code ?? ErrorCode.BUSINESS_RULE_VIOLATION,
            errors: options.errors,
        });
    }
}

/** 400 — input failed validation. Normally the validation pipe throws a ZodError (the filter handles it too). */
export class ValidationException extends AppException {
    constructor(errors: FieldErrors, message = 'Data yang dikirim tidak valid') {
        super(message, HttpStatus.BAD_REQUEST, { code: ErrorCode.VALIDATION_FAILED, errors });
    }
}
