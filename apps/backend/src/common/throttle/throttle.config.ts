import type { Env } from '@/config/env.validation';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

export const THROTTLE_WINDOW_MS = 60_000;

/**
 * The general limit of the API: requests per minute and per client address, for every route that goes through a Nest
 * controller. The device endpoint and the health check opt out with `@SkipThrottle()`: devices share one address and
 * a device that is cut off looks offline.
 *
 * Signing in is not in this list: Better Auth answers those requests in its own middleware, before any Nest guard
 * runs, so it gets its own stricter limit (see `login_rate_limit.ts`).
 */
export function buildThrottlerOptions(config: Pick<Env, 'THROTTLE_LIMIT'>): ThrottlerModuleOptions {
    return {
        throttlers: [{ name: 'default', ttl: THROTTLE_WINDOW_MS, limit: config.THROTTLE_LIMIT }],
    };
}
