import type { DeviceState } from '@workspace/validator';

/** The states that need a person to act: only these are counted as open alerts and shown as problems. */
export const ACTIONABLE_STATES = ['CRITICAL', 'WARNING', 'OFFLINE'] as const satisfies readonly DeviceState[];

export type ActionableState = (typeof ACTIONABLE_STATES)[number];

/** How many hours the alert chart looks back, the current hour included. */
export const ALERT_CHART_HOURS = 24;

export const NEEDS_ATTENTION_LIMIT = 5;
export const PROBLEM_COLD_STORAGE_LIMIT = 5;
export const DIAGNOSTICS_LIMIT = 3;
export const PAUSE_LIMIT = 5;

export type OpenAlertRow = { toState: DeviceState; total: number };
export type AlertPerHourRow = { hour: Date; toState: DeviceState; total: number };
export type NotificationStatusRow = { status: 'PENDING' | 'SUCCESS' | 'FAILED'; total: number };
