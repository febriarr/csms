import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { Database, DatabaseTransaction, devices, DevicesState, InsertDevices, SelectDevices } from '../../database';
import { BaseRepository } from '../../shared/abstract/base-repository';

export const HEARTBEAT_INTERVAL_MS = 30_000;

export class DevicesRepository extends BaseRepository<typeof devices> {
  constructor(db: Database) {
    super(db, devices);
  }

  async findAll(search?: string): Promise<SelectDevices[]> {
    const conditions = [eq(devices.isActive, true)];
    if (search) {
      const pattern = `%${search}%`;
      const filter = or(ilike(devices.name, pattern), ilike(devices.code, pattern));
      if (filter) conditions.push(filter);
    }

    return this.db.query.devices.findMany({
      where: and(...conditions),
      orderBy: desc(devices.createdAt),
    });
  }

  async findDevicesOnline(): Promise<SelectDevices[]> {
    return this.db.query.devices.findMany({
      where: (d, { lt, and, ne }) =>
        and(
          lt(d.lastSeenAt, new Date(Date.now() - HEARTBEAT_INTERVAL_MS * 3)),
          ne(d.state, 'OFFLINE'),
          eq(devices.isActive, true)
        ),
    });
  }

  async findByCode(code: string): Promise<SelectDevices | undefined> {
    const device = await this.db.query.devices.findFirst({
      where: and(eq(devices.code, code), eq(devices.isActive, true)),
    });

    return device ?? undefined;
  }

  async updateLastSeen(id: SelectDevices['id'], tx?: DatabaseTransaction) {
    return this.update(eq(devices.id, id), { lastSeenAt: new Date() }, tx);
  }

  async updateState(id: SelectDevices['id'], state: DevicesState, tx?: DatabaseTransaction) {
    return this.update(
      eq(devices.id, id),
      {
        state,
        stateChangedAt: new Date(),
      },
      tx
    );
  }

  async updateDevices(id: string, input: Partial<InsertDevices>): Promise<SelectDevices | null> {
    const updated = await this.update(eq(devices.id, id), input);

    return updated ?? null;
  }

  async findAllWithLatestTemperature() {
    return this.db.query.devices.findMany({
      with: {
        temperatureLogs: {
          orderBy: (logs, { desc }) => [desc(logs.createdAt)],
          limit: 1,
        },
      },
      orderBy: (d, { desc, asc }) => [desc(d.createdAt), asc(d.id)],
      where: eq(devices.isActive, true),
    });
  }

  async findDeviceByIdWithAlert(deviceId: string) {
    return this.db.query.devices.findFirst({
      where: and(eq(devices.id, deviceId), eq(devices.isActive, true)),
      with: {
        alerts: {
          orderBy: (alerts, { desc }) => [desc(alerts.createdAt)],
        },
      },
    });
  }

  async findById(id: string): Promise<SelectDevices | null> {
    const device = await this.db.query.devices.findFirst({
      where: eq(devices.id, id),
    });

    return device ?? null;
  }

  async deleteDevice(id: string): Promise<SelectDevices | null> {
    const [device] = await this.db
      .update(devices)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(devices.id, id))
      .returning();

    return device ?? null;
  }
}
