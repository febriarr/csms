import type { DeviceState, PauseKind } from "@workspace/validator";
import type { Timestamps } from "./timestamp.type";
import type { SuppressionPhase } from "./monitoring_pauses.type";

export interface Device extends Timestamps {
    id: string;
    code: string;
    name: string;
    coldStorageId: string;
    pointLabel: string | null;
    defrostThreshold: number | null;
    warningThreshold: number;
    criticalThreshold: number;
    heartbeatIntervalSeconds: number;
    firmwareVersion: string | null;

    state: DeviceState;
    stateChangedAt: Date;
    lastSeenAt: Date | null;

    lastTemperature: number | null;
    lastRecordedAt: Date | null;

    isActive: boolean;
    deletedAt: Date | null;
    deletedBy: string | null;
}

export interface DeviceWithPlace extends Device {
    coldStorageName: string;
    locationId: string;
    locationName: string;
    divisionId: string;
    divisionName: string;
}

/** ACTIVE: alerts work normally. See SuppressionPhase for the other two. */
export type MonitoringStatus = "ACTIVE" | SuppressionPhase;

export interface DeviceMonitoring {
    status: MonitoringStatus;
    pause: {
        id: string;
        kind: PauseKind;
        startsAt: Date;
        endsAt: Date | null;
    } | null;
}

export interface DeviceView extends DeviceWithPlace {
    monitoring: DeviceMonitoring;
}

/**
 * What the live status page receives. It always carries the device's current known values, so a client can
 * replace its copy of the device with it, whatever caused the event (a reading, a state change, going offline).
 * Dates are serialised to ISO strings by JSON.
 */
export type DeviceUpdateEvent = {
    id: string;
    code: string;
    name: string;
    coldStorageId: string;
    state: DeviceState;
    isActive: boolean;
    lastTemperature: number | null;
    lastSeenAt: Date | null;
    stateChangedAt: Date;
    /** True while a planned pause suppresses alerts for this device. */
    paused: boolean;
};

export const DEVICE_UPDATE_EVENT = "device-update";
