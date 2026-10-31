import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { DatabaseService } from '../src/database/database.service';
import { DeviceOfflineService } from '../src/device/device_offline.service';
import { TemperatureRetentionService } from '../src/temperature/temperature_retention.service';
import { ADMIN, createTestApp, DEVICE_KEY, resetDatabase, WEB_URL } from './support/app';

type Body = { success: boolean; data: any; metadata?: any };

/**
 * The path a reading takes from a device to the person who must act on it, against a real database:
 * sign in -> master data -> device ingest -> state change -> alert -> overview -> acknowledge -> pause -> offline.
 * Each step relies on the one before it, so the tests are meant to run in order.
 */
describe('Critical flow (e2e)', () => {
    let app: NestExpressApplication;
    let api: TestAgent; // signed in as the super admin
    let anonymous: TestAgent;
    let deviceId: string;
    let alertId: string;

    const BASE = Date.now();
    const at = (offsetMs: number) => new Date(BASE + offsetMs).toISOString();

    const ingest = (temperature: number, offsetMs: number, key: string | null = DEVICE_KEY) => {
        const req = anonymous.post('/api/temperature');

        if (key) req.set('x-device-key', key);

        return req.send({ deviceCode: 'E2E-01', timestamp: at(offsetMs), temperature });
    };

    const overview = async () => ((await api.get('/api/overview').expect(200)).body as Body).data;

    beforeAll(async () => {
        await resetDatabase();
        app = await createTestApp();

        anonymous = request(app.getHttpServer());
        api = request.agent(app.getHttpServer());
    });

    afterAll(async () => {
        await app.close();
    });

    describe('access', () => {
        it('should refuse every protected endpoint without a session', async () => {
            for (const path of [
                '/api/overview',
                '/api/alert',
                '/api/device',
                '/api/division',
                '/api/diagnostic/today',
            ]) {
                await anonymous.get(path).expect(401);
            }
        });

        it('should refuse a wrong password and sign the super admin in with the right one', async () => {
            await anonymous
                .post('/api/auth/sign-in/username')
                .set('Origin', WEB_URL)
                .send({ username: ADMIN.username, password: 'not-the-password' })
                .expect(401);

            await api
                .post('/api/auth/sign-in/username')
                .set('Origin', WEB_URL)
                .send({ username: ADMIN.username, password: ADMIN.password })
                .expect(200);

            const session = await api.get('/api/auth/get-session').expect(200);

            expect((session.body as { user: { role: string } }).user.role).toBe('super_admin');
        });

        it('should answer the health check without a session', async () => {
            const response = await anonymous.get('/api/health').expect(200);

            expect(response.body).toMatchObject({
                status: 'ok',
                checks: { database: { status: 'up' }, scheduler: { status: 'up' }, whatsapp: { status: 'disabled' } },
            });
        });
    });

    describe('device endpoint', () => {
        it('should refuse a reading without the device key, and with a wrong one', async () => {
            await ingest(-22, -180_000, null).expect(401);
            await ingest(-22, -180_000, 'wrong-key-wrong-key').expect(401);
        });

        it('should refuse a reading from a device that does not exist', async () => {
            await ingest(-22, -180_000).expect(404);
        });
    });

    describe('master data', () => {
        it('should create a location, a cold room and a device with thresholds', async () => {
            const divisions = (await api.get('/api/division').expect(200)).body as Body;
            const division = (divisions.data as { id: string; name: string }[]).find((d) => d.name === 'Warehouse');

            expect(division).toBeDefined();

            const location = (
                (await api.post('/api/location').send({ divisionId: division!.id, name: 'Gudang E2E' }).expect(201))
                    .body as Body
            ).data;
            const coldStorage = (
                (await api.post('/api/cold-storage').send({ locationId: location.id, name: 'Chiller E2E' }).expect(201))
                    .body as Body
            ).data;
            const device = (
                (
                    await api
                        .post('/api/device')
                        .send({
                            code: 'E2E-01',
                            name: 'Freezer E2E',
                            coldStorageId: coldStorage.id,
                            pointLabel: 'Pintu',
                            warningThreshold: -15,
                            criticalThreshold: -5,
                            heartbeatIntervalSeconds: 30,
                        })
                        .expect(201)
                ).body as Body
            ).data;

            deviceId = device.id;
            expect(device).toMatchObject({ code: 'E2E-01', state: 'NORMAL' });
        });

        it('should refuse thresholds in the wrong order', async () => {
            const coldStorages = (await api.get('/api/cold-storage').expect(200)).body as Body;

            await api
                .post('/api/device')
                .send({
                    code: 'E2E-BAD',
                    name: 'Bad thresholds',
                    coldStorageId: coldStorages.data[0].id,
                    warningThreshold: -5,
                    criticalThreshold: -15,
                })
                .expect(400);
        });
    });

    describe('reading to alert', () => {
        it('should refuse a reading that is not valid', async () => {
            await anonymous
                .post('/api/temperature')
                .set('x-device-key', DEVICE_KEY)
                .send({ deviceCode: 'E2E-01', timestamp: at(-170_000), temperature: 'hot' })
                .expect(400);
        });

        it('should store a normal reading without raising an alert', async () => {
            const response = await ingest(-22, -180_000).expect(201);

            expect((response.body as Body).data).toMatchObject({ deviceId, temperature: -22, duplicate: false });
            expect(((await api.get('/api/alert').expect(200)).body as Body).metadata.totalItems).toBe(0);
        });

        it('should treat a retry of the same moment as a success, not as a second reading', async () => {
            const response = await ingest(-22, -180_000).expect(201);

            expect((response.body as Body).data.duplicate).toBe(true);

            const rows = await app
                .get(DatabaseService)
                .db.execute(sql`select count(*)::int as total from temperature_logs`);

            expect((rows.rows[0] as { total: number }).total).toBe(1);
        });

        it('should raise one critical alert when the temperature crosses the critical limit', async () => {
            await ingest(-3, -120_000).expect(201);

            const device = ((await api.get(`/api/device/${deviceId}`).expect(200)).body as Body).data;
            const alerts = ((await api.get('/api/alert?acknowledged=false').expect(200)).body as Body).data;

            expect(device.state).toBe('CRITICAL');
            expect(alerts).toHaveLength(1);
            expect(alerts[0]).toMatchObject({ deviceId, fromState: 'NORMAL', toState: 'CRITICAL', temperature: -3 });

            alertId = alerts[0].id;
        });

        it('should not raise a second alert while the device stays critical', async () => {
            await ingest(-2, -90_000).expect(201);

            expect(((await api.get('/api/alert').expect(200)).body as Body).metadata.totalItems).toBe(1);
        });
    });

    describe('overview', () => {
        it('should show the critical device, the open alert and the cold room with a problem in one response', async () => {
            const data = await overview();

            expect(data.devices.byState.CRITICAL).toBe(1);
            expect(data.devices).toMatchObject({ total: 1, monitored: 1, online: 1, paused: 0 });
            expect(data.openAlerts).toEqual({ total: 1, critical: 1, warning: 0, offline: 0 });
            expect(data.needsAttention[0]).toMatchObject({ id: alertId, deviceCode: 'E2E-01', toState: 'CRITICAL' });
            expect(data.problemColdStorages[0]).toMatchObject({
                name: 'Chiller E2E',
                worstState: 'CRITICAL',
                deviceCount: 1,
                problemDeviceCount: 1,
            });
            expect(data.problemColdStorages[0].worstDevice).toMatchObject({ code: 'E2E-01', temperature: -2 });
        });

        it('should fill the whole 24 hour chart and count the alert in it', async () => {
            const data = await overview();

            expect(data.alertsLast24h).toHaveLength(24);
            expect(data.alertsLast24h.reduce((sum: number, b: { critical: number }) => sum + b.critical, 0)).toBe(1);
        });

        it('should report notifications and WhatsApp without exposing the pairing code', async () => {
            const { notifications } = await overview();

            expect(notifications.whatsapp).toEqual({ enabled: false, connected: false });
            expect(notifications.today).toEqual({ pending: 0, success: 0, failed: 0 });
        });
    });

    describe('acknowledge', () => {
        it('should acknowledge an alert, and keep the first acknowledgement on a second try', async () => {
            const first = ((await api.patch(`/api/alert/${alertId}/acknowledge`).expect(200)).body as Body).data;
            const second = ((await api.patch(`/api/alert/${alertId}/acknowledge`).expect(200)).body as Body).data;

            expect(first.acknowledgedAt).not.toBeNull();
            expect(second.acknowledgedAt).toBe(first.acknowledgedAt);
        });

        it('should answer 404 for an alert that does not exist', async () => {
            await api.patch('/api/alert/0198f0a0-0000-7000-8000-000000000000/acknowledge').expect(404);
        });

        it('should drop the alert from the overview, while the device stays critical', async () => {
            const data = await overview();

            expect(data.openAlerts.total).toBe(0);
            expect(data.needsAttention).toEqual([]);
            expect(data.devices.byState.CRITICAL).toBe(1);
        });
    });

    describe('planned pause', () => {
        it('should store a reading during a pause but raise no alert and keep the state', async () => {
            // started just before the reading, which must fall inside it: a pause only covers readings recorded after it begins
            await api
                .post('/api/monitoring-pause')
                .send({ deviceId, kind: 'MAINTENANCE', startsAt: at(-80_000) })
                .expect(201);

            // back to normal during the pause: without it this would be a recovery alert
            await ingest(-22, -60_000).expect(201);

            const device = ((await api.get(`/api/device/${deviceId}`).expect(200)).body as Body).data;

            expect(device.state).toBe('CRITICAL');
            expect(device.monitoring.status).toBe('PAUSED');
            expect(((await api.get('/api/alert').expect(200)).body as Body).metadata.totalItems).toBe(1);
            const rows = await app
                .get(DatabaseService)
                .db.execute(sql`select evaluation from temperature_logs order by recorded_at desc limit 1`);

            expect((rows.rows[0] as { evaluation: string }).evaluation).toBe('PAUSED');
        });

        it('should count the device as paused in the overview, not as critical', async () => {
            const data = await overview();

            expect(data.devices).toMatchObject({ paused: 1 });
            expect(data.devices.byState.CRITICAL).toBe(0);
            expect(data.problemColdStorages).toEqual([]);
            expect(data.pauses[0]).toMatchObject({
                targetName: 'Freezer E2E',
                kind: 'MAINTENANCE',
                timeline: 'ACTIVE',
            });
        });
    });

    describe('offline detection', () => {
        it('should mark a silent device offline even during a pause, with an alert', async () => {
            const marked = await app.get(DeviceOfflineService).detectOnce(new Date(BASE + 3_600_000));

            expect(marked).toBe(1);

            const alerts = ((await api.get('/api/alert?toState=OFFLINE').expect(200)).body as Body).data;

            expect(alerts).toHaveLength(1);
            expect(alerts[0].reasonCode).toBe('DEVICE_OFFLINE');
        });
    });

    describe('retention', () => {
        it('should delete readings older than five years and keep everything newer', async () => {
            const db = app.get(DatabaseService).db;

            await db.execute(sql`
                insert into temperature_logs (device_id, recorded_at, temperature, state, evaluation) values
                    (${deviceId}, now() - interval '5 years 2 days', -20, 'NORMAL', 'EVALUATED'),
                    (${deviceId}, now() - interval '6 years',        -20, 'NORMAL', 'EVALUATED'),
                    (${deviceId}, now() - interval '4 years 360 days', -20, 'NORMAL', 'EVALUATED')
            `);

            const before = (await db.execute(sql`select count(*)::int as total from temperature_logs`)).rows[0] as {
                total: number;
            };
            const deleted = await app.get(TemperatureRetentionService).deleteExpired(new Date());
            const after = (await db.execute(sql`select count(*)::int as total from temperature_logs`)).rows[0] as {
                total: number;
            };

            expect(deleted).toBe(2);
            expect(after.total).toBe(before.total - 2);
        });
    });
});
