import type { DevicesState, SelectDevices } from '../database/schema';

/* ------------------------------------------------------------------ states */

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

/* -------------------------------------------------------------- thresholds */

/**
 * `defrostThreshold` is null for devices that have no DEFROST state (the production spiral).
 * Declared explicitly (instead of Pick<SelectDevices, ...>) so the rule has no database dependency.
 */
export type TemperatureThresholds = {
    defrostThreshold: number | null;
    warningThreshold: number;
    criticalThreshold: number;
};

/* ------------------------------------------------------------ alert reason */

export type PauseKind = 'MAINTENANCE' | 'MACHINE_OFF';

export type PauseContext = {
    kind: PauseKind;
    endedAt: Date;
};

export type AlertReasonContext = {
    device: Pick<SelectDevices, 'defrostThreshold' | 'warningThreshold' | 'criticalThreshold' | 'lastSeenAt'>;
    /** The reading that caused the transition. Not needed for DEVICE_OFFLINE / DEVICE_RECOVERED. */
    temperature?: number;
    /** Previous state: enables "fell from X" wording and the "was offline" note. */
    fromState?: DevicesState;
    /** Set when this is the first alert after a planned pause (pull-down time ran out while still too warm). */
    pause?: PauseContext;
};
