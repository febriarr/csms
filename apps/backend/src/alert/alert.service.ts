import { EntityNotFoundException } from '@/common/exception/app.exception';
import { DatabaseTransaction } from '@/database/database.type';
import { InserAlert, SelectAlert } from '@/database/schema';
import { Injectable } from '@nestjs/common';
import type { AlertQuery } from '@workspace/validator';
import { AlertRepository } from './alert.repository';
import type { ListAlert, WithMetadata } from '@workspace/shared';

@Injectable()
export class AlertService {
    constructor(private readonly repo: AlertRepository) {}

    async findAll(query: AlertQuery): Promise<WithMetadata<ListAlert[]>> {
        const { items, total, totalPages } = await this.repo.findPage(query);

        return {
            data: items,
            metadata: {
                page: query.page,
                pageSize: query.pageSize,
                totalItems: total,
                totalPages,
            },
        };
    }

    /**
     * Acknowledging twice is not an error: the first acknowledgement (who and when) is kept and returned, so a
     * double click or a retry after a lost response behaves the same as the first call.
     */
    async acknowledge(id: string, userId: string): Promise<SelectAlert> {
        const acknowledged = await this.repo.acknowledge(id, userId, new Date());

        if (acknowledged) return acknowledged;

        const existing = await this.repo.findOne(id);

        if (!existing) throw new EntityNotFoundException('Alert', id);

        return existing;
    }

    /** Records one state transition. Called by the telemetry service and the offline job, inside their transaction. */
    record(input: InserAlert, tx?: DatabaseTransaction): Promise<SelectAlert> {
        return this.repo.record(input, tx);
    }
}
