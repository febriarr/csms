import type { NotificationSender, NotificationSeverity } from '@/notification/notification.type';
import { Injectable } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappUtils } from './whatsapp.utils';

/**
 * Delivers notification messages over WhatsApp. It keeps a minimum gap between two messages (random, shorter for
 * urgent ones) so sending never looks like a burst. The dispatcher calls it one message at a time, so the gap is
 * enforced simply by remembering when the last message left.
 */
@Injectable()
export class WhatsappSender implements NotificationSender {
    readonly channel = 'WHATSAPP' as const;

    private lastSentAt = 0;

    constructor(private readonly whatsapp: WhatsappService) {}

    async send(target: string, message: string, severity: NotificationSeverity): Promise<void> {
        const wait = this.lastSentAt + WhatsappUtils.delayFor(severity) - Date.now();

        if (wait > 0) await WhatsappUtils.sleep(wait);

        try {
            await this.whatsapp.sendText(WhatsappUtils.toJid(target), message);
        } finally {
            // a failed attempt still counts: hammering a broken connection is the same kind of burst
            this.lastSentAt = Date.now();
        }
    }
}
