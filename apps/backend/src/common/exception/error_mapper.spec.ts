import {
    HttpException,
    NotFoundException,
    UnauthorizedException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import {
    BusinessRuleException,
    DuplicateEntityException,
    EntityNotFoundException,
    ResourceInUseException,
    ValidationException,
} from './app.exception';
import { ErrorCode } from '@workspace/shared';
import { mapException } from './error_mapper';

/** Shapes the drivers really produce, so the mapper is tested without a database. */
const pgError = (fields: { code: string; constraint?: string; table?: string; detail?: string }) =>
    Object.assign(new Error('pg error'), { severity: 'ERROR', ...fields });

/** Drizzle wraps the driver error and puts SQL + parameters in its own message. */
const drizzleWrapped = (cause: unknown) =>
    Object.assign(new Error('Failed query: insert into "devices" ... params: 628123456789'), { cause });

class APIError extends Error {
    constructor(
        readonly statusCode: number,
        readonly body: { message?: string; code?: string },
    ) {
        super(body.message);
        this.name = 'APIError';
    }
}

describe('mapException: errors thrown on purpose', () => {
    it('should keep status, code and message of an AppException', () => {
        expect(mapException(new EntityNotFoundException('Device', 'abc'))).toEqual({
            statusCode: 404,
            code: ErrorCode.ENTITY_NOT_FOUND,
            message: 'Device dengan ID abc tidak ditemukan',
            errors: undefined,
        });
        expect(mapException(new EntityNotFoundException('Cold storage')).message).toBe('Cold storage tidak ditemukan');
    });

    it('should map each subclass to its status', () => {
        expect(mapException(new DuplicateEntityException('Kode sudah ada', { field: 'code' }))).toEqual({
            statusCode: 409,
            code: ErrorCode.DUPLICATE_ENTITY,
            message: 'Kode sudah ada',
            errors: { code: ['Kode sudah ada'] },
        });
        expect(mapException(new ResourceInUseException('Masih dipakai')).statusCode).toBe(409);
        expect(mapException(new BusinessRuleException('Tidak boleh')).statusCode).toBe(422);
        expect(mapException(new BusinessRuleException('Tidak boleh')).code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
        expect(mapException(new ValidationException({ name: ['Wajib diisi'] })).statusCode).toBe(400);
    });
});

describe('mapException: validation', () => {
    it('should turn zod issues into per-field messages, with "_root" for form-level ones', () => {
        const schema = z
            .object({ name: z.string().min(1, 'Nama wajib diisi'), nested: z.object({ id: z.string() }) })
            .refine(() => false, { message: 'Form tidak valid' });

        const result = schema.safeParse({ name: '', nested: {} });
        expect(result.success).toBe(false);

        const mapped = mapException(result.error);
        expect(mapped.statusCode).toBe(400);
        expect(mapped.code).toBe(ErrorCode.VALIDATION_FAILED);
        expect(mapped.errors?.name).toEqual(['Nama wajib diisi']);
        expect(Object.keys(mapped.errors ?? {}).includes('nested.id')).toBe(true);
    });

    it('should recognise a zod error from another copy of zod (no instanceof)', () => {
        const foreign = Object.assign(new Error('x'), {
            name: 'ZodError',
            issues: [{ path: ['a', 0], message: 'bad' }],
        });
        expect(mapException(foreign).errors).toEqual({ 'a.0': ['bad'] });
    });
});

describe('mapException: Nest exceptions', () => {
    it('should replace Nest default English texts with Indonesian ones', () => {
        expect(mapException(new UnauthorizedException())).toEqual({
            statusCode: 401,
            code: ErrorCode.UNAUTHORIZED,
            message: 'Anda belum login atau sesi Anda telah berakhir',
            errors: undefined,
        });
        expect(mapException(new ForbiddenException()).code).toBe(ErrorCode.FORBIDDEN);
        expect(mapException(new NotFoundException('Cannot GET /nope')).message).toBe(
            'Data atau halaman yang diminta tidak ditemukan',
        );
    });

    it('should keep a message somebody wrote on purpose', () => {
        expect(mapException(new NotFoundException('Device tidak ditemukan')).message).toBe('Device tidak ditemukan');
        expect(mapException(new BadRequestException('Format tanggal salah')).message).toBe('Format tanggal salah');
    });

    it('should treat an array of messages as validation errors', () => {
        const mapped = mapException(new BadRequestException(['name must be a string', 'email must be an email']));
        expect(mapped.code).toBe(ErrorCode.VALIDATION_FAILED);
        expect(mapped.message).toBe('Data yang dikirim tidak valid');
        expect(mapped.errors).toEqual({ _root: ['name must be a string', 'email must be an email'] });
    });

    it('should never show the text of a plain 500, but keep other 5xx statuses', () => {
        expect(mapException(new HttpException('SELECT secret FROM somewhere', 500)).message).toBe(
            'Terjadi kesalahan pada server',
        );
        expect(mapException(new HttpException('Sedang maintenance', 503))).toEqual({
            statusCode: 503,
            code: ErrorCode.SERVICE_UNAVAILABLE,
            message: 'Sedang maintenance',
            errors: undefined,
        });
    });
});

describe('mapException: Better Auth', () => {
    it('should use the status and message of an APIError', () => {
        const mapped = mapException(new APIError(400, { message: 'Invalid password', code: 'INVALID_PASSWORD' }));
        expect(mapped.statusCode).toBe(400);
        expect(mapped.message).toBe('Invalid password');
        expect(mapped.logDetail).toBe('better-auth code INVALID_PASSWORD');
    });

    it('should hide the text of a 500 APIError', () => {
        expect(mapException(new APIError(500, { message: 'boom internals' })).message).toBe(
            'Terjadi kesalahan pada server',
        );
    });
});

describe('mapException: PostgreSQL', () => {
    it('should turn a known unique violation into a field-level 409', () => {
        const mapped = mapException(pgError({ code: '23505', constraint: 'devices_code_active_uidx' }));
        expect(mapped).toEqual({
            statusCode: 409,
            code: ErrorCode.DEVICE_CODE_TAKEN,
            message: 'Kode device sudah digunakan',
            errors: { code: ['Kode device sudah digunakan'] },
            logDetail: 'postgres 23505 constraint=devices_code_active_uidx',
        });
    });

    it('should find the driver error inside the Drizzle wrapper', () => {
        const mapped = mapException(drizzleWrapped(pgError({ code: '23505', constraint: 'divisions_name_unique' })));
        expect(mapped.code).toBe(ErrorCode.DIVISION_NAME_TAKEN);
        expect(mapped.message).toBe('Nama divisi sudah digunakan');
    });

    it('should answer an unknown unique constraint generically', () => {
        const mapped = mapException(pgError({ code: '23505', constraint: 'something_new_uidx' }));
        expect(mapped.statusCode).toBe(409);
        expect(mapped.code).toBe(ErrorCode.DUPLICATE_ENTITY);
        expect(mapped.message).toBe('Data sudah ada');
    });

    it('should say what still uses a row that cannot be deleted', () => {
        const mapped = mapException(
            pgError({
                code: '23503',
                table: 'devices',
                detail: 'Key (id)=(1) is still referenced from table "devices".',
            }),
        );
        expect(mapped.statusCode).toBe(409);
        expect(mapped.code).toBe(ErrorCode.RESOURCE_IN_USE);
        expect(mapped.message).toBe('Data tidak dapat dihapus karena masih dipakai oleh device');
    });

    it('should fall back to "data lain" for a table without a label', () => {
        const mapped = mapException(
            pgError({ code: '23503', table: 'brand_new_table', detail: 'is still referenced' }),
        );
        expect(mapped.message).toBe('Data tidak dapat dihapus karena masih dipakai oleh data lain');
    });

    it('should treat a missing referenced row as a 422, not as "in use"', () => {
        const mapped = mapException(
            pgError({
                code: '23503',
                table: 'devices',
                detail: 'Key (cold_storage_id)=(1) is not present in table "cold_storages".',
            }),
        );
        expect(mapped.statusCode).toBe(422);
        expect(mapped.code).toBe(ErrorCode.REFERENCE_NOT_FOUND);
    });

    it('should explain a known check violation', () => {
        const mapped = mapException(pgError({ code: '23514', constraint: 'devices_threshold_order_chk' }));
        expect(mapped.statusCode).toBe(422);
        expect(mapped.code).toBe(ErrorCode.INVALID_THRESHOLD_ORDER);
        expect(mapped.errors).toEqual({ warningThreshold: ['Urutan batas suhu harus defrost < warning < critical'] });
    });

    it('should give a safe 422 for an unknown check constraint', () => {
        expect(mapException(pgError({ code: '23514', constraint: 'nope_chk' })).message).toBe(
            'Data melanggar aturan yang berlaku',
        );
    });

    it('should map malformed values (e.g. a bad uuid in the path) to 400', () => {
        for (const code of ['22P02', '22003', '22001', '22007', '22008']) {
            expect(mapException(pgError({ code })).statusCode).toBe(400);
        }
    });

    it('should let the caller retry after a deadlock or serialization failure', () => {
        expect(mapException(pgError({ code: '40P01' })).code).toBe(ErrorCode.CONCURRENT_UPDATE);
        expect(mapException(pgError({ code: '40001' })).statusCode).toBe(409);
    });

    it('should answer 503 for timeouts, shutdowns and connection / capacity problems', () => {
        for (const code of ['57014', '57P01', '57P03', '08006', '53300']) {
            const mapped = mapException(pgError({ code }));
            expect(mapped.statusCode).toBe(503);
            expect(mapped.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
        }
    });

    it('should answer 500 for a database error nobody mapped, and say nothing about it', () => {
        const mapped = mapException(drizzleWrapped(pgError({ code: '42P01' })));
        expect(mapped.statusCode).toBe(500);
        expect(mapped.message).toBe('Terjadi kesalahan pada server');
        expect(mapped.logDetail).toBe('postgres 42P01 (unmapped)');
        expect(JSON.stringify(mapped).includes('628123456789')).toBe(false);
    });
});

describe('mapException: infrastructure and unknown errors', () => {
    it('should answer 503 when the database cannot be reached', () => {
        expect(
            mapException(drizzleWrapped(Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }))).statusCode,
        ).toBe(503);
        expect(mapException(new Error('timeout exceeded when trying to connect')).statusCode).toBe(503);
        expect(mapException(new Error('Connection terminated unexpectedly')).statusCode).toBe(503);
    });

    it('should not mistake a Node system error for a SQLSTATE (EPERM is also 5 characters)', () => {
        const mapped = mapException(Object.assign(new Error('operation not permitted'), { code: 'EPERM' }));
        expect(mapped.statusCode).toBe(500);
        expect(mapped.logDetail).toBeUndefined();
    });

    it('should hide the text of any other error', () => {
        const mapped = mapException(new Error('password=hunter2 leaked in message'));
        expect(mapped).toEqual({
            statusCode: 500,
            code: ErrorCode.INTERNAL_ERROR,
            message: 'Terjadi kesalahan pada server',
            logDetail: undefined,
        });
    });

    it('should cope with values that are not errors at all', () => {
        expect(mapException('just a string').statusCode).toBe(500);
        expect(mapException(undefined).statusCode).toBe(500);
        expect(mapException(null).statusCode).toBe(500);
        expect(
            mapException({ code: '23505', severity: 'ERROR', constraint: 'devices_code_active_uidx' }).statusCode,
        ).toBe(409);
    });
});

describe('mapException: additions in the project version', () => {
    it('should replace the English text of ParseUUIDPipe / ParseIntPipe failures', () => {
        const mapped = mapException(new BadRequestException('Validation failed (uuid is expected)'));
        expect(mapped.statusCode).toBe(400);
        expect(mapped.code).toBe(ErrorCode.INVALID_INPUT);
        expect(mapped.message).toBe('Format parameter tidak valid');
    });

    it('should recognise the Throttler default message and answer in Indonesian', () => {
        const mapped = mapException(new HttpException('ThrottlerException: Too Many Requests', 429));
        expect(mapped.code).toBe(ErrorCode.TOO_MANY_REQUESTS);
        expect(mapped.message).toBe('Terlalu banyak permintaan, coba lagi nanti');
    });

    it('should treat Express middleware errors (invalid body, payload too large) as client errors', () => {
        const tooLarge = Object.assign(new Error('request entity too large'), {
            status: 413,
            statusCode: 413,
            expose: true,
            type: 'entity.too.large',
        });
        expect(mapException(tooLarge)).toEqual({
            statusCode: 413,
            code: ErrorCode.INVALID_INPUT,
            message: 'Ukuran data terlalu besar',
            logDetail: 'http error entity.too.large',
        });
    });

    it('should not trust an error that merely has a 4xx status without expose', () => {
        expect(mapException(Object.assign(new Error('x'), { statusCode: 400 })).statusCode).toBe(500);
        expect(mapException(Object.assign(new Error('x'), { statusCode: 500, expose: true })).statusCode).toBe(500);
    });

    it('should hide the text of any 5xx Better Auth error', () => {
        expect(mapException(new APIError(502, { message: 'upstream details' })).message).toBe(
            'Terjadi kesalahan pada server',
        );
    });

    it('should map lock timeouts to a retryable 409 and exclusion violations to 409', () => {
        expect(mapException(pgError({ code: '55P03' })).code).toBe(ErrorCode.CONCURRENT_UPDATE);
        expect(mapException(pgError({ code: '23P01' })).statusCode).toBe(409);
    });

    it('should map restrict_violation like a foreign key violation', () => {
        const mapped = mapException(pgError({ code: '23001', table: 'devices', detail: 'is still referenced' }));
        expect(mapped.code).toBe(ErrorCode.RESOURCE_IN_USE);
    });

    it('should answer a NOT NULL violation with 400', () => {
        const mapped = mapException(pgError({ code: '23502' }));
        expect(mapped.statusCode).toBe(400);
        expect(mapped.message).toBe('Ada data wajib yang belum diisi');
    });
});
