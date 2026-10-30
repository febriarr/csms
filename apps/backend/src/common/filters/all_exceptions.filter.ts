import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ErrorResponse } from '@workspace/shared';
import { mapException } from '../exception/error_mapper';
import type { Request, Response } from 'express';

/**
 * The single place every failed HTTP request ends up. `mapException` decides WHAT the client sees; this class only
 * logs and writes the response. Going through HttpAdapterHost keeps it independent of Express / Fastify.
 *
 * Register it once in AppModule (so it can use dependency injection):
 *
 *   providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }]
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        if (host.getType() !== 'http') {
            // This API only serves HTTP; anything else (ws / rpc) is logged and left alone.
            this.logger.error('Unhandled exception outside HTTP context', this.describe(exception));

            return;
        }

        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();
        const request: Request = ctx.getRequest();
        const response: Response = ctx.getResponse();

        const mapped = mapException(exception);
        const path = String(httpAdapter.getRequestUrl(request)).split('?')[0];

        this.log(exception, mapped.statusCode, `${httpAdapter.getRequestMethod(request)} ${path}`, mapped);

        // A stream / SSE response may already be on its way: all that is left is to close it.
        if (httpAdapter.isHeadersSent(response)) {
            httpAdapter.end(response);

            return;
        }

        const body: ErrorResponse = {
            success: false,
            statusCode: mapped.statusCode,
            code: mapped.code,
            message: mapped.message,
            errors: mapped.errors,
            timestamp: new Date().toISOString(),
            path,
            debug: this.debugOf(exception, mapped.statusCode),
        };

        httpAdapter.reply(response, body, mapped.statusCode);
    }

    /**
     * Debug details are opt-IN: only when NODE_ENV is exactly "development", and only for 5xx.
     *
     * Read per request on purpose. A module-level `const` would be evaluated when this file is imported, which is
     * BEFORE ConfigModule has loaded `.env` into process.env: with NODE_ENV defined only in `.env`, a production
     * server would still send stack traces. Opt-in also means an unset NODE_ENV fails closed.
     */
    private debugOf(exception: unknown, statusCode: number): ErrorResponse['debug'] {
        if (process.env.NODE_ENV !== 'development' || statusCode < 500) return undefined;

        if (exception instanceof Error) return { message: exception.message, stack: exception.stack };

        return { message: String(exception) };
    }

    private log(exception: unknown, statusCode: number, route: string, mapped: { code: string; logDetail?: string }) {
        const summary = `${route} -> ${statusCode} ${mapped.code}${mapped.logDetail ? ` (${mapped.logDetail})` : ''}`;

        if (statusCode >= 500) {
            this.logger.error(summary, this.describe(exception));
        } else {
            this.logger.warn(summary);
        }
    }

    /**
     * What goes to the log: the call-site stack frames plus the `cause` chain, so a failed query shows the PostgreSQL
     * error underneath. When there is a cause, the exception's OWN message is left out: Drizzle puts the SQL and the
     * bound parameters in it (phone numbers, e-mail addresses, password hashes).
     */
    private describe(exception: unknown): string {
        if (!(exception instanceof Error)) return String(exception);

        let cause = (exception as { cause?: unknown }).cause;

        const lines = [cause instanceof Error ? exception.name : `${exception.name}: ${exception.message}`];

        for (let depth = 0; depth < 5 && cause instanceof Error; depth++) {
            lines.push(`Caused by: ${cause.name}: ${cause.message}`);
            cause = (cause as { cause?: unknown }).cause;
        }

        const frames = (exception.stack ?? '').split('\n').filter((line) => line.trimStart().startsWith('at '));

        return [...lines, ...frames].join('\n');
    }
}
