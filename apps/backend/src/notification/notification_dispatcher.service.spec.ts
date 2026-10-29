import type { DispatchableLog, NotificationSender } from './notification.type';
import { NotificationDispatcherService } from './notification_dispatcher.service';
import type { NotificationLogRepository } from './notification_log.repository';

const NOW = new Date('2026-10-15T00:00:00.000Z');

function due(id: string, overrides: Partial<DispatchableLog> = {}): DispatchableLog {
    return {
        id,
        channel: 'WHATSAPP',
        recipient: '628123456789',
        message: `msg ${id}`,
        attemptCount: 0,
        severity: 'CRITICAL',
        ...overrides,
    };
}

function setup(logs: DispatchableLog[], senders: NotificationSender[]) {
    const sent: string[] = [];
    const failed: {
        id: string;
        attempts: number;
        error: string;
    }[] = [];

    let expired = 0;

    const repo = {
        expireStale: () => {
            expired++;

            return Promise.resolve(0);
        },

        findDue: () => Promise.resolve(logs),

        markSent: (id: string) => {
            sent.push(id);

            return Promise.resolve();
        },

        markFailed: (id: string, attempts: number, error: string) => {
            failed.push({
                id,
                attempts,
                error,
            });

            return Promise.resolve();
        },
    };

    const service = new NotificationDispatcherService(repo as unknown as NotificationLogRepository, senders);

    return {
        service,
        sent,
        failed,
        expired: () => expired,
    };
}

function sender(behaviour: (target: string) => Promise<void>, delivered: string[] = []): NotificationSender {
    return {
        channel: 'WHATSAPP',

        send: async (target) => {
            await behaviour(target);
            delivered.push(target);
        },
    };
}

describe('NotificationDispatcherService.dispatchDue', () => {
    it('should hand each due message to its channel sender and mark it sent', async () => {
        const delivered: string[] = [];

        const { service, sent } = setup([due('a'), due('b')], [sender(() => Promise.resolve(), delivered)]);

        expect(await service.dispatchDue(NOW)).toBe(2);
        expect(sent).toEqual(['a', 'b']);
        expect(delivered.length).toBe(2);
    });

    it('should expire messages that are too old on every pass', async () => {
        const { service, expired } = setup([], [sender(() => Promise.resolve())]);

        await service.dispatchDue(NOW);

        expect(expired()).toBe(1);
    });

    it('should count a failure, keep the error text and carry on with the next message', async () => {
        const failing = sender((target) => {
            if (target === 'bad') {
                return Promise.reject(new Error('socket closed'));
            }

            return Promise.resolve();
        });

        const { service, sent, failed } = setup(
            [
                due('a', {
                    attemptCount: 2,
                    recipient: 'bad',
                }),
                due('b'),
            ],
            [failing],
        );

        expect(await service.dispatchDue(NOW)).toBe(1);

        expect(failed).toEqual([
            {
                id: 'a',
                attempts: 2,
                error: 'socket closed',
            },
        ]);

        expect(sent).toEqual(['b']);
    });

    it('should leave a message untouched when its channel has no sender', async () => {
        const { service, sent, failed } = setup(
            [
                due('a', {
                    channel: 'EMAIL',
                }),
            ],
            [sender(() => Promise.resolve())],
        );

        expect(await service.dispatchDue(NOW)).toBe(0);
        expect(sent.length).toBe(0);
        expect(failed.length).toBe(0);
    });

    it('should work with no sender registered at all (WhatsApp disabled)', async () => {
        const { service, sent, failed } = setup([due('a')], []);

        expect(await service.dispatchDue(NOW)).toBe(0);
        expect(sent.length + failed.length).toBe(0);
    });

    it('should pass the severity so the sender can pace urgent messages differently', async () => {
        const severities: string[] = [];

        const { service } = setup(
            [
                due('a', {
                    severity: 'WARNING',
                }),
            ],
            [
                {
                    channel: 'WHATSAPP',

                    send: (_target, _message, severity) => {
                        severities.push(severity);

                        return Promise.resolve();
                    },
                },
            ],
        );

        await service.dispatchDue(NOW);

        expect(severities).toEqual(['WARNING']);
    });
});

describe('NotificationDispatcherService.poll', () => {
    it('should not start a second run while one is still going', async () => {
        let started = 0;
        let release: () => void = () => undefined;

        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });

        const repo = {
            expireStale: async () => {
                started++;

                await gate;

                return 0;
            },

            findDue: () => Promise.resolve([]),
        };

        const service = new NotificationDispatcherService(repo as unknown as NotificationLogRepository, []);

        const first = service.poll();

        await service.poll();

        release();

        await first;

        expect(started).toBe(1);
    });

    it('should survive a failing pass and run again afterwards', async () => {
        let calls = 0;

        const repo = {
            expireStale: () => {
                calls++;

                if (calls === 1) {
                    return Promise.reject(new Error('database away'));
                }

                return Promise.resolve(0);
            },

            findDue: () => Promise.resolve([]),
        };

        const service = new NotificationDispatcherService(repo as unknown as NotificationLogRepository, []);

        await service.poll();
        await service.poll();

        expect(calls).toBe(2);
    });
});
