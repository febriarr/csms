import type { DeviceState, NotificationChannel, NotificationStatus, SubscriptionScope } from "@workspace/validator";
import type { Timestamps } from "./timestamp.type";

// Single source of truth is constants.ts; re-exported so existing imports keep working.
export type { NotificationChannel, SubscriptionScope };
export type NotificationSubscriptionScope = SubscriptionScope;

export interface NotificationRecipient extends Timestamps {
    id: string;
    name: string;
    /** The PIC's own division; null = none (the FK is ON DELETE SET NULL). */
    divisionId: string | null;
    channel: NotificationChannel;
    target: string;
    isActive: boolean;
}

export interface ListNotificationRecipient extends NotificationRecipient {
    /** Name of the PIC's division; null when divisionId is null. */
    division: string | null;
}

/**
 * Exactly one of the four ids is set, matching `scope` (none for ALL). They are kept so the edit form can
 * be pre-filled and sent back whole to PUT /notification-recipients/:id/subscriptions.
 */
export interface NotificationSubscriptionItem {
    id: string;
    recipientId: string;
    scope: SubscriptionScope;
    divisionId: string | null;
    locationId: string | null;
    coldStorageId: string | null;
    deviceId: string | null;
    /** Name of what the scope points at (device / cold storage / location / division); null for ALL. */
    targetName: string | null;
}

/** Row of the single notification page: a recipient plus everything it subscribes to. */
export interface NotificationRecipientWithSubscriptions extends ListNotificationRecipient {
    subscriptions: NotificationSubscriptionItem[];
}

/** One message of the outbox: what was sent (or tried) to whom, and how it went. */
export interface NotificationLog extends Timestamps {
    id: string;
    alertId: string;
    /** null when the recipient was deleted afterwards (the FK is ON DELETE SET NULL). */
    recipientId: string | null;
    channel: NotificationChannel;
    /** Snapshot of the target at send time: stays correct when the recipient is edited or deleted. */
    recipient: string | null;
    status: NotificationStatus;
    attemptCount: number;
    message: string | null;
    errorMessage: string | null;
    sentAt: Date | null;
}

/** Row of the notification log report: the log plus the alert, device and recipient it belongs to. */
export interface ListNotificationLog extends NotificationLog {
    /** Current name of the recipient; null when it no longer exists. */
    recipientName: string | null;
    /** The state the alert moved into (WARNING, CRITICAL, OFFLINE are the ones that notify). */
    alertState: DeviceState;
    alertOccurredAt: Date;
    deviceId: string;
    deviceCode: string;
    deviceName: string;
    coldStorageName: string;
}
