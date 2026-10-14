import { pgTable, text, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { locations } from './locations';
import { pk, timestamps } from './_helpers';

// A cold room at a site. Cross-storahe checls/reports group devices by this table.
export const coldStorages = pgTable(
    'cold_storages',
    {
        id: pk(),
        locationId: uuid('location_id')
            .notNull()
            .references(() => locations.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
        name: varchar('name', { length: 100 }).notNull(),
        description: text('description'),
        ...timestamps,
    },

    (t) => [uniqueIndex('cold_storages_location_name_uidx').on(t.locationId, t.name)],
);
