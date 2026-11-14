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
    private client?: Resend;
    private readonly logger = new Logger(ResendSender.name);

    constructor(private readonly config: ConfigService<Env, true>) {}

    private get resend(): Resend {
        this.client ??= new Resend(this.config.getOrThrow('RESEND_API_KEY', { infer: true }));

        return this.client;
    }

    async send(target: string, message: string, severity: NotificationSeverity): Promise<void> {
        const { subject, text, html } = EmailUtils.build(message, severity);

        const { error } = await this.resend.emails.send({
            from: this.config.getOrThrow('EMAIL_FROM', { infer: true }),
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
