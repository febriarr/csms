import { BaseRepository } from '@/common/abstracts/base.repository';
import { DatabaseService } from '@/database/database.service';
import { DatabaseTransaction } from '@/database/database.type';
import { divisions, InsertDivision, locations, SelectDivision } from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

@Injectable()
export class DivisionRepository extends BaseRepository<typeof divisions> {
    constructor(db: DatabaseService) {
        super(db, divisions);
    }

    async updateById(id: SelectDivision['id'], input: Partial<InsertDivision>): Promise<SelectDivision | undefined> {
        const updated = await this.update(eq(divisions.id, id), input);

        return updated;
    }

    /**
     * Pagination was intentionally omitted because the amount of data is relatively small.
     */
    async findMany(): Promise<SelectDivision[]> {
        return this.db.query.divisions.findMany();
    }

    async findOne(id: string): Promise<SelectDivision | null> {
        const division = await this.db.query.divisions.findFirst({
            where: eq(divisions.id, id),
        });

        return division ?? null;
    }

    async destroy(id: SelectDivision['id'], tx?: DatabaseTransaction): Promise<boolean> {
        const rows = await this.executor(tx)
            .delete(divisions)
            .where(eq(divisions.id, id))
            .returning({ id: divisions.id });

        return rows.length > 0;
    }

    async hasLocations(id: SelectDivision['id'], tx?: DatabaseTransaction): Promise<boolean> {
        const [row] = await this.executor(tx)
            .select({ id: locations.id })
            .from(locations)
            .where(eq(locations.divisionId, id))
            .limit(1);

        return row !== undefined;
    }
}
