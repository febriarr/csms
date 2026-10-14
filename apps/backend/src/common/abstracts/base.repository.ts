import { DatabaseService } from '@/database/database.service';
import { Database, DatabaseTransaction } from '@/database/database.type';
import { InferInsertModel, InferSelectModel, SQL } from 'drizzle-orm';
import { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { PgInsertValue } from 'drizzle-orm/pg-core';
import { PgTable } from 'drizzle-orm/pg-core';

export abstract class BaseRepository<TTable extends PgTable> {
    protected readonly db: Database;

    constructor(
        protected readonly databaseService: DatabaseService,
        protected readonly table: TTable,
    ) {
        this.db = databaseService.db;
    }

    protected executor(tx?: DatabaseTransaction) {
        return tx ?? this.db;
    }

    async withTransaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
        return this.db.transaction(callback);
    }

    async create(input: InferInsertModel<TTable>, tx?: DatabaseTransaction): Promise<InferSelectModel<TTable>> {
        const [row] = (await this.executor(tx)
            .insert(this.table)
            .values(input as PgInsertValue<TTable>)
            .returning()) as InferSelectModel<TTable>[];

        return row;
    }

    async update(
        where: SQL,
        input: Partial<InferInsertModel<TTable>>,
        tx?: DatabaseTransaction,
    ): Promise<InferSelectModel<TTable> | undefined> {
        const [row] = (await this.executor(tx)
            .update(this.table)
            .set(input as PgUpdateSetSource<TTable>)
            .where(where)
            .returning()) as InferSelectModel<TTable>[];

        return row;
    }
}
