import type { Env } from '@/config/env.validation';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

export const DEVICE_KEY_HEADER = 'x-device-key';

/**
 * Authenticates the embedded devices, which have no user session. The global auth guard of Better Auth lets a
 * route through only when it is marked `@AllowAnonymous()`; pair that with this guard on the telemetry endpoint so
 * the route is not open to the internet.
 *
 * One shared key (env DEVICE_API_KEY) is compared in constant time. A key per device would need a column on
 * `devices`; this guard is the single place that would change.
 */
@Injectable()
export class DeviceKeyGuard implements CanActivate {
    constructor(private readonly config: ConfigService<Env, true>) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
        const provided = request.headers[DEVICE_KEY_HEADER];
        const expected = this.config.get('DEVICE_API_KEY', { infer: true });

        if (typeof provided !== 'string' || !this.matches(provided, expected)) {
            throw new UnauthorizedException();
        }

        return true;
    }

    /** timingSafeEqual needs equal lengths, so hash-free length check first (it leaks only the key length). */
    private matches(provided: string, expected: string): boolean {
        const a = Buffer.from(provided);
        const b = Buffer.from(expected);

        return a.length === b.length && timingSafeEqual(a, b);
    }
}
