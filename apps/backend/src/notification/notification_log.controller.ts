import { Controller, Get, Query } from '@nestjs/common';
import { notificationLogQuerySchema, type NotificationLogQuery } from '@workspace/validator';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';
import { NotificationLogService } from './notification_log.service';

@Controller('notification-log')
export class NotificationLogController {
    constructor(private readonly service: NotificationLogService) {}

    @Get()
    findAll(@Query(new ZodValidationPipe(notificationLogQuerySchema)) query: NotificationLogQuery) {
        return this.service.findAll(query);
    }
}
