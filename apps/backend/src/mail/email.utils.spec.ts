import { EmailUtils } from './email.utils';

describe('EmailUtils.build', () => {
    const message = ['🚨 *CRITICAL*', 'Device: *Chiller <1>*', 'Temperature: *-5°C*'].join('\n');

    it('puts the severity and device name in the subject', () => {
        expect(EmailUtils.build(message, 'CRITICAL').subject).toBe('[CSMS] CRITICAL - Chiller <1>');
    });

    it('drops the WhatsApp bold markers from the text part', () => {
        expect(EmailUtils.build(message, 'CRITICAL').text).toBe('🚨 CRITICAL\nDevice: Chiller <1>\nTemperature: -5°C');
    });

    it('escapes HTML and turns *bold* into <strong>', () => {
        const { html } = EmailUtils.build(message, 'CRITICAL');

        expect(html).toContain('<strong>Chiller &lt;1&gt;</strong>');
        expect(html).not.toContain('<1>');
    });

    it('still builds a subject when there is no Device line', () => {
        expect(EmailUtils.build('hello', 'WARNING').subject).toBe('[CSMS] WARNING');
    });
});
