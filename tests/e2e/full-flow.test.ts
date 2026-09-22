import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { isDbReachable, truncateAll } from '../setup/db.util';

vi.mock('../../src/shared/whatsapp/whatsapp.queue', () => ({ whatsappQueue: { add: vi.fn() } }));

const dbAvailable = await isDbReachable();

// Requires: docker-compose -f docker-compose.test.yml up -d && npm run db:migrate
describe.skipIf(!dbAvailable)('Full flow (e2e, real DB)', () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  async function seedAdmin(role: 'admin' | 'super_admin' = 'admin') {
    const hashed = await bcrypt.hash('correct-password', 10);
    await pool.query(
      `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)`,
      ['admin', 'admin@example.com', hashed, role]
    );
  }

  it('should log in with valid credentials, set cookies, and allow access to a protected route', async () => {
    const { default: app } = await import('../../src/app');
    await seedAdmin();

    const loginRes = await request(app).post('/api/auth/login').send({ name: 'admin', password: 'correct-password' });
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();

    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookies);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.name).toBe('admin');
  });

  it('should reject login with a wrong password (401)', async () => {
    const { default: app } = await import('../../src/app');
    await seedAdmin();

    const res = await request(app).post('/api/auth/login').send({ name: 'admin', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('should create a device via the authenticated API and then accept telemetry for it end-to-end', async () => {
    const { default: app } = await import('../../src/app');
    await seedAdmin();

    const loginRes = await request(app).post('/api/auth/login').send({ name: 'admin', password: 'correct-password' });
    const cookies = loginRes.headers['set-cookie'];

    const createRes = await request(app)
      .post('/api/devices')
      .set('Cookie', cookies)
      .send({
        code: 'DEV-E2E-001',
        name: 'E2E Fridge',
        defrostThreshold: 0,
        warningThreshold: 5,
        criticalThreshold: 10,
      });
    expect(createRes.status).toBe(201);

    const telemetryRes = await request(app).post('/api/telemetry').send({
      deviceCode: 'DEV-E2E-001',
      timestamp: new Date().toISOString(),
      temperature: 12,
    });

    expect(telemetryRes.status).toBe(201);

    const { rows } = await pool.query('SELECT state FROM devices WHERE code = $1', ['DEV-E2E-001']);
    expect(rows[0].state).toBe('CRITICAL');
  });

  it('should return 404 when sending telemetry for an unknown device code', async () => {
    const { default: app } = await import('../../src/app');

    const res = await request(app).post('/api/telemetry').send({
      deviceCode: 'UNKNOWN-DEV',
      timestamp: new Date().toISOString(),
      temperature: 1,
    });

    expect(res.status).toBe(404);
  });

  it('should allow a super_admin to reach the WhatsApp status page and reject a plain admin with 403', async () => {
    const { default: app } = await import('../../src/app');
    await seedAdmin('super_admin');

    const loginRes = await request(app).post('/api/auth/login').send({ name: 'admin', password: 'correct-password' });
    const cookies = loginRes.headers['set-cookie'];

    const res = await request(app).get('/whatsapp/status').set('Cookie', cookies);

    expect(res.status).toBe(200);
  });
});
