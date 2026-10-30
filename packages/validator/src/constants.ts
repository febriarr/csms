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
export const NOTIFICATION_STATUSES = ["PENDING", "SUCCESS", "FAILED"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const SUBSCRIPTION_SCOPES = ["ALL", "DIVISION", "LOCATION", "COLD_STORAGE", "DEVICE"] as const;
export type SubscriptionScope = (typeof SUBSCRIPTION_SCOPES)[number];

export const PAUSE_KINDS = ["MAINTENANCE", "MACHINE_OFF"] as const;
export type PauseKind = (typeof PAUSE_KINDS)[number];

/**
 * How ONE reading classifies against its device's thresholds. Unlike DEVICE_STATES it has no OFFLINE: a device
 * that sends a reading is not offline.
 */
export const TEMPERATURE_STATES = ["NORMAL", "DEFROST", "WARNING", "CRITICAL"] as const;
export type TemperatureState = (typeof TEMPERATURE_STATES)[number];

/**
 * Whether the alert logic looked at a stored reading and, when it did not, why. This is what explains "above the
 * threshold, but no alert" in a report:
 *   EVALUATED        the reading went through the normal state / alert rules
 *   PAUSED           a planned pause (maintenance, machine off) was running
 *   PULLING_DOWN     the pause had ended and the machine was still given time to cool down
 *   DEVICE_INACTIVE  monitoring is switched off for the device
 *   LATE_ARRIVAL     older than the device's newest reading: kept as history only
 */
export const READING_EVALUATIONS = ["EVALUATED", "PAUSED", "PULLING_DOWN", "DEVICE_INACTIVE", "LATE_ARRIVAL"] as const;
export type ReadingEvaluation = (typeof READING_EVALUATIONS)[number];

/** Reports may only look at this many days at a time (shared so the UI date picker can enforce it too). */
export const MAX_REPORT_RANGE_DAYS = 30;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
