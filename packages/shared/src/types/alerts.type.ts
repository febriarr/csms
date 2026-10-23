import type { AlertReason, DeviceState } from "@workspace/validator";
import type { Timestamps } from "./timestamp.type";

export interface Alert extends Timestamps {
    id: string;
    deviceId: string;
    fromState: DeviceState;
    toState: DeviceState;
    reasonCode: AlertReason;
    reason: string | null;
    temperature: number | null;
    occuredAt: Date;
    acknowledgedAt: Date | null;
    acknowledgedBy: string | null;
}

export interface ListAlert extends Alert {
    deviceCode: string;
    deviceName: string;
    acknowledgedByName: string | null;
    coldStorage: string;
}
