import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../../src/database/schema';
import { DevicesRepository } from '../../../src/features/devices/devices.repository';
import { isDbReachable, truncateAll } from '../../setup/db.util';

// Requires: docker-compose -f docker-compose.test.yml up -d && npm run db:migrate
// then: npm run test:integration (see README-TESTING.md)
const dbAvailable = await isDbReachable();

describe.skipIf(!dbAvailable)('DevicesRepository (integration)', () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const repo = new DevicesRepository(db);

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  const deviceInput = {
    code: 'DEV-INT-001',
    name: 'Integration Fridge',
    location: 'WH-1',
    defrostThreshold: 0,
    warningThreshold: 5,
    criticalThreshold: 10,
  };

  it('should create a device and read it back by code', async () => {
    await repo.create(deviceInput as any);

    const found = await repo.findByCode('DEV-INT-001');

    expect(found).toBeDefined();
    expect(found?.name).toBe('Integration Fridge');
    expect(found?.state).toBe('NORMAL'); // schema default
  });

  it('should not find a soft-deleted device by code', async () => {
    const created = await repo.create(deviceInput as any);
    await repo.deleteDevice(created.id);

    const found = await repo.findByCode('DEV-INT-001');

    expect(found).toBeUndefined();
  });

  it('should soft-delete rather than hard-delete (row still present with isActive=false)', async () => {
    const created = await repo.create(deviceInput as any);

    const deleted = await repo.deleteDevice(created.id);

    expect(deleted?.isActive).toBe(false);
    const stillThere = await repo.findById(created.id);
    expect(stillThere).not.toBeNull();
    expect(stillThere?.isActive).toBe(false);
  });

  it('should enforce a unique constraint on device code', async () => {
    await repo.create(deviceInput as any);

    await expect(repo.create(deviceInput as any)).rejects.toThrow();
  });

  it('should exclude inactive devices from findAll', async () => {
    const created = await repo.create(deviceInput as any);
    await repo.deleteDevice(created.id);
    await repo.create({ ...deviceInput, code: 'DEV-INT-002' } as any);

    const all = await repo.findAll();

    expect(all.map(d => d.code)).toEqual(['DEV-INT-002']);
  });

  it('should filter findAll by search term across name and code (case-insensitive)', async () => {
    await repo.create({ ...deviceInput, code: 'DEV-A', name: 'Cold Room A' } as any);
    await repo.create({ ...deviceInput, code: 'DEV-B', name: 'Freezer B' } as any);

    const result = await repo.findAll('cold');

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('DEV-A');
  });

  it('should only return devices whose lastSeenAt is older than the heartbeat tolerance in findStaleDevices', async () => {
    const fresh = await repo.create({ ...deviceInput, code: 'DEV-FRESH' } as any);
    const stale = await repo.create({ ...deviceInput, code: 'DEV-STALE' } as any);
    await repo.updateLastSeen(fresh.id); // just now -> not stale
    await db
      .update(schema.devices)
      .set({ lastSeenAt: new Date(Date.now() - 10 * 60 * 1000) }) // 10 minutes ago -> stale
      .where(eq(schema.devices.id, stale.id));

    const staleDevices = await repo.findStaleDevices();

    expect(staleDevices.map(d => d.code)).toEqual(['DEV-STALE']);
  });
});
