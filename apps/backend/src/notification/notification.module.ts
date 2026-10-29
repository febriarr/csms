import { Module } from '@nestjs/common';
import { WhatsappModule } from '@/whatsapp/whatsapp.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationDispatcherService } from './notification_dispatcher.service';
import { NotificationLogRepository } from './notification_log.repository';
import { NotificationOutboxService } from './notification_outbox.service';
import { NotificationRecipientRepository } from './notification_recipient.repository';
import { NotificationSubscriptionRepository } from './notification_subscription.repository';

@Module({
    imports: [WhatsappModule],
    controllers: [NotificationController],
    providers: [
        NotificationService,
        NotificationRecipientRepository,
        NotificationSubscriptionRepository,
        NotificationLogRepository,
        NotificationOutboxService,
        NotificationDispatcherService,
    ],
    exports: [NotificationOutboxService],
})
export class NotificationModule {}
