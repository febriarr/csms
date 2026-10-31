import { Logger, OnApplicationShutdown, Provider } from '@nestjs/common';
import { Database, DatabaseConfig } from './database.type';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { ConfigService } from '@nestjs/config';

export const DB_CONNECTION = 'DB_CONNECTION' as const;

export class DrizzleClient implements OnApplicationShutdown {
    readonly db: Database;
    private readonly pool: Pool;
    private readonly logger = new Logger(DrizzleClient.name);
    private closed = false;

    constructor(cfg: DatabaseConfig) {
        this.pool = new Pool({
            connectionString: cfg.url,
            application_name: 'my-app-api',
            max: cfg.poolMax,
            idleTimeoutMillis: cfg.poolIdleTimeoutMs,
            connectionTimeoutMillis: cfg.poolConnectionTimeoutMs,
            maxLifetimeSeconds: cfg.poolMaxLifetimeSeconds,
            statement_timeout: cfg.statementTimeoutMs,
            idle_in_transaction_session_timeout: cfg.idleInTransactionTimeoutMs,
            keepAlive: true,
            ssl: cfg.ssl ? { rejectUnauthorized: true } : undefined,
        });

        this.pool.on('error', (err: Error) => {
            this.logger.error(`Database pool error: ${err.message}`);
        });

        this.db = drizzle(this.pool, { schema, logger: cfg.logQueries });
    }

    async connect(): Promise<void> {
        try {
            const client = await this.pool.connect();
            client.release();
            this.logger.log('Database connection established');
        } catch (err) {
            await this.pool.end();
            throw err;
        }
    }

    async onApplicationShutdown(signal?: string): Promise<void> {
        if (this.closed) return;
        this.closed = true;
        this.logger.log(`Closing database pool (signal: ${signal ?? 'none'})`);
        await this.pool.end();
        this.logger.log('Database pool closed');
    }
}

export const DatabaseProvider: Provider = {
    provide: DB_CONNECTION,
    inject: [ConfigService],
    useFactory: async (config: ConfigService): Promise<DrizzleClient> => {
        const isDevelopment = config.get<string>('NODE_ENV') === 'development';

        const client = new DrizzleClient({
            url: config.getOrThrow<string>('DATABASE_URL'),
            poolMax: config.get<number>('DB_POOL_MAX', 10),
            poolIdleTimeoutMs: config.get<number>('DB_POOL_IDLE_TIMEOUT_MS', 30_000),
            poolConnectionTimeoutMs: config.get<number>('DB_POOL_CONNECTION_TIMEOUT_MS', 5_000),
            poolMaxLifetimeSeconds: config.get<number>('DB_POOL_MAX_LIFETIME_SECONDS', 1_800),
            statementTimeoutMs: config.get<number>('DB_STATEMENT_TIMEOUT_MS', 30_000),
            idleInTransactionTimeoutMs: config.get<number>('DB_IDLE_IN_TX_TIMEOUT_MS', 15_000),
            ssl: config.get<boolean>('DB_SSL', false),
            // only while developing: in production it is noise and a leak, in the tests it drowns the results
            logQueries: isDevelopment,
        });

        await client.connect();

        return client;
    },
};
