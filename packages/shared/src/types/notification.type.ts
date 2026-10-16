import type { NotificationChannel, SubscriptionScope } from "@workspace/validator";
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
