import { EntityNotFoundException, ValidationException } from '@/common/exception/app.exception';
import { InsertNotificationRecipient, SelectNotificationRecipient } from '@/database/schema';
import { Injectable } from '@nestjs/common';
import {
    CreateNotificationRecipientInput,
    NotificationRecipientQuery,
    recipientTargetIssue,
    ReplaceSubscriptionsInput,
    UpdateNotificationRecipientInput,
} from '@workspace/validator';
import { NotificationRecipientRepository, RecipientRow } from './notification_recipient.repository';
import { NotificationSubscriptionRepository, SubscriptionRow } from './notification_subscription.repository';

export type RecipientWithSubscriptions = RecipientRow & { subscriptions: SubscriptionRow[] };

const recipientNotFound = (id: string) => new EntityNotFoundException('Penerima notifikasi', id);

@Injectable()
export class NotificationService {
    constructor(
        private readonly recipients: NotificationRecipientRepository,
        private readonly subscriptions: NotificationSubscriptionRepository,
    ) {}

    /** Two queries (recipients, then their subscriptions), joined here: no N+1, no duplicated recipient rows. */
    async listRecipients(query: NotificationRecipientQuery): Promise<RecipientWithSubscriptions[]> {
        const rows = await this.recipients.list(query);
        const subscriptions = await this.subscriptions.listByRecipientIds(rows.map((row) => row.id));

        const byRecipient = new Map<string, SubscriptionRow[]>();

        for (const subscription of subscriptions) {
            const bucket = byRecipient.get(subscription.recipientId) ?? [];
            bucket.push(subscription);
            byRecipient.set(subscription.recipientId, bucket);
        }

        return rows.map((row) => ({ ...row, subscriptions: byRecipient.get(row.id) ?? [] }));
    }

    async getRecipient(id: string): Promise<RecipientWithSubscriptions> {
        const row = await this.recipients.findById(id);

        if (!row) throw recipientNotFound(id);

        const subscriptions = await this.subscriptions.listByRecipientIds([id]);

        return { ...row, subscriptions };
    }

    /**
     * Creates the recipient together with its initial subscriptions in ONE transaction: if a subscription is
     * rejected (e.g. a target that no longer exists), the recipient is not created either, so there is never
     * a half-saved recipient for the user to clean up.
     */
    async createRecipient(input: CreateNotificationRecipientInput): Promise<RecipientWithSubscriptions> {
        const { subscriptions, ...recipient } = input;

        const created = await this.recipients.withTransaction(async (tx) => {
            const row = await this.recipients.create(recipient, tx);

            await this.subscriptions.createMany(row.id, subscriptions, tx);

            return row;
        });

        return this.getRecipient(created.id);
    }

    async updateRecipient(id: string, input: UpdateNotificationRecipientInput): Promise<RecipientWithSubscriptions> {
        const existing = await this.recipients.findById(id);

        if (!existing) throw recipientNotFound(id);

        const patch: Partial<InsertNotificationRecipient> = { ...input };

        // The validator can only judge channel + target when both are sent, so re-check on the merged values.
        if (input.channel !== undefined || input.target !== undefined) {
            const channel = input.channel ?? existing.channel;
            const target = input.target ?? existing.target;
            const issue = recipientTargetIssue(channel, target);

            if (issue) throw new ValidationException({ target: [issue] });

            patch.target = channel === 'EMAIL' ? target.toLowerCase() : target;
        }

        await this.recipients.updateById(id, patch);

        return this.getRecipient(id);
    }

    /** Subscriptions go with the recipient (onDelete cascade), so there is nothing to check first. */
    async deleteRecipient(id: string): Promise<void> {
        const deleted = await this.recipients.destroy(id);

        if (!deleted) throw recipientNotFound(id);
    }

    async replaceSubscriptions(id: string, input: ReplaceSubscriptionsInput): Promise<RecipientWithSubscriptions> {
        const existing = await this.recipients.findById(id);

        if (!existing) throw recipientNotFound(id);

        await this.subscriptions.replaceForRecipient(id, input.subscriptions);

        return this.getRecipient(id);
    }

    /** Entry point for the future alert dispatcher. */
    findRecipientsForDevice(
        deviceId: string,
        channel: SelectNotificationRecipient['channel'],
    ): Promise<SelectNotificationRecipient[]> {
        return this.recipients.findForDevice(deviceId, channel);
    }
}
