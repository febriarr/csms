import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { JwtHelper } from '../../src/shared/utils/jwt.helper';
import { AUTH_CONSTANT } from '../../src/shared/constants';

// app.ts imports the whatsapp queue (BullMQ/ioredis) and whatsapp service via the
// container/routes chain; both connect lazily and don't block these HTTP-only tests,
// but we mock the queue's `add` so no background connection attempt is made either way.
vi.mock('../../src/shared/whatsapp/whatsapp.queue', () => ({ whatsappQueue: { add: vi.fn() } }));

const { default: app } = await import('../../src/app');

describe('HTTP layer (e2e, no live DB required)', () => {
  describe('POST /api/telemetry - validation', () => {
    it('should reject a payload missing required fields with 400 before touching the database', async () => {
      const res = await request(app).post('/api/telemetry').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject a deviceCode shorter than the minimum length with 400', async () => {
      const res = await request(app)
        .post('/api/telemetry')
        .send({ deviceCode: 'AB', timestamp: new Date().toISOString(), temperature: 1 });

      expect(res.status).toBe(400);
    });

    it('should reject an out-of-range temperature with 400', async () => {
      const res = await request(app)
        .post('/api/telemetry')
        .send({ deviceCode: 'DEV-001', timestamp: new Date().toISOString(), temperature: 999 });

      expect(res.status).toBe(400);
    });
  });

  describe('Protected API routes - authentication gate', () => {
    it('should reject POST /api/devices with 401/redirect when there is no auth cookie', async () => {
      const res = await request(app).post('/api/devices').send({});

      // authenticate middleware redirects to /pages/login (see middleware/authenticate.middleware.ts);
      // supertest does not follow redirects by default, so we see the 302 directly.
      expect([302, 401]).toContain(res.status);
    });

    it('should reject DELETE /api/devices/:id without an auth cookie', async () => {
      const res = await request(app).delete('/api/devices/00000000-0000-0000-0000-000000000000');

      expect([302, 401]).toContain(res.status);
    });
  });

  describe('Protected web routes - authentication gate', () => {
    it('should redirect GET /dashboard to the login page when unauthenticated', async () => {
      const res = await request(app).get('/dashboard');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/pages/login');
    });
  });

  describe('Unknown routes', () => {
    it('should redirect an unauthenticated request to an unknown path to the login page (web router matches "/" wildcard before 404)', async () => {
      // Note: web.route.ts mounts `router.use(authenticate)` with no path prefix, so any
      // unmatched path under the web router hits the auth gate before ever reaching
      // app.ts's notFoundHandler. A genuine 404 only happens for an authenticated request
      // to an unknown path (see the next test) — this is a real behavior of the route
      // ordering, not a test artifact.
      const res = await request(app).get('/this-route-does-not-exist');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/pages/login');
    });

    it('should return 404 for an unknown path when authenticated', async () => {
      const token = JwtHelper.generateAccessToken({ sub: 'user-1', name: 'admin', role: 'admin' });
      const res = await request(app)
        .get('/this-route-does-not-exist')
        .set('Cookie', [`${AUTH_CONSTANT.ACCESS_TOKEN_COOKIE}=${token}`]);

      expect(res.status).toBe(404);
    });
  });

  describe('Public routes', () => {
    it('should render the login page without requiring authentication', async () => {
      const res = await request(app).get('/pages/login');

      expect(res.status).toBe(200);
    });
  });
});
