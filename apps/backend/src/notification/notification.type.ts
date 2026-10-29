import type { SelectNotificationRecipient } from '@/database/schema';

export type NotificationChannel = SelectNotificationRecipient['channel'];

/** What the message is about; the dispatcher uses it to send urgent things first and to pace the sending. */
export type NotificationSeverity = 'WARNING' | 'CRITICAL' | 'OFFLINE';

/**
 * One channel's way of delivering a message (WhatsApp today, e-mail later). A sender only delivers: choosing the
 * recipients, remembering the outcome and retrying belong to the dispatcher. `send` must throw when the message was
 * not delivered, so the dispatcher can schedule a retry.
 */
export interface NotificationSender {
    readonly channel: NotificationChannel;
    send(target: string, message: string, severity: NotificationSeverity): Promise<void>;
}

/** Multi-provider token: every sender registers itself under it and the dispatcher receives the whole list. */
export const NOTIFICATION_SENDERS = Symbol('NOTIFICATION_SENDERS');

export type AlertMessageInput = {
    severity: 'WARNING' | 'CRITICAL';
    deviceName: string;
    deviceCode: string;
    /** "Location / Cold storage (point)": where the people receiving this have to go. */
    placeLabel: string;
    temperature: number;
    reason: string;
    at: Date;
};

export type OfflineMessageInput = {
    deviceName: string;
    deviceCode: string;
    placeLabel: string;
    lastSeenAt: Date | null;
    lastTemperature: number | null;
    detectedAt: Date;
};

export type DispatchableLog = {
    id: string;
    channel: NotificationChannel;
    recipient: string;
    message: string;
    attemptCount: number;
    severity: NotificationSeverity;
};
