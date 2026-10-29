import type { DevicesState, ReadingEvaluation, SelectDevices } from '../database/schema';

/* states */

export const TemperatureState = {
    NORMAL: 'NORMAL',
    DEFROST: 'DEFROST',
    WARNING: 'WARNING',
    CRITICAL: 'CRITICAL',
} as const;

export type TemperatureState = (typeof TemperatureState)[keyof typeof TemperatureState];

/** The states that page people (WhatsApp). Single source of truth for "should this transition notify?". */
export const NOTIFIABLE_STATES = ['WARNING', 'CRITICAL'] as const;

export type NotifiableState = (typeof NOTIFIABLE_STATES)[number];

/* thresholds */

/**
 * `defrostThreshold` is null for devices that have no DEFROST state (the production spiral).
 * Declared explicitly (instead of Pick<SelectDevices, ...>) so the rule has no database dependency.
 */
export type TemperatureThresholds = {
    defrostThreshold: number | null;
    warningThreshold: number;
    criticalThreshold: number;
};

/* reading evaluation */

/**
 * What decides whether the alert logic looks at a reading that is the device's newest one. Declared here (instead of
 * importing DeviceMonitoring) so the rule stays a plain function of plain values.
 */
export type EvaluationInput = {
    isActive: boolean;
    monitoring: { status: 'ACTIVE' | 'PAUSED' | 'PULLING_DOWN'; pause: { id: string } | null };
};

export type EvaluationResult = {
    evaluation: ReadingEvaluation;
    /** The pause behind PAUSED / PULLING_DOWN, otherwise null. */
    pauseId: string | null;
};

/* alert reason */

export type PauseKind = 'MAINTENANCE' | 'MACHINE_OFF';

export type PauseContext = {
    kind: PauseKind;
    endedAt: Date;
};

export type AlertReasonContext = {
    /**
     * The device row as it was BEFORE the reading was applied (do not re-read it after `touch`): `lastSeenAt` and
     * `lastTemperature` then describe the last message before an outage, which is what the offline notes print.
     */
    device: Pick<SelectDevices, 'defrostThreshold' | 'warningThreshold' | 'criticalThreshold' | 'lastSeenAt'> &
        Partial<Pick<SelectDevices, 'lastTemperature'>>;
    /** The reading that caused the transition. Not needed for DEVICE_OFFLINE. */
    temperature?: number;
    /** When that reading was recorded (device time). With `device.lastSeenAt` it gives the outage length. */
    occurredAt?: Date;
    /** Previous state: enables "fell from X" wording and the "was offline" notes. */
    fromState?: DevicesState;
    /** Set when this is the first alert after a planned pause (pull-down time ran out while still too warm). */
    pause?: PauseContext;
};
