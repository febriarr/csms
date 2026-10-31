import type { Request, Response } from 'express';
import { createLoginRateLimiter, LOGIN_BLOCKED_MESSAGE } from './login_rate_limit';
import { buildThrottlerOptions, THROTTLE_WINDOW_MS } from './throttle.config';

describe('buildThrottlerOptions', () => {
    it('should give the API one limit per minute, taken from the configuration', () => {
        const options = buildThrottlerOptions({ THROTTLE_LIMIT: 300 });
        const [throttler] = Array.isArray(options) ? options : options.throttlers;

        expect(throttler).toMatchObject({ name: 'default', ttl: THROTTLE_WINDOW_MS, limit: 300 });
    });
});

/** Lets the promise chain of the limiter run to its end. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('createLoginRateLimiter', () => {
    function setup(blocked: boolean, method = 'POST') {
        const increment = jest.fn().mockResolvedValue({
            totalHits: 1,
            timeToExpire: 60,
            isBlocked: blocked,
            timeToBlockExpire: blocked ? 42 : 0,
        });
        const sent: { status?: number; headers: Record<string, string>; body?: unknown } = { headers: {} };
        const response = {
            status: (code: number) => {
                sent.status = code;
                return response;
            },
            setHeader: (name: string, value: string) => {
                sent.headers[name] = value;
                return response;
            },
            json: (body: unknown) => {
                sent.body = body;
            },
        } as unknown as Response;
        const request = { method, ip: '10.1.2.3', originalUrl: '/api/auth/sign-in/username?x=1' } as Request;
        const next = jest.fn();
        const handler = createLoginRateLimiter({ increment }, 10);

        return { handler, request, response, next, increment, sent };
    }

    it('should let an attempt through while the client is under the limit', async () => {
        const { handler, request, response, next, sent } = setup(false);

        handler(request, response, next);
        await flush();

        expect(next).toHaveBeenCalledWith();
        expect(sent.status).toBeUndefined();
    });

    it('should count per client address, with the configured limit and a block as long as the window', async () => {
        const { handler, request, response, next, increment } = setup(false);

        handler(request, response, next);
        await flush();

        expect(increment).toHaveBeenCalledWith('login:10.1.2.3', THROTTLE_WINDOW_MS, 10, THROTTLE_WINDOW_MS, 'login');
    });

    it('should answer 429 in the API error shape, with Retry-After, once the client is blocked', async () => {
        const { handler, request, response, next, sent } = setup(true);

        handler(request, response, next);
        await flush();

        expect(next).not.toHaveBeenCalled();
        expect(sent.status).toBe(429);
        expect(sent.headers['Retry-After']).toBe('42');
        expect(sent.body).toMatchObject({
            success: false,
            statusCode: 429,
            code: 'TOO_MANY_REQUESTS',
            message: LOGIN_BLOCKED_MESSAGE,
            path: '/api/auth/sign-in/username',
        });
    });

    it('should not count anything that is not a POST, such as the browser preflight', () => {
        const { handler, request, response, next, increment } = setup(false, 'OPTIONS');

        handler(request, response, next);

        expect(next).toHaveBeenCalled();
        expect(increment).not.toHaveBeenCalled();
    });
});
