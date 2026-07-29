import { eq, sql } from 'drizzle-orm';
import { Database, devices, DevicesState, InsertDevices, SelectDevices, temperatureLogs } from '../../database';
import { BaseRepository } from '../../shared/abstract/base-repository';

export const HEARTBEAT_INTERVAL_MS = 30_000;

export class DevicesRepository extends BaseRepository<typeof devices> {
  constructor(db: Database) {
    super(db, devices);
  }

  async findDevicesOnline(): Promise<SelectDevices[]> {
    return this.db.query.devices.findMany({
      where: (d, { lt, and, ne }) =>
        and(lt(d.lastSeenAt, new Date(Date.now() - HEARTBEAT_INTERVAL_MS * 3)), ne(d.state, 'OFFLINE')),
    });
  }

  async findByCode(code: string): Promise<SelectDevices | undefined> {
    const device = await this.db.query.devices.findFirst({
      where: eq(devices.code, code),
    });

    return device ?? undefined;
  }

  async updateLastSeen(id: SelectDevices['id'], lastSeenAt: Date = new Date()) {
    return this.update(eq(devices.id, id), { lastSeenAt });
  }

  async updateState(id: SelectDevices['id'], state: DevicesState) {
    return this.update(eq(devices.id, id), {
      state,
      stateChangedAt: new Date(),
    });
  }

  async updateDevices(id: string, input: Partial<InsertDevices>): Promise<SelectDevices | null> {
    const updated = await this.update(eq(devices.id, id), input);

    return updated ?? null;
  }

  async findAllWithLatestTemperature() {
    return this.db.query.devices.findMany({
      with: {
        temperatureLogs: {
          orderBy: (logs, { desc }) => [desc(logs.recordedAt)],
          limit: 1,
        },
      },
    });
  }
}
