import { EntityNotFoundException, ValidationException } from '@/common/exception/app.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NotificationRecipientRepository } from './notification_recipient.repository';
import { NotificationSubscriptionRepository } from './notification_subscription.repository';

describe('NotificationService', () => {
    let service: NotificationService;

    const tx = { __tx: true };

    const recipients = {
        list: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateById: jest.fn(),
        destroy: jest.fn(),
        findForDevice: jest.fn(),
        withTransaction: jest.fn(),
    };
    const subscriptions = {
        listByRecipientIds: jest.fn(),
        createMany: jest.fn(),
        replaceForRecipient: jest.fn(),
    };

    const whatsappRecipient = { id: 'r1', channel: 'WHATSAPP', target: '628123456789', division: null };

    beforeEach(async () => {
        jest.resetAllMocks();
        subscriptions.listByRecipientIds.mockResolvedValue([]);
        recipients.withTransaction.mockImplementation((callback: (t: unknown) => unknown) => callback(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationService,
                { provide: NotificationRecipientRepository, useValue: recipients },
                { provide: NotificationSubscriptionRepository, useValue: subscriptions },
            ],
        }).compile();

        service = module.get(NotificationService);
    });

    it('lists recipients with their subscriptions, empty array when none', async () => {
        recipients.list.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
        subscriptions.listByRecipientIds.mockResolvedValue([{ id: 's1', recipientId: 'r1' }]);

        const result = await service.listRecipients({});

        expect(result[0].subscriptions).toHaveLength(1);
        expect(result[1].subscriptions).toEqual([]);
    });

    describe('createRecipient', () => {
        const input = {
            name: 'Budi',
            channel: 'WHATSAPP' as const,
            target: '628123456789',
            isActive: true,
            subscriptions: [{ scope: 'DIVISION' as const, divisionId: 'd1' }],
        };

        beforeEach(() => {
            recipients.create.mockResolvedValue({ id: 'r1' });
            recipients.findById.mockResolvedValue(whatsappRecipient);
        });

        it('creates the recipient and its subscriptions inside the same transaction', async () => {
            await service.createRecipient(input);

            expect(recipients.create).toHaveBeenCalledWith(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                expect.not.objectContaining({ subscriptions: expect.anything() }),
                tx,
            );
            expect(subscriptions.createMany).toHaveBeenCalledWith('r1', input.subscriptions, tx);
        });

        it('works with no subscriptions (recipient first, subscribe later)', async () => {
            await service.createRecipient({ ...input, subscriptions: [] });

            expect(subscriptions.createMany).toHaveBeenCalledWith('r1', [], tx);
        });

        it('does not return a recipient when saving subscriptions fails (transaction rolls back)', async () => {
            subscriptions.createMany.mockRejectedValue(new Error('foreign key violation'));

            await expect(service.createRecipient(input)).rejects.toThrow('foreign key violation');
            expect(recipients.findById).not.toHaveBeenCalled();
        });
    });

    it('re-validates target against the merged channel on a partial update', async () => {
        recipients.findById.mockResolvedValue(whatsappRecipient);

        await expect(service.updateRecipient('r1', { channel: 'EMAIL' })).rejects.toBeInstanceOf(ValidationException);
        expect(recipients.updateById).not.toHaveBeenCalled();
    });

    it('lower-cases the email target when switching channel and target together', async () => {
        recipients.findById.mockResolvedValue(whatsappRecipient);

        await service.updateRecipient('r1', { channel: 'EMAIL', target: 'Budi@Example.com' });

        expect(recipients.updateById).toHaveBeenCalledWith(
            'r1',
            expect.objectContaining({ channel: 'EMAIL', target: 'budi@example.com' }),
        );
    });

    it('throws NotFound when updating or deleting an unknown recipient', async () => {
        recipients.findById.mockResolvedValue(undefined);
        recipients.destroy.mockResolvedValue(undefined);

        await expect(service.updateRecipient('x', { name: 'A' })).rejects.toBeInstanceOf(EntityNotFoundException);
        await expect(service.deleteRecipient('x')).rejects.toBeInstanceOf(EntityNotFoundException);
    });

    it('does not touch subscriptions when the recipient does not exist', async () => {
        recipients.findById.mockResolvedValue(undefined);

        await expect(service.replaceSubscriptions('x', { subscriptions: [] })).rejects.toBeInstanceOf(
            EntityNotFoundException,
        );
        expect(subscriptions.replaceForRecipient).not.toHaveBeenCalled();
    });

    it('replaces subscriptions for an existing recipient', async () => {
        recipients.findById.mockResolvedValue(whatsappRecipient);

        await service.replaceSubscriptions('r1', { subscriptions: [{ scope: 'ALL' }] });

        expect(subscriptions.replaceForRecipient).toHaveBeenCalledWith('r1', [{ scope: 'ALL' }]);
    });
});
