import type { Env } from '@/config/env.validation';
import { NOTIFICATION_SENDERS, type NotificationSender } from '@/notification/notification.type';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappSender } from './whatsapp.sender';
import { WhatsappService } from './whatsapp.service';

@Module({
    controllers: [WhatsappController],
    providers: [
        WhatsappService,
        WhatsappSender,
        {
            // With WhatsApp disabled no sender is registered, so messages simply wait as PENDING (and expire).
            provide: NOTIFICATION_SENDERS,
            inject: [ConfigService, WhatsappSender],
            useFactory: (config: ConfigService<Env, true>, sender: WhatsappSender): NotificationSender[] =>
                config.get('WHATSAPP_ENABLED', { infer: true }) ? [sender] : [],
        },
    ],
    exports: [NOTIFICATION_SENDERS, WhatsappService],
})
export class WhatsappModule {}
