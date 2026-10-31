import type { Env } from '@/config/env.validation';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage } from '@nestjs/throttler';
import { createLoginRateLimiter, LOGIN_PATH } from './common/throttle/login_rate_limit';

/**
 * Everything `main.ts` does to the app before it listens. It lives here so the end-to-end tests start the app the
 * same way production does: the same prefix, the same CORS rules, the same proxy setting.
 */
export function configureApp(app: NestExpressApplication): void {
    const config = app.get<ConfigService<Env, true>>(ConfigService);

    app.setGlobalPrefix('api');
    app.enableCors({
        origin: [config.get('WEB_URL', { infer: true })], // URL Vite
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        // lets the browser read the file name of a report download
        exposedHeaders: ['Content-Disposition'],
    });

    // Behind a reverse proxy the socket address is the proxy, not the user: the rate limit must see the real client.
    app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));

    // after CORS, so the 429 of a blocked sign-in still carries the headers the browser needs to read it
    app.use(
        LOGIN_PATH,
        createLoginRateLimiter(
            app.get<ThrottlerStorage>(ThrottlerStorage),
            config.get('THROTTLE_LOGIN_LIMIT', { infer: true }),
        ),
    );

    app.enableShutdownHooks();
}
