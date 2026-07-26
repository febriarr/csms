import { eq } from 'drizzle-orm';
import { Database, type SelectTemperature, temperatureLogs } from '../../database';
import { BaseRepository } from '../../shared/abstract/base-repository';

export class TemperatureRepository extends BaseRepository<typeof temperatureLogs> {
  constructor(db: Database) {
    super(db, temperatureLogs);
  }

  async selectOne(id: string): Promise<SelectTemperature | null> {
    const row = await this.db.query.temperatureLogs.findFirst({
      where: eq(temperatureLogs.id, id),
    });

    return row ?? null;
  }

  async selectMany(): Promise<SelectTemperature[]> {
    return this.db.query.temperatureLogs.findMany();
  }
}
