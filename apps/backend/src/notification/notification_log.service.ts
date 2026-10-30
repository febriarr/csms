import { Injectable } from '@nestjs/common';
import type { NotificationLogQuery } from '@workspace/validator';
import type { ListNotificationLog, WithMetadata } from '@workspace/shared';
import { NotificationLogRepository } from './notification_log.repository';

@Injectable()
export class NotificationLogService {
    constructor(private readonly logs: NotificationLogRepository) {}

    async findAll(query: NotificationLogQuery): Promise<WithMetadata<ListNotificationLog[]>> {
        const { items, total } = await this.logs.findPage(query);

        return {
            data: items,
            metadata: {
                page: query.page,
                pageSize: query.pageSize,
                totalItems: total,
                totalPages: Math.ceil(total / query.pageSize),
            },
        };
    }
}
