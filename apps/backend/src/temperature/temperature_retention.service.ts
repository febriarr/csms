import { APP_TIMEZONE } from '@/common/utils/app_timezone';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TemperatureRepository } from './temperature.repository';

/** Readings are kept for audit this long (see the note on `temperature_logs`), then deleted. */
export const RETENTION_YEARS = 5;

/** Rows per delete statement: small enough to finish in a blink and never hold up the readings coming in. */
export const RETENTION_BATCH_SIZE = 5_000;

/**
 * The day exactly `RETENTION_YEARS` before `now`. On 29 February the same day five years back may not exist; then
 * the cutoff moves to the earlier 28 February, so a reading is never deleted before it is five years old.
 */
export function retentionCutoff(now: Date, years: number = RETENTION_YEARS): Date {
    const cutoff = new Date(now);
    const targetYear = cutoff.getUTCFullYear() - years;

    cutoff.setUTCFullYear(targetYear);

    // 29 Feb rolled over into March of the target year: step back to the last day of February
    if (cutoff.getUTCFullYear() === targetYear && cutoff.getUTCMonth() !== now.getUTCMonth()) {
        cutoff.setTime(Date.UTC(targetYear, 1, 28, now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
    }

    return cutoff;
}

@Injectable()
export class TemperatureRetentionService {
    private readonly logger = new Logger(TemperatureRetentionService.name);
    private running = false;

    constructor(private readonly temperatures: TemperatureRepository) {}

    /** Every night at 03:00 plant time, when the cold rooms are quietest and nobody reads reports. */
    @Cron('0 3 * * *', { timeZone: APP_TIMEZONE })
    async run(): Promise<void> {
        // a run that takes very long must not overlap the next night's
        if (this.running) return;

        this.running = true;

        try {
            const deleted = await this.deleteExpired(new Date());

            this.logger.log(`Temperature retention: ${deleted} reading(s) older than ${RETENTION_YEARS} years deleted`);
        } catch (error) {
            this.logger.error('Temperature retention failed', error instanceof Error ? error.stack : String(error));
        } finally {
            this.running = false;
        }
    }

    /**
     * Deletes every reading older than the retention period, device by device, in small batches. One device failing
     * is logged and skipped so the others still get cleaned, and what was not deleted is simply picked up tomorrow.
     * Returns how many rows it deleted.
     */
    async deleteExpired(now: Date): Promise<number> {
        const cutoff = retentionCutoff(now);
        const deviceIds = await this.temperatures.findAllDeviceIds();
        let total = 0;

        for (const deviceId of deviceIds) {
            try {
                total += await this.deleteExpiredOf(deviceId, cutoff);
            } catch (error) {
                this.logger.error(
                    `Could not delete expired readings of device ${deviceId}`,
                    error instanceof Error ? error.stack : String(error),
                );
            }
        }

        return total;
    }

    private async deleteExpiredOf(deviceId: string, cutoff: Date): Promise<number> {
        let total = 0;

        for (;;) {
            const deleted = await this.temperatures.deleteOlderThan(deviceId, cutoff, RETENTION_BATCH_SIZE);

            total += deleted;

            // a short batch means nothing older is left
            if (deleted < RETENTION_BATCH_SIZE) return total;
        }
    }
}
