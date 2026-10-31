// must come first: it sets the limits before the app module reads the environment
import { GENERAL_LIMIT, LOGIN_LIMIT } from './support/strict-limits';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { ADMIN, createTestApp, DEVICE_KEY, resetDatabase, WEB_URL } from './support/app';

describe('Rate limiting (e2e)', () => {
    let app: NestExpressApplication;

    const login = (password: string) =>
        request(app.getHttpServer())
            .post('/api/auth/sign-in/username')
            .set('Origin', WEB_URL)
            .send({ username: ADMIN.username, password });

    beforeAll(async () => {
        await resetDatabase();
        app = await createTestApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should turn a sixth login attempt away, even with the right password', async () => {
        for (let attempt = 0; attempt < LOGIN_LIMIT; attempt++) {
            await login('wrong-password').expect(401);
        }

        await login(ADMIN.password).expect(429);
    });

    it('should not let login attempts use up the general limit of other endpoints', async () => {
        await request(app.getHttpServer()).get('/api/overview').expect(401);
    });

    it('should never rate limit the device endpoint, however many readings arrive', async () => {
        for (let reading = 0; reading < GENERAL_LIMIT + 10; reading++) {
            const response = await request(app.getHttpServer())
                .post('/api/temperature')
                .set('x-device-key', DEVICE_KEY)
                .send({ deviceCode: 'NOPE-01', timestamp: new Date().toISOString(), temperature: -20 });

            expect(response.status).not.toBe(429);
        }
    });

    it('should never rate limit the health check', async () => {
        for (let check = 0; check < GENERAL_LIMIT + 10; check++) {
            await request(app.getHttpServer()).get('/api/health').expect(200);
        }
    });

    it('should turn away requests over the general limit with 429', async () => {
        const statuses: number[] = [];

        for (let call = 0; call < GENERAL_LIMIT + 5; call++) {
            statuses.push((await request(app.getHttpServer()).get('/api/overview')).status);
        }

        expect(statuses.at(-1)).toBe(429);
        expect(statuses.filter((status) => status === 429).length).toBeGreaterThanOrEqual(5);
    });
});
