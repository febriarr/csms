/**
 * Enum values the frontend needs. They are duplicated from the database enums on purpose: this package must
 * not depend on the database package (the browser imports it). Keep them in sync — the backend can guard
 * against drift with a unit test comparing these arrays to `deviceStateEnum.enumValues`, and so on.
 */
export const DEVICE_STATES = ["NORMAL", "DEFROST", "WARNING", "CRITICAL", "OFFLINE"] as const;
export type DeviceState = (typeof DEVICE_STATES)[number];

export const ALERT_REASONS = [
    "DEFROST_DETECTED",
    "WARNING_TEMPERATURE",
    "CRITICAL_TEMPERATURE",
    "TEMPERATURE_RECOVERED",
    "DEVICE_OFFLINE",
    "DEVICE_RECOVERED",
] as const;
export type AlertReason = (typeof ALERT_REASONS)[number];

export const NOTIFICATION_CHANNELS = ["WHATSAPP", "EMAIL"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const SUBSCRIPTION_SCOPES = ["ALL", "DIVISION", "LOCATION", "COLD_STORAGE", "DEVICE"] as const;
export type SubscriptionScope = (typeof SUBSCRIPTION_SCOPES)[number];

export const PAUSE_KINDS = ["MAINTENANCE", "MACHINE_OFF"] as const;
export type PauseKind = (typeof PAUSE_KINDS)[number];

/** Reports may only look at this many days at a time (shared so the UI date picker can enforce it too). */
export const MAX_REPORT_RANGE_DAYS = 30;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
