import { BaseRepository } from '@/common/abstracts/base.repository';
import { DatabaseService } from '@/database/database.service';
import { coldStorages, InsertLocation, locations, SelectLocation } from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, SQL } from 'drizzle-orm';

@Injectable()
export class LocationRepository extends BaseRepository<typeof locations> {
    constructor(db: DatabaseService) {
        super(db, locations);
    }

    async updateById(id: SelectLocation['id'], input: Partial<InsertLocation>): Promise<SelectLocation | undefined> {
        const updated = await this.update(eq(locations.id, id), input);

        return updated;
    }

    async findOne(id: SelectLocation['id']): Promise<SelectLocation | undefined> {
        const row = await this.db.query.locations.findFirst({
            where: eq(locations.id, id),
        });

        return row ?? undefined;
    }

    async listLocation(filter: { search?: string; divisionId?: string }): Promise<SelectLocation[]> {
        const conditions: SQL[] = [];

        if (filter.search) {
            conditions.push(ilike(locations.name, `%${filter.search}%`));
        }

        if (filter.divisionId) {
            conditions.push(eq(locations.divisionId, filter.divisionId));
        }

        return this.db
            .select()
            .from(locations)
            .where(and(...conditions))
            .orderBy(desc(locations.createdAt));
    }

    async destroy(id: SelectLocation['id']): Promise<boolean> {
        const rows = await this.executor()
            .delete(locations)
            .where(eq(locations.id, id))
            .returning({ id: locations.id });

        return rows.length > 0;
    }

    async hasRelationCs(id: SelectLocation['id']): Promise<boolean> {
        const [row] = await this.db
            .select({ id: coldStorages.id })
            .from(coldStorages)
            .where(eq(coldStorages.locationId, id))
            .limit(1);

        return row !== undefined;
    }
}
