import { NotFoundError } from '../../shared/errors';
import { NotificationsRecipientsRepository } from './notifications-recipients.repository';
import type {
  NotificationRecipientsInput,
  NotificationRecipientsUpdateInput,
  NotificationsRecipientsQuery,
} from './notifications-recipients.validator';

export class NotificationsRecipientsService {
  constructor(private readonly repository: NotificationsRecipientsRepository) {}

  private async getOrThrow(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Notification recipient with id ${id} not found`);
    }

    return existing;
  }

  async findAll(query?: NotificationsRecipientsQuery) {
    return this.repository.findAll(query);
  }

  async create(input: NotificationRecipientsInput) {
    return this.repository.create(input);
  }

  async update(id: string, input: NotificationRecipientsUpdateInput) {
    return this.repository.updateById(id, input);
  }

  async delete(id: string) {
    await this.getOrThrow(id);
    return this.repository.deleteById(id);
  }

  async findById(id: string) {
    return this.repository.findById(id);
  }
}
