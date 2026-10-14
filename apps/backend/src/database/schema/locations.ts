import { index, pgTable, text, varchar, uuid } from 'drizzle-orm/pg-core';
import { pk, timestamps } from './_helpers';
import { divisions } from './divisions';

// A physical site owned by one division.
export const locations = pgTable(
    'locations',
    {
        id: pk(),
        divisionId: uuid('division_id')
            .notNull()
            .references(() => divisions.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
        name: varchar('name', { length: 100 }).notNull().unique(),
        description: text('description'),
        ...timestamps,
    },
    (t) => [index('locations_divisions_id_idx').on(t.divisionId)],
);
