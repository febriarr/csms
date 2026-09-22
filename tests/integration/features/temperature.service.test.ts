import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../../src/database/schema';
import { isDbReachable, truncateAll } from '../../setup/db.util';

const { queueAddMock, broadcastMock } = vi.hoisted(() => ({
  queueAddMock: vi.fn(),
  broadcastMock: vi.fn(),
}));
vi.mock('../../../src/shared/whatsapp/whatsapp.queue', () => ({ whatsappQueue: { add: queueAddMock } }));
vi.mock('../../../src/sse/device-events', () => ({ deviceEventBus: { broadcast: broadcastMock } }));

const { TemperatureService } = await import('../../../src/features/temperature/temperature.service');
const { TemperatureRepository } = await import('../../../src/features/temperature/temperature.repository');
const { DevicesRepository } = await import('../../../src/features/devices/devices.repository');
const { AlertsRepository } = await import('../../../src/features/alerts/alerts.repository');
const { NotificationsRecipientsRepository } = await import(
  '../../../src/features/notifications-recipients/notifications-recipients.repository'
);
const { DeviceDiagnosticLogsRepository } = await import(
  '../../../src/features/device-diagnostic-logs/device-diagnostic-logs.repository'
);

const dbAvailable = await isDbReachable();

describe.skipIf(!dbAvailable)('TemperatureService.create (integration - transaction atomicity)', () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const deviceRepo = new DevicesRepository(db);
  const temperatureRepo = new TemperatureRepository(db);
  const alertRepo = new AlertsRepository(db);
  const notificationRepo = new NotificationsRecipientsRepository(db);
  const diagnosticsRepo = new DeviceDiagnosticLogsRepository(db);
  const service = new TemperatureService(temperatureRepo, deviceRepo, alertRepo, notificationRepo, diagnosticsRepo);

  beforeEach(async () => {
    await truncateAll(pool);
    queueAddMock.mockReset();
    broadcastMock.mockReset();
  });

  afterAll(async () => {
    await pool.end();
  });

  async function seedDevice() {
    return deviceRepo.create({
      code: 'DEV-TEMP-001',
      name: 'Temp Test Fridge',
      defrostThreshold: 0,
      warningThreshold: 5,
      criticalThreshold: 10,
    } as any);
  }

  it('should persist the temperature log, update device state and lastSeenAt, and create an alert atomically', async () => {
    await seedDevice();

    await service.create({
      deviceCode: 'DEV-TEMP-001',
      timestamp: new Date().toISOString(),
      temperature: 12, // CRITICAL
      sensorFailCount: 0,
      wifiFailCount: 0,
      httpFailCount: 0,
      rssi: null,
      reason: null,
    });

    const device = await deviceRepo.findByCode('DEV-TEMP-001');
    expect(device?.state).toBe('CRITICAL');
    expect(device?.lastSeenAt).not.toBeNull();

    const logs = await db.select().from(schema.temperatureLogs);
    expect(logs).toHaveLength(1);

    const alerts = await db.select().from(schema.alerts);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].toState).toBe('CRITICAL');
  });

  it('should roll back the entire transaction (no log, no state change) when the device does not exist', async () => {
    await expect(
      service.create({
        deviceCode: 'DOES-NOT-EXIST',
        timestamp: new Date().toISOString(),
        temperature: 5,
        sensorFailCount: 0,
        wifiFailCount: 0,
        httpFailCount: 0,
        rssi: null,
        reason: null,
      })
    ).rejects.toThrow();

    const logs = await db.select().from(schema.temperatureLogs);
    expect(logs).toHaveLength(0);
  });

  it('should insert a diagnostics log row atomically alongside the temperature log when a fail count is reported', async () => {
    await seedDevice();

    await service.create({
      deviceCode: 'DEV-TEMP-001',
      timestamp: new Date().toISOString(),
      temperature: 2,
      sensorFailCount: 5,
      wifiFailCount: 0,
      httpFailCount: 0,
      rssi: -80,
      reason: null,
    });

    const diagLogs = await db.select().from(schema.deviceDiagnosticsLogs);
    expect(diagLogs).toHaveLength(1);
  });

  it('should not enqueue a WhatsApp job (verified via the mocked queue) when the reading stays NORMAL', async () => {
    await seedDevice();

    await service.create({
      deviceCode: 'DEV-TEMP-001',
      timestamp: new Date().toISOString(),
      temperature: -5,
      sensorFailCount: 0,
      wifiFailCount: 0,
      httpFailCount: 0,
      rssi: null,
      reason: null,
    });

    expect(queueAddMock).not.toHaveBeenCalled();
    const device = await deviceRepo.findByCode('DEV-TEMP-001');
    expect(device?.state).toBe('NORMAL');
  });
});
