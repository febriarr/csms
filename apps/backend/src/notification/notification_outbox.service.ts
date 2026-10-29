import { DatabaseTransaction } from '@/database/database.type';
import { SelectNotificationLog } from '@/database/schema';
import { Injectable, Logger } from '@nestjs/common';
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
    ) {}

    /**
     * Creates one PENDING WhatsApp message per active recipient subscribed to the device (directly, or through its
     * cold storage, location or division). The recipient's number is copied into the row, so later edits or
     * deletion of the recipient do not change what was sent. Returns the created rows (empty when nobody is
     * subscribed, which is logged: an alert nobody receives is worth knowing about).
     */
    async enqueue(
        input: { alertId: string; deviceId: string; message: string },
        tx: DatabaseTransaction,
    ): Promise<SelectNotificationLog[]> {
        const recipients = await this.recipients.findForDevice(input.deviceId, 'WHATSAPP');

        if (recipients.length === 0) {
            this.logger.warn(`No active WhatsApp recipient is subscribed to device ${input.deviceId}`);

            return [];
        }

        return this.logs.createMany(
            recipients.map((recipient) => ({
                alertId: input.alertId,
                recipientId: recipient.id,
                channel: 'WHATSAPP' as const,
                recipient: recipient.target,
                message: input.message,
            })),
            tx,
        );
    }
}
