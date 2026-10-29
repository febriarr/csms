import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;
export type DatabaseTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface DatabaseConfig {
    url: string;
    poolMax: number;
    poolIdleTimeoutMs: number;
    poolConnectionTimeoutMs: number;
    poolMaxLifetimeSeconds: number;
    statementTimeoutMs: number;
    idleInTransactionTimeoutMs: number;
    ssl: boolean;
    logQueries: boolean;
}
