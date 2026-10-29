import { pgEnum } from 'drizzle-orm/pg-core';

export const deviceStateEnum = pgEnum('device_state', ['NORMAL', 'DEFROST', 'WARNING', 'CRITICAL', 'OFFLINE']);

export const alertReasonEnum = pgEnum('alert_reason', [
    'DEFROST_DETECTED',
    'WARNING_TEMPERATURE',
    'CRITICAL_TEMPERATURE',
    'TEMPERATURE_RECOVERED',
    'DEVICE_OFFLINE',
    'DEVICE_RECOVERED',
]);

/**
 * One enum for Both recipients and delivery logs
 */

export const notificationChannelEnum = pgEnum('notification_channel', ['WHATSAPP', 'EMAIL']);

export const notificationStatusEnum = pgEnum('notification_status', ['PENDING', 'SUCCESS', 'FAILED']);

export const subscriptionScopeEnum = pgEnum('subscription_scope', [
    'ALL',
    'DIVISION',
    'LOCATION',
    'COLD_STORAGE',
    'DEVICE',
]);

export const pauseKindEnum = pgEnum('pause_kind', ['MAINTENANCE', 'MACHINE_OFF']);

export const resetReasonEnum = pgEnum('reset_reason', ['BROWNOUT', 'PANIC', 'WATCHDOG', 'UNKNOWN']);

/** How one stored reading classified against its device's thresholds. No OFFLINE: a reading means the device is up. */
export const temperatureStateEnum = pgEnum('temperature_state', ['NORMAL', 'DEFROST', 'WARNING', 'CRITICAL']);

/** Whether the alert logic looked at a stored reading and, if not, why (see `temperature_logs`). */
export const readingEvaluationEnum = pgEnum('reading_evaluation', [
    'EVALUATED',
    'PAUSED',
    'PULLING_DOWN',
    'DEVICE_INACTIVE',
    'LATE_ARRIVAL',
]);

/* Union types derived from the enums above (single source of truth). */
export type DevicesState = (typeof deviceStateEnum.enumValues)[number];
export type AlertReason = (typeof alertReasonEnum.enumValues)[number];
export type NotificationChannel = (typeof notificationChannelEnum.enumValues)[number];
export type NotificationStatus = (typeof notificationStatusEnum.enumValues)[number];
export type SubscriptionScope = (typeof subscriptionScopeEnum.enumValues)[number];
export type PauseKind = (typeof pauseKindEnum.enumValues)[number];
export type ResetReason = (typeof resetReasonEnum.enumValues)[number];
export type ReadingState = (typeof temperatureStateEnum.enumValues)[number];
export type ReadingEvaluation = (typeof readingEvaluationEnum.enumValues)[number];
