import type { AlertReason, DeviceState, PauseKind, ReadingEvaluation, TemperatureState } from "@workspace/validator";
import type { DeviceUpdateEvent } from "./devices.type";

export interface Temperature {
    deviceId: string;
    recordedAt: Date;
    temperature: number;
    receivedAt: Date;
    /** How the reading classified against the device's thresholds when it arrived. A snapshot: never recomputed. */
    state: TemperatureState;
    /** Whether the alert logic looked at the reading when it arrived and, if not, why. */
    evaluation: ReadingEvaluation;
    /** The planned pause behind PAUSED / PULLING_DOWN, otherwise null. */
    pauseId: string | null;
}

export type TemperatureReading = Pick<
    Temperature,
    "recordedAt" | "temperature" | "receivedAt" | "state" | "evaluation" | "pauseId"
>;

export type ReportDevice = {
    id: string;
    code: string;
    name: string;
    coldStorageId: string;
    /** Seconds between two readings: what "how many readings should there have been" is measured against. */
    heartbeatIntervalSeconds: number;
};

export type ReportDays = { from: string; to: string };

export type TemperatureReport = ReportDays & { device: ReportDevice } & TemperatureReading;

/**
 * One line of the temperature report: the raw reading plus the context that explains it. `note` is plain English
 * text, empty when there is nothing to explain (a normal reading nobody needed to look at).
 */
export type TemperatureReportRow = Pick<
    Temperature,
    "recordedAt" | "temperature" | "receivedAt" | "state" | "evaluation"
> & { note: string | null };

/**
 * One hour of the hourly report (hours are in the plant time zone). The temperature columns are null for an hour
 * without readings: an hour with no data is a result too (the device was silent), so it stays in the list.
 */
export type TemperatureHourlyRow = {
    /** Start of the hour. */
    hour: Date;
    readings: number;
    /** What the heartbeat interval says should have arrived (an approximation: see ReportDevice). */
    expectedReadings: number;
    /** Readings against expected, 0 to 100. Null when nothing was expected yet. */
    coverage: number | null;
    minTemperature: number | null;
    avgTemperature: number | null;
    maxTemperature: number | null;
    /** The worst state any reading of the hour had. Null without readings. */
    worstState: TemperatureState | null;
    warningCount: number;
    criticalCount: number;
    /** Readings the alert logic did not look at (planned pause, pull-down, monitoring off, late arrival). */
    notEvaluated: number;
    /** The hour is not over yet: its numbers will still change. */
    inProgress: boolean;
    note: string | null;
};

/** A state change of the device, as the alert table recorded it. */
export type ReportAlertEvent = {
    type: "ALERT";
    /** When it happened (the device time of the reading that caused it). */
    at: Date;
    fromState: DeviceState;
    toState: DeviceState;
    reasonCode: AlertReason;
    reason: string | null;
    temperature: number | null;
};

/** A planned pause that touched the device, directly or through its cold storage. */
export type ReportPauseEvent = {
    type: "PAUSE";
    /** When the pause started. */
    at: Date;
    id: string;
    kind: PauseKind;
    scope: "DEVICE" | "COLD_STORAGE";
    endsAt: Date | null;
    maxPulldownMinutes: number;
    note: string | null;
};

export type ReportEvent = ReportAlertEvent | ReportPauseEvent;

/** How many readings of the period fall in each state, and how many the alert logic did not look at. */
export type TemperatureReportSummary = {
    total: number;
    byState: Record<TemperatureState, number>;
    byEvaluation: Record<ReadingEvaluation, number>;
};

/** What a device gets back. `duplicate` tells a retry apart from a new reading; both are successes. */
export type TelemetryAck = {
    deviceId: string;
    recordedAt: Date;
    temperature: number;
    duplicate: boolean;
};

/** The result of one ingest transaction: the reply, and the live update to publish once it has committed. */
export type IngestOutcome = {
    ack: TelemetryAck;
    event: DeviceUpdateEvent | null;
};

/** One point of a sparkline: the highest reading of one minute (the worst one, so a spike is not smoothed away). */
export type RecentReading = Pick<Temperature, "recordedAt" | "temperature">;
