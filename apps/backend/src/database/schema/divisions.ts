import { pgTable, varchar } from 'drizzle-orm/pg-core';
import { pk, timestamps } from './_helpers';

/**
 * Organisational unit. Warehouse and Production OWN sites; ME(maintenance) owns none but
 * receives alerts from the others through notification_subscription
 */

export const divisions = pgTable('divisions', {
    id: pk(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    ...timestamps,
});
