import type { ArgumentsHost } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { EntityNotFoundException } from '../exception/app.exception';
import type { ErrorResponse } from '@workspace/shared';
import { AllExceptionsFilter } from './all_exceptions.filter';

type LogCall = { level: 'error' | 'warn'; args: unknown[] };

function setup(options: { headersSent?: boolean; hostType?: string; url?: string } = {}) {
    const replies: { body: ErrorResponse; status: number }[] = [];
    const logs: LogCall[] = [];
    let ended = 0;

    const httpAdapter = {
        reply: (_response: unknown, body: ErrorResponse, status: number) => void replies.push({ body, status }),
        isHeadersSent: () => options.headersSent ?? false,
        end: () => void ended++,
        getRequestUrl: () => options.url ?? '/api/devices?token=secret',
        getRequestMethod: () => 'POST',
    };

    const filter = new AllExceptionsFilter({ httpAdapter } as unknown as HttpAdapterHost);

    // the logger is created inside the class; swap it for one that records
    (filter as unknown as { logger: unknown }).logger = {
        error: (...args: unknown[]) => void logs.push({ level: 'error', args }),
        warn: (...args: unknown[]) => void logs.push({ level: 'warn', args }),
    };

    const host = {
        getType: () => options.hostType ?? 'http',
        switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
    } as unknown as ArgumentsHost;

    return { filter, host, replies, logs, ended: () => ended };
}

/** Runs `fn` with NODE_ENV set to `value` (undefined = unset) and restores it afterwards. */
function withNodeEnv(value: string | undefined, fn: () => void): void {
    const previous = process.env.NODE_ENV;

    if (value === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = value;

    try {
        fn();
    } finally {
        if (previous === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previous;
    }
}

/** What Drizzle throws: its own message carries the SQL and the bound values; the real error is the cause. */
const failedQuery = () => {
    const driver = Object.assign(new Error('relation "nope" does not exist'), { code: '42P01', severity: 'ERROR' });

    return Object.assign(new Error('Failed query: select * from "nope" where phone = $1\nparams: 628123456789'), {
        cause: driver,
    });
};

describe('AllExceptionsFilter: response', () => {
    it('should answer with the standard error shape', () => {
        const { filter, host, replies } = setup();

        filter.catch(new EntityNotFoundException('Device', 'abc'), host);

        expect(replies.length).toBe(1);
        expect(replies[0].status).toBe(404);
        expect(replies[0].body.success).toBe(false);
        expect(replies[0].body.code).toBe('ENTITY_NOT_FOUND');
        expect(replies[0].body.message).toBe('Device dengan ID abc tidak ditemukan');
        expect(replies[0].body.path).toBe('/api/devices');
        expect(Number.isNaN(Date.parse(replies[0].body.timestamp))).toBe(false);
    });

    it('should drop the query string from the path (it can carry tokens)', () => {
        const { filter, host, replies } = setup({ url: '/api/reports?from=2026-10-01&token=secret' });

        filter.catch(new EntityNotFoundException('Laporan'), host);

        expect(replies[0].body.path).toBe('/api/reports');
    });

    it('should include field errors when there are some', () => {
        const { filter, host, replies } = setup();

        filter.catch(
            Object.assign(new Error('x'), { name: 'ZodError', issues: [{ path: ['name'], message: 'Wajib diisi' }] }),
            host,
        );

        expect(replies[0].status).toBe(400);
        expect(replies[0].body.errors).toEqual({ name: ['Wajib diisi'] });
    });
});

describe('AllExceptionsFilter: debug details', () => {
    it('should not leak anything about an unexpected error in production', () => {
        withNodeEnv('production', () => {
            const { filter, host, replies } = setup();

            filter.catch(new Error('password=hunter2'), host);

            expect(replies[0].body.message).toBe('Terjadi kesalahan pada server');
            expect(replies[0].body.debug).toBeUndefined();
            expect(JSON.stringify(replies[0].body).includes('hunter2')).toBe(false);
        });
    });

    it('should fail closed when NODE_ENV is not set', () => {
        withNodeEnv(undefined, () => {
            const { filter, host, replies } = setup();

            filter.catch(new Error('internals'), host);

            expect(replies[0].body.debug).toBeUndefined();
        });
    });

    it('should add debug info to a 5xx in development', () => {
        withNodeEnv('development', () => {
            const { filter, host, replies } = setup();

            filter.catch(new Error('something broke'), host);

            expect(replies[0].body.debug?.message).toBe('something broke');
        });
    });

    it('should never add debug info to a 4xx, even in development', () => {
        withNodeEnv('development', () => {
            const { filter, host, replies } = setup();

            filter.catch(new EntityNotFoundException('Device'), host);

            expect(replies[0].body.debug).toBeUndefined();
        });
    });

    it('should follow NODE_ENV at request time, not at import time (.env is loaded after imports)', () => {
        const { filter, host, replies } = setup(); // built while NODE_ENV is whatever it is now

        withNodeEnv('development', () => filter.catch(new Error('a'), host));
        withNodeEnv('production', () => filter.catch(new Error('b'), host));

        expect(replies[0].body.debug?.message).toBe('a');
        expect(replies[1].body.debug).toBeUndefined();
    });
});

describe('AllExceptionsFilter: logging', () => {
    it('should log a 5xx as error with the cause chain, and keep SQL and bound parameters out', () => {
        const { filter, host, logs } = setup();

        filter.catch(failedQuery(), host);

        expect(logs.length).toBe(1);
        expect(logs[0].level).toBe('error');
        expect(String(logs[0].args[0])).toContain('POST /api/devices -> 500 INTERNAL_ERROR');

        const detail = String(logs[0].args[1]);
        expect(detail).toContain('Caused by: Error: relation "nope" does not exist');
        expect(detail.includes('628123456789')).toBe(false);
        expect(detail.includes('Failed query')).toBe(false);
    });

    it('should still show the message of an error that has no cause', () => {
        const { filter, host, logs } = setup();

        filter.catch(new Error('boom in the service'), host);

        expect(String(logs[0].args[1])).toContain('Error: boom in the service');
    });

    it('should log a 4xx as a one-line warning', () => {
        const { filter, host, logs } = setup();

        filter.catch(
            Object.assign(new Error('dup'), {
                code: '23505',
                severity: 'ERROR',
                constraint: 'devices_code_active_uidx',
            }),
            host,
        );

        expect(logs[0].level).toBe('warn');
        expect(String(logs[0].args[0])).toContain('409 DEVICE_CODE_TAKEN');
    });
});

describe('AllExceptionsFilter: special cases', () => {
    it('should close the stream instead of writing a body when the headers are already out (SSE)', () => {
        const { filter, host, replies, ended } = setup({ headersSent: true });

        filter.catch(new Error('stream broke'), host);

        expect(replies.length).toBe(0);
        expect(ended()).toBe(1);
    });

    it('should log and stay silent for a non-HTTP context', () => {
        const { filter, host, replies, logs } = setup({ hostType: 'rpc' });

        filter.catch(new Error('x'), host);

        expect(replies.length).toBe(0);
        expect(logs[0].level).toBe('error');
    });
});
