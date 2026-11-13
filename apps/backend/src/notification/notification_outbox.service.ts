import type { Env } from '@/config/env.validation';
import { DatabaseTransaction } from '@/database/database.type';
import { InsertNotificationLog, SelectNotificationLog } from '@/database/schema';
import { WhatsappService } from '@/whatsapp/whatsapp.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationLogRepository } from './notification_log.repository';
import { NotificationRecipientRepository } from './notification_recipient.repository';

/**
 * The write side of the outbox. An alert and the messages it triggers are saved in ONE transaction: either both
 * exist or neither does, so an alert can never be committed and silently lose its notifications (which an
 * in-memory queue filled after the commit could). Delivery happens later, in the dispatcher.
 */
@Injectable()
export class NotificationOutboxService {
    private readonly logger = new Logger(NotificationOutboxService.name);

    constructor(
        private readonly recipients: NotificationRecipientRepository,
        private readonly logs: NotificationLogRepository,
        private readonly whatsapp: WhatsappService,
        private readonly config: ConfigService<Env, true>,
    ) {}

    /**
     * Creates one PENDING message per active recipient subscribed to the device (directly, or through its cold
     * storage, location or division): WhatsApp always, e-mail when EMAIL_ENABLED and either EMAIL_MODE=always or
     * WhatsApp cannot deliver right now (see `whatsappCanDeliver`). The recipient's number/address is copied into
     * the row, so later edits or deletion of the recipient do not change what was sent. Returns the created rows
     * (empty when nobody is subscribed, which is logged: an alert nobody receives is worth knowing about).
     */
    async enqueue(
        input: { alertId: string; deviceId: string; message: string },
        tx: DatabaseTransaction,
    ): Promise<SelectNotificationLog[]> {
        const whatsappRecipients = await this.recipients.findForDevice(input.deviceId, 'WHATSAPP', tx);
        const emailRecipients = this.wantsEmail(whatsappRecipients.length > 0)
            ? await this.recipients.findForDevice(input.deviceId, 'EMAIL', tx)
            : [];

        const rows: InsertNotificationLog[] = [...whatsappRecipients, ...emailRecipients].map((recipient) => ({
            alertId: input.alertId,
            recipientId: recipient.id,
            channel: recipient.channel,
            recipient: recipient.target,
            message: input.message,
        }));

        if (rows.length === 0) {
            this.logger.warn(`No active recipient is subscribed to device ${input.deviceId}`);

            return [];
        }

        return this.logs.createMany(rows, tx);
    }

    private wantsEmail(hasWhatsappRecipients: boolean): boolean {
        if (!this.config.get('EMAIL_ENABLED', { infer: true })) return false;
        if (this.config.get('EMAIL_MODE', { infer: true }) === 'always') return true;

        return !this.whatsappCanDeliver(hasWhatsappRecipients);
    }

    /** WhatsApp is switched on, linked and connected, and somebody is subscribed on it. */
    private whatsappCanDeliver(hasWhatsappRecipients: boolean): boolean {
        const { enabled, connected } = this.whatsapp.getStatus();

        return enabled && connected && hasWhatsappRecipients;
    }
}
