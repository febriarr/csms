import type { Env } from '@/config/env.validation';
import type { NotificationSender, NotificationSeverity } from '@/notification/notification.type';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailUtils } from './email.utils';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Delivers notification messages by e-mail through the Resend REST API (plain fetch, no SDK to install).
 * It throws on every failure, so the dispatcher counts the attempt and retries with its normal back-off.
 */
@Injectable()
export class ResendSender implements NotificationSender {
    readonly channel = 'EMAIL' as const;

    constructor(private readonly config: ConfigService<Env, true>) {}

    async send(target: string, message: string, severity: NotificationSeverity): Promise<void> {
        const { subject, text, html } = EmailUtils.build(message, severity);

        const response = await fetch(RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.config.get('RESEND_API_KEY', { infer: true })}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: this.config.get('EMAIL_FROM', { infer: true }),
                to: [target],
                subject,
                text,
                html,
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
            const detail = await response.text().catch(() => '');

            throw new Error(`Resend ${response.status}: ${detail.slice(0, 300)}`);
        }
    }
}
