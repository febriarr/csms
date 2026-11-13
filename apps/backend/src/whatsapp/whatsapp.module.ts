import type { Env } from '@/config/env.validation';
import { type NotificationSender } from '@/notification/notification.type';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappSender } from './whatsapp.sender';
import { WhatsappService } from './whatsapp.service';

/** The WhatsApp senders that are switched on (empty while WHATSAPP_ENABLED=false). */
export const WHATSAPP_SENDERS = Symbol('WHATSAPP_SENDERS');

@Module({
    controllers: [WhatsappController],
    providers: [
        WhatsappService,
        WhatsappSender,
        {
            // With WhatsApp disabled no sender is registered, so messages simply wait as PENDING (and expire).
            provide: WHATSAPP_SENDERS,
            inject: [ConfigService, WhatsappSender],
            useFactory: (config: ConfigService<Env, true>, sender: WhatsappSender): NotificationSender[] =>
                config.get('WHATSAPP_ENABLED', { infer: true }) ? [sender] : [],
        },
    ],
    exports: [WHATSAPP_SENDERS, WhatsappService],
})
export class WhatsappModule {}
