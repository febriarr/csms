import { ErrorCode, type ErrorResponse } from '@workspace/shared';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { THROTTLE_WINDOW_MS } from './throttle.config';

/** Every way of signing in lives under here (`/sign-in/username`, `/sign-in/email`, ...). */
export const LOGIN_PATH = '/api/auth/sign-in';

export const LOGIN_BLOCKED_MESSAGE = 'Terlalu banyak percobaan masuk, coba lagi sebentar lagi';

/**
 * Limits sign-in attempts per client address. A person mistypes a password a few times; a script tries thousands.
 * Every attempt counts, right or wrong: counting only the failures would let an attacker keep guessing until the
 * moment the right guess lands, and would tell them which one it was.
 *
 * It is an Express middleware, not a Nest guard, because Better Auth handles `/api/auth/*` itself and guards never
 * see those requests. It shares the counter store of the general limit, and `req.ip` follows the `trust proxy`
 * setting, so behind a reverse proxy it sees the real client as long as TRUST_PROXY is right.
 */
export function createLoginRateLimiter(storage: ThrottlerStorage, limit: number): RequestHandler {
    return (request: Request, response: Response, next: NextFunction): void => {
        // only a POST tries a password
        if (request.method !== 'POST') return next();

        storage
            .increment(`login:${request.ip ?? 'unknown'}`, THROTTLE_WINDOW_MS, limit, THROTTLE_WINDOW_MS, 'login')
            .then((record) => {
                if (!record.isBlocked) return next();

                const body: ErrorResponse = {
                    success: false,
                    statusCode: 429,
                    code: ErrorCode.TOO_MANY_REQUESTS,
                    message: LOGIN_BLOCKED_MESSAGE,
                    timestamp: new Date().toISOString(),
                    path: request.originalUrl.split('?')[0],
                };

                response
                    .status(429)
                    .setHeader('Retry-After', String(Math.max(1, record.timeToBlockExpire)))
                    .json(body);
            })
            .catch(next);
    };
}
