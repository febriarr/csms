import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '@/config/env.validation';
import { DeviceKeyGuard } from './device_key.guard';

const KEY = 'a-device-key-of-32-characters-xx';

const guard = () => new DeviceKeyGuard({ get: () => KEY } as unknown as ConfigService<Env, true>);

const contextWith = (headers: Record<string, string | string[] | undefined>) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as unknown as ExecutionContext;

describe('DeviceKeyGuard', () => {
    it('should let a request with the right key through', () => {
        expect(guard().canActivate(contextWith({ 'x-device-key': KEY }))).toBe(true);
    });

    it('should refuse a wrong key, a key of another length, a missing key and a repeated header', () => {
        for (const headers of [
            { 'x-device-key': 'a-device-key-of-32-characters-xy' },
            { 'x-device-key': 'short' },
            { 'x-device-key': '' },
            {},
            { 'x-device-key': [KEY, KEY] },
        ]) {
            expect(() => guard().canActivate(contextWith(headers))).toThrow(UnauthorizedException);
        }
    });
});
