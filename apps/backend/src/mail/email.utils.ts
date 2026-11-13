import type { NotificationSeverity } from '@/notification/notification.type';

export type EmailContent = { subject: string; text: string; html: string };

const ACCENT: Record<NotificationSeverity, string> = {
    WARNING: '#b45309',
    CRITICAL: '#b91c1c',
    OFFLINE: '#475569',
};

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Turns the WhatsApp-formatted alert text (one line per field, *bold* labels) into an e-mail. The wording stays
 * in NotificationUtils: this only changes the markup, so both channels always say the same thing.
 */
export class EmailUtils {
    private constructor() {}

    static build(this: void, message: string, severity: NotificationSeverity): EmailContent {
        const lines = message.split('\n');
        const text = lines.map((line) => line.replace(/\*/g, '')).join('\n');
        const device = lines
            .find((line) => line.startsWith('Device:'))
            ?.replace(/^Device:\s*/, '')
            .replace(/\*/g, '');
        const subject = `[CSMS] ${severity}${device ? ` - ${device}` : ''}`;

        const body = lines.map((line) => escapeHtml(line).replace(/\*([^*]+)\*/g, '<strong>$1</strong>')).join('<br>');

        const html =
            `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111827">` +
            `<div style="border-left:4px solid ${ACCENT[severity]};padding:8px 16px">${body}</div>` +
            `<p style="color:#6b7280;font-size:12px;margin-top:16px">Pesan otomatis dari CSMS.</p></div>`;

        return { subject, text, html };
    }
}
