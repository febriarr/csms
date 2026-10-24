import { WhatsappUtils } from './whatsapp.utils';

describe('WhatsappUtils.toJid', () => {
    it('should turn the ways people write a number into a WhatsApp id', () => {
        expect(WhatsappUtils.toJid('628123456789')).toBe('628123456789@s.whatsapp.net');
        expect(WhatsappUtils.toJid('0812-3456-789')).toBe('628123456789@s.whatsapp.net');
        expect(WhatsappUtils.toJid('+62 812 3456 789')).toBe('628123456789@s.whatsapp.net');
    });

    it('should leave an id that already has a domain alone', () => {
        expect(WhatsappUtils.toJid('628123456789@s.whatsapp.net')).toBe('628123456789@s.whatsapp.net');
    });
});

describe('WhatsappUtils.delayFor', () => {
    it('should stay inside the range of its severity, at both ends', () => {
        expect(WhatsappUtils.delayFor('CRITICAL', () => 0)).toBe(1500);
        expect(WhatsappUtils.delayFor('CRITICAL', () => 0.999999)).toBe(3500);
        expect(WhatsappUtils.delayFor('WARNING', () => 0)).toBe(3000);
        expect(WhatsappUtils.delayFor('WARNING', () => 0.999999)).toBe(6000);
        expect(WhatsappUtils.delayFor('OFFLINE', () => 0)).toBe(2000);
    });

    it('should be shorter for urgent messages than for a warning', () => {
        const same = () => 0.5;

        expect(WhatsappUtils.delayFor('CRITICAL', same)).toBeLessThan(WhatsappUtils.delayFor('WARNING', same));
    });
});
