import { Module } from '@nestjs/common';
import { MailModule, EMAIL_SENDERS } from '@/mail/mail.module';
import { WhatsappModule, WHATSAPP_SENDERS } from '@/whatsapp/whatsapp.module';
import { NOTIFICATION_SENDERS, type NotificationSender } from './notification.type';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationDispatcherService } from './notification_dispatcher.service';
import { NotificationLogRepository } from './notification_log.repository';
import { NotificationOutboxService } from './notification_outbox.service';
import { NotificationRecipientRepository } from './notification_recipient.repository';
import { NotificationSubscriptionRepository } from './notification_subscription.repository';
import { NotificationLogService } from './notification_log.service';
import { NotificationLogController } from './notification_log.controller';

@Module({
    imports: [WhatsappModule, MailModule],
    controllers: [NotificationController, NotificationLogController],
    providers: [
        NotificationService,
        NotificationRecipientRepository,
        NotificationSubscriptionRepository,
        NotificationLogRepository,
        NotificationLogService,
        NotificationOutboxService,
        NotificationDispatcherService,
        {
            // every channel registers its own list; the dispatcher gets them merged
            provide: NOTIFICATION_SENDERS,
            inject: [WHATSAPP_SENDERS, EMAIL_SENDERS],
            useFactory: (whatsapp: NotificationSender[], email: NotificationSender[]): NotificationSender[] => [
                ...whatsapp,
                ...email,
            ],
        },
    ],
    exports: [NotificationOutboxService],
})
export class NotificationModule {}
