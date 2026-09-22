import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationsRecipientsService } from '../../../../src/features/notifications-recipients/notifications-recipients.service';
import { NotFoundError } from '../../../../src/shared/errors';
import type { NotificationsRecipientsRepository } from '../../../../src/features/notifications-recipients/notifications-recipients.repository';

function makeRepo(): NotificationsRecipientsRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn(),
  } as unknown as NotificationsRecipientsRepository;
}

describe('NotificationsRecipientsService', () => {
  let repo: NotificationsRecipientsRepository;
  let service: NotificationsRecipientsService;

  beforeEach(() => {
    repo = makeRepo();
    service = new NotificationsRecipientsService(repo);
  });

  describe('delete', () => {
    it('should throw NotFoundError when the recipient does not exist', async () => {
      vi.mocked(repo.findById).mockResolvedValue(undefined);

      await expect(service.delete('missing-id')).rejects.toThrow(NotFoundError);
      expect(repo.deleteById).not.toHaveBeenCalled();
    });

    it('should delete the recipient when it exists', async () => {
      const recipient = { id: 'r1', name: 'x', channel: 'email', target: 'a@a.com', isActive: true, createdAt: new Date() };
      vi.mocked(repo.findById).mockResolvedValue(recipient);
      vi.mocked(repo.deleteById).mockResolvedValue(recipient);

      const result = await service.delete('r1');

      expect(repo.deleteById).toHaveBeenCalledWith('r1');
      expect(result).toEqual(recipient);
    });
  });

  describe('create / update / findAll', () => {
    it('should delegate create to the repository', async () => {
      const input = { name: 'X', channel: 'email' as const, target: 'a@a.com' };
      vi.mocked(repo.create).mockResolvedValue({ id: 'r1', ...input, isActive: true, createdAt: new Date() });

      await service.create(input);

      expect(repo.create).toHaveBeenCalledWith(input);
    });

    it('should delegate update to the repository without checking existence first', async () => {
      // NOTE: unlike delete(), update() does not call getOrThrow first.
      await service.update('r1', { name: 'New name' });

      expect(repo.updateById).toHaveBeenCalledWith('r1', { name: 'New name' });
    });

    it('should forward the query filter to findAll', async () => {
      vi.mocked(repo.findAll).mockResolvedValue([]);

      await service.findAll({ channel: 'whatsapp' });

      expect(repo.findAll).toHaveBeenCalledWith({ channel: 'whatsapp' });
    });
  });
});
