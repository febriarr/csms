import type { ConfigService } from '@nestjs/config';
import { ResendSender } from './resend.sender';

const mockSend = jest.fn();
const mockCtor = jest.fn();

jest.mock('resend', () => ({
    Resend: class {
        emails = { send: mockSend };
        constructor(apiKey: string) {
            mockCtor(apiKey);
        }
    },
}));

const values: Record<string, string> = {
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'CSMS <alerts@example.com>',
};

const config = {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => values[key],
} as unknown as ConfigService<never, true>;

describe('ResendSender', () => {
    afterEach(() => jest.clearAllMocks());

    it('sends the message through the Resend SDK', async () => {
        mockSend.mockResolvedValue({ data: { id: '1' }, error: null });

        await new ResendSender(config).send('pic@example.com', 'Device: *A*', 'WARNING');

        expect(mockCtor).toHaveBeenCalledWith('re_test');
        expect(mockSend).toHaveBeenCalledWith(
            expect.objectContaining({
                from: 'CSMS <alerts@example.com>',
                to: ['pic@example.com'],
                subject: '[CSMS] WARNING - A',
            }),
        );
    });

    it('throws when Resend returns an error so the dispatcher retries', async () => {
        mockSend.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'bad' } });

        await expect(new ResendSender(config).send('x@example.com', 'm', 'WARNING')).rejects.toThrow(/Resend: bad/);
    });
});
