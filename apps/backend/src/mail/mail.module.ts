import type { Env } from '@/config/env.validation';
import { type NotificationSender } from '@/notification/notification.type';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendSender } from './resend.sender';

/** The e-mail senders that are switched on. Empty while EMAIL_ENABLED=false, so EMAIL messages never leave. */
export const EMAIL_SENDERS = Symbol('EMAIL_SENDERS');

@Module({
    providers: [
        ResendSender,
        {
            provide: EMAIL_SENDERS,
            inject: [ConfigService, ResendSender],
            useFactory: (config: ConfigService<Env, true>, sender: ResendSender): NotificationSender[] =>
                config.get('EMAIL_ENABLED', { infer: true }) ? [sender] : [],
        },
    ],
    exports: [EMAIL_SENDERS],
})
export class MailModule {}
