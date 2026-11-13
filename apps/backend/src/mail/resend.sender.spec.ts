import type { ConfigService } from '@nestjs/config';
import { ResendSender } from './resend.sender';

const config = {
    get: (key: string) => ({ RESEND_API_KEY: 're_test', EMAIL_FROM: 'CSMS <alerts@example.com>' })[key],
} as unknown as ConfigService<never, true>;

describe('ResendSender', () => {
    afterEach(() => jest.restoreAllMocks());

    it('posts the message to Resend with the bearer key', async () => {
        const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{"id":"1"}', { status: 200 }));

        await new ResendSender(config).send('pic@example.com', 'Device: *A*', 'WARNING');

        const [url, init] = fetchMock.mock.calls[0];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-base-to-string
        const body = JSON.parse(String((init as RequestInit).body));

        expect(url).toBe('https://api.resend.com/emails');
        expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer re_test' });
        expect(body).toMatchObject({
            from: 'CSMS <alerts@example.com>',
            to: ['pic@example.com'],
            subject: '[CSMS] WARNING - A',
        });
    });

    it('throws when Resend answers with an error so the dispatcher retries', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{"message":"bad"}', { status: 422 }));

        await expect(new ResendSender(config as never).send('x@example.com', 'm', 'WARNING')).rejects.toThrow(
            /Resend 422/,
        );
    });
});
