import { PgTable } from 'drizzle-orm/pg-core';
import { InferInsertModel, InferSelectModel, SQL } from 'drizzle-orm';
import { Database, DatabaseTransaction } from '../../database';

export abstract class BaseRepository<TTable extends PgTable> {
  constructor(
    protected readonly db: Database,
    protected readonly table: TTable
  ) {}

  protected executor(tx?: DatabaseTransaction) {
    return tx ?? this.db;
  }

  async withTransaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  async create(input: InferInsertModel<TTable>, tx?: DatabaseTransaction): Promise<InferSelectModel<TTable>> {
    const [row] = (await this.executor(tx)
      .insert(this.table)
      .values(input as any)
      .returning()) as InferSelectModel<TTable>[];

    return row!;
  }

  async update(
    where: SQL,
    input: Partial<InferInsertModel<TTable>>,
    tx?: DatabaseTransaction
  ): Promise<InferSelectModel<TTable> | undefined> {
    const [row] = (await this.executor(tx)
      .update(this.table)
      .set(input as any)
      .where(where)
      .returning()) as InferSelectModel<TTable>[];

    return row;
  }
}
