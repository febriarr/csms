import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRecipientRepository } from './notification_recipient.repository';
import { NotificationSubscriptionRepository } from './notification_subscription.repository';

@Module({
    controllers: [NotificationController],
    providers: [NotificationService, NotificationRecipientRepository, NotificationSubscriptionRepository],
})
export class NotificationModule {}
