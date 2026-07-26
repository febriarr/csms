import { eq } from 'drizzle-orm';
import { alerts, Database, SelectAlert } from '../../database';
import { BaseRepository } from '../../shared/abstract/base-repository';

export class AlertsRepository extends BaseRepository<typeof alerts> {
  constructor(db: Database) {
    super(db, alerts);
  }

  async findByDeviceId(deviceId: string): Promise<SelectAlert[]> {
    return this.db.query.alerts.findMany({
      where: eq(alerts.deviceId, deviceId),
    });
  }
}
