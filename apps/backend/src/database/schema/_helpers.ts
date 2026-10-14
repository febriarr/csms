import { uuid, timestamp, text } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const pk = () =>
    uuid('id')
        .primaryKey()
        .defaultRandom()
        .$defaultFn(() => uuidv7());

export const tstz = (name: string) => timestamp(name, { mode: 'date', withTimezone: true });

export const timestamps = {
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
};

export const softDelete = {
    deletedAt: timestamp('deleted_at', { mode: 'date', withTimezone: true }),
    deletedBy: text('deleted_by'),
};
