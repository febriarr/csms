import type { NotificationSeverity } from '@/notification/notification.type';

/** Delay range in milliseconds between two messages, per severity. */
const DELAY_RANGES_MS: Record<NotificationSeverity, readonly [number, number]> = {
    CRITICAL: [1500, 3500],
    OFFLINE: [2000, 4500],
    WARNING: [3000, 6000],
};

export class WhatsappUtils {
    private constructor() {}

    /**
     * A random pause before a message, so the sending pattern is not perfectly regular (which is what gets numbers
     * flagged). Urgent things get a shorter range: a critical alert has to arrive fast. `random` is a parameter so
     * tests can pin it.
     */
    static delayFor(this: void, severity: NotificationSeverity, random: () => number = Math.random): number {
        const [min, max] = DELAY_RANGES_MS[severity];

        return Math.floor(random() * (max - min + 1)) + min;
    }

    /** "0812-3456-789", "+62 812 3456 789" and "6281234567 89@s.whatsapp.net" all become a WhatsApp JID. */
    static toJid(this: void, target: string): string {
        if (target.includes('@')) return target;

        let digits = target.replace(/\D/g, '');

        if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;

        return `${digits}@s.whatsapp.net`;
    }

    static sleep(this: void, ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
