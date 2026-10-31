import { DatabaseService } from '@/database/database.service';
import { DeviceOfflineService } from '@/device/device_offline.service';
import { WhatsappService } from '@/whatsapp/whatsapp.service';
import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

export const DATABASE_CHECK_TIMEOUT_MS = 2_000;

export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthReport {
    /**
     * ok: everything works. degraded: the API works but something it relies on does not (the alert scheduler is
     * stuck, or WhatsApp is enabled and not connected). down: no database, the API cannot do anything useful.
     */
    status: HealthStatus;
    uptimeSeconds: number;
    checks: {
        database: { status: 'up' | 'down'; latencyMs: number | null };
        scheduler: { status: 'up' | 'down' };
        whatsapp: { status: 'up' | 'down' | 'disabled' };
    };
}

@Injectable()
export class HealthService {
    constructor(
        private readonly database: DatabaseService,
        private readonly offline: DeviceOfflineService,
        private readonly whatsapp: WhatsappService,
    ) {}

    async check(now: Date = new Date()): Promise<HealthReport> {
        const database = await this.checkDatabase();
        const scheduler = this.offline.isSchedulerAlive(now) ? 'up' : 'down';
        const { enabled, connected } = this.whatsapp.getStatus();
        const whatsapp = !enabled ? 'disabled' : connected ? 'up' : 'down';

        const status: HealthStatus =
            database.status === 'down' ? 'down' : scheduler === 'down' || whatsapp === 'down' ? 'degraded' : 'ok';

        return {
            status,
            uptimeSeconds: Math.round(process.uptime()),
            checks: { database, scheduler: { status: scheduler }, whatsapp: { status: whatsapp } },
        };
    }

    /** A database that answers slower than the timeout counts as down: callers would time out as well. */
    private async checkDatabase(): Promise<HealthReport['checks']['database']> {
        const startedAt = Date.now();
        let timer: NodeJS.Timeout | undefined;

        try {
            await Promise.race([
                this.database.db.execute(sql`select 1`),
                new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error('database check timed out')), DATABASE_CHECK_TIMEOUT_MS);
                }),
            ]);

            return { status: 'up', latencyMs: Date.now() - startedAt };
        } catch {
            return { status: 'down', latencyMs: null };
        } finally {
            clearTimeout(timer);
        }
    }
}
