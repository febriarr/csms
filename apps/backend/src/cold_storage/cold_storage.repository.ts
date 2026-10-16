import { BaseRepository } from '@/common/abstracts/base.repository';
import { DatabaseService } from '@/database/database.service';
import {
    coldStorages,
    divisions,
    InsertColdStorage,
    locations,
    SelectColdStorage,
    SelectDivision,
} from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { and, eq, getTableColumns, ilike, or, SQL } from 'drizzle-orm';

type ListType = SelectColdStorage & { location: string; division: string };

@Injectable()
export class ColdStorageRepository extends BaseRepository<typeof coldStorages> {
    constructor(db: DatabaseService) {
        super(db, coldStorages);
    }

    async findOne(id: SelectColdStorage['id']): Promise<SelectColdStorage | undefined> {
        return this.db.query.coldStorages.findFirst({
            where: eq(coldStorages.id, id),
        });
    }

    async updateById(
        id: SelectColdStorage['id'],
        input: Partial<InsertColdStorage>,
    ): Promise<SelectColdStorage | undefined> {
        return this.update(eq(coldStorages.id, id), input);
    }

    async list(filter: {
        search?: string;
        locationId?: SelectColdStorage['locationId'];
        divisionId?: SelectDivision['id'];
    }): Promise<ListType[]> {
        const { search, locationId, divisionId } = filter;
        const conditions: SQL[] = [];

        if (search) {
            const keyword = `%${search}%`;
            const searchCondition = or(
                ilike(coldStorages.name, keyword),
                ilike(locations.name, keyword),
                ilike(divisions.name, keyword),
            );
            if (searchCondition) conditions.push(searchCondition);
        }

        if (locationId) {
            conditions.push(eq(coldStorages.locationId, locationId));
        }

        if (divisionId) {
            conditions.push(eq(locations.divisionId, divisionId));
        }

        return this.db
            .select({
                ...getTableColumns(coldStorages),
                location: locations.name,
                division: divisions.name,
            })
            .from(coldStorages)
            .innerJoin(locations, eq(coldStorages.id, locations.id))
            .innerJoin(divisions, eq(locations.divisionId, divisions.id))
            .where(and(...conditions));
    }

    async destroy(id: SelectColdStorage['id']): Promise<boolean> {
        const rows = await this.db
            .delete(coldStorages)
            .where(eq(coldStorages.id, id))
            .returning({ id: coldStorages.id });

        return rows.length > 0;
    }
}
