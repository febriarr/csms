import { eq } from 'drizzle-orm';
import { Database, type InsertTemperature, type SelectTemperature, temperatureLogs } from '../../database';

export class TemperatureRepository {
  constructor(private readonly db: Database) {}

  async insert(input: InsertTemperature): Promise<SelectTemperature | undefined> {
    const [row] = await this.db.insert(temperatureLogs).values(input).returning();
    return row;
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
