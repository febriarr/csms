import type { PauseKind } from "@workspace/validator";
import type { Timestamps } from "./timestamp.type";

/**
 * Where a pause is in time, judged from its own timestamps only.
 */
export type PauseTimeline = "SCHEDULED" | "ACTIVE" | "ENDED";

export interface MonitoringPause extends Timestamps {
    id: string;
    deviceId: string | null;
    coldStorageId: string | null;
    kind: PauseKind;
    startsAt: Date;
    endsAt: Date | null;
    maxPulldownMinutes: number;
    note: string | null;
    createdBy: string | null;
    endedBy: string | null;
}

export interface MonitoringPauseView extends MonitoringPause {
    timeline: PauseTimeline;
    /** Set when the pause targets one device. */
    deviceName: string | null;
    deviceCode: string | null;
    /** Set when the pause targets a whole cold storage. */
    coldStorageName: string | null;
}

/**
 * ACTIVE pauses suppress alerts. PULLING_DOWN means the pause has ended but the machine is still given time to
 * bring the temperature down (see `max_pulldown_minutes`); alerts stay suppressed until the first reading below
 * the warning threshold or until that time runs out.
 */
export type SuppressionPhase = "PAUSED" | "PULLING_DOWN";

export interface SuppressingPause {
    deviceId: string;
    pauseId: string;
    kind: PauseKind;
    startsAt: Date;
    endsAt: Date | null;
    phase: SuppressionPhase;
}

/** What the alert text needs to explain an alert raised right after a pause ran out of pull-down time. */
export interface ExpiredPause {
    kind: PauseKind;
    endedAt: Date;
}
