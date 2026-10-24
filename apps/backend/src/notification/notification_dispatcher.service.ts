import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NOTIFICATION_SENDERS, type NotificationChannel, type NotificationSender } from './notification.type';
import { NotificationLogRepository } from './notification_log.repository';

/** How many messages one poll hands to the senders. Senders pace themselves, so this only bounds a single run. */
export const DISPATCH_BATCH_SIZE = 20;

/**
 * The read side of the outbox: every few seconds it takes the messages that are due and gives each to the sender
 * of its channel. The database is the queue, so nothing is lost when the process restarts, and there is no Redis
 * to run.
 *
 * It assumes ONE API instance. With several, two instances could pick the same row and send it twice; guard the
 * poll with an advisory lock (or claim rows with FOR UPDATE SKIP LOCKED) before scaling out.
 */
@Injectable()
export class NotificationDispatcherService {
    private readonly logger = new Logger(NotificationDispatcherService.name);
    private readonly senders: Map<NotificationChannel, NotificationSender>;
    private readonly warnedChannels = new Set<NotificationChannel>();
    private running = false;

    constructor(
        private readonly logs: NotificationLogRepository,
        @Optional() @Inject(NOTIFICATION_SENDERS) senders?: NotificationSender[],
    ) {
        this.senders = new Map((senders ?? []).map((sender) => [sender.channel, sender]));
    }

    @Cron(CronExpression.EVERY_5_SECONDS)
    async poll(): Promise<void> {
        // a slow run (WhatsApp pacing) must not overlap the next tick
        if (this.running) return;

        this.running = true;

        try {
            await this.dispatchDue(new Date());
        } catch (error) {
            this.logger.error('Notification dispatch failed', error instanceof Error ? error.stack : String(error));
        } finally {
            this.running = false;
        }
    }

    /**
     * One pass over the due messages. A message whose channel has no sender is left untouched (still PENDING, no
     * attempt counted) so it goes out once a sender is registered, unless it gets too old first. Returns how many
     * messages were delivered.
     */
    async dispatchDue(now: Date): Promise<number> {
        await this.logs.expireStale(now);

        const due = await this.logs.findDue(DISPATCH_BATCH_SIZE, now);
        let delivered = 0;

        for (const log of due) {
            const sender = this.senders.get(log.channel);

            if (!sender) {
                this.warnOnce(log.channel);
                continue;
            }

            try {
                await sender.send(log.recipient, log.message, log.severity);
                await this.logs.markSent(log.id, log.attemptCount, new Date());
                delivered++;
            } catch (error) {
                await this.logs.markFailed(
                    log.id,
                    log.attemptCount,
                    error instanceof Error ? error.message : String(error),
                );
            }
        }

        return delivered;
    }

    private warnOnce(channel: NotificationChannel): void {
        if (this.warnedChannels.has(channel)) return;

        this.warnedChannels.add(channel);
        this.logger.warn(`No sender registered for channel ${channel}: its messages stay PENDING`);
    }
}
