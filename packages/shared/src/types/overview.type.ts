import type { AlertReason, DeviceState, NotificationStatus, PauseKind } from "@workspace/validator";
import type { DiagnosticSummaryItem } from "./diagnostics.type";
import type { PauseTimeline } from "./monitoring_pauses.type";

/**
 * What the Overview page shows, in one response (GET /overview). Dates are serialised to ISO strings by JSON.
 * Every number is computed by the server at `generatedAt`; the page does not combine several endpoints.
 */

export interface OverviewDevices {
    /** Every device that is not deleted. */
    total: number;
    /** Monitored devices that are not paused, per state: the same rule as the chips of the Live page. */
    byState: Record<DeviceState, number>;
    /** Devices whose alerts are suppressed right now by a planned pause (not the pull-down phase). */
    paused: number;
    /** Devices with monitoring switched off. */
    inactive: number;
    /** Monitored devices that are reporting (not OFFLINE), paused ones included. */
    online: number;
    /** Monitored devices: `online` is out of this number. */
    monitored: number;
}

/** Alerts nobody has acknowledged yet, for the states that need a person to act. */
export interface OverviewOpenAlertCounts {
    total: number;
    critical: number;
    warning: number;
    offline: number;
}

export interface OverviewAlert {
    id: string;
    deviceId: string;
    deviceCode: string;
    deviceName: string;
    coldStorageName: string;
    toState: DeviceState;
    reasonCode: AlertReason;
    reason: string | null;
    temperature: number | null;
    occurredAt: Date;
}

/** The device that makes a cold room look the way it does: the hottest one in the worst state. */
export interface OverviewWorstDevice {
    id: string;
    code: string;
    name: string;
    temperature: number | null;
    warningThreshold: number;
    criticalThreshold: number;
    stateChangedAt: Date;
}

export interface OverviewProblemColdStorage {
    id: string;
    name: string;
    locationName: string;
    /** CRITICAL, WARNING or OFFLINE: a cold room that is fine does not appear in this list. */
    worstState: DeviceState;
    deviceCount: number;
    problemDeviceCount: number;
    worstDevice: OverviewWorstDevice;
}

/** Alerts that moved a device into a bad state during one hour. */
export interface OverviewAlertBucket {
    /** Start of the hour. */
    hour: Date;
    warning: number;
    critical: number;
    offline: number;
}

export type OverviewNotificationCounts = Record<Lowercase<NotificationStatus>, number>;

export interface OverviewNotifications {
    /** Messages created today (plant time zone) per delivery status. */
    today: OverviewNotificationCounts;
    whatsapp: { enabled: boolean; connected: boolean };
}

export interface OverviewDiagnostics {
    /** Devices that reported at least one failure today. */
    affectedDevices: number;
    /** The worst few of them. */
    top: DiagnosticSummaryItem[];
}

export interface OverviewPause {
    id: string;
    kind: PauseKind;
    /** ACTIVE or SCHEDULED: ended pauses are not listed. */
    timeline: PauseTimeline;
    /** Device or cold room name, whichever the pause targets. */
    targetName: string;
    startsAt: Date;
    endsAt: Date | null;
    note: string | null;
}

export interface Overview {
    generatedAt: Date;
    devices: OverviewDevices;
    openAlerts: OverviewOpenAlertCounts;
    /** The newest open alerts, newest first. */
    needsAttention: OverviewAlert[];
    problemColdStorages: OverviewProblemColdStorage[];
    /** The last 24 hours, one entry per hour, oldest first. Hours without alerts are present with zeros. */
    alertsLast24h: OverviewAlertBucket[];
    notifications: OverviewNotifications;
    diagnostics: OverviewDiagnostics;
    pauses: OverviewPause[];
}
