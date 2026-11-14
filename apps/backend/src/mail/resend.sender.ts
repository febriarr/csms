import type { Env } from '@/config/env.validation';
import type { NotificationSender, NotificationSeverity } from '@/notification/notification.type';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailUtils } from './email.utils';
import { Resend } from 'resend';

/**
 * Delivers notification messages by e-mail through the Resend REST API (plain fetch, no SDK to install).
 * It throws on every failure, so the dispatcher counts the attempt and retries with its normal back-off.
 */
@Injectable()
export class ResendSender implements NotificationSender {
    readonly channel = 'EMAIL' as const;
    private readonly resend: Resend;
    private readonly from: string;
    private readonly logger = new Logger(ResendSender.name);

    constructor(config: ConfigService<Env, true>) {
        this.resend = new Resend(config.get<string>('RESEND_API_KEY'));
        this.from = config.get<string>('EMAIL_FROM');
    }

    async send(target: string, message: string, severity: NotificationSeverity): Promise<void> {
        const { subject, text, html } = EmailUtils.build(message, severity);

        const { error } = await this.resend.emails.send({
            from: this.from,
            to: [target],
            subject,
            text,
            html,
        });

        if (error) {
            this.logger.error(`Failed to send email: ${error.name} - ${error.message}`);
            throw new Error(`Resend: ${error.message}`);
        }
    }
}
