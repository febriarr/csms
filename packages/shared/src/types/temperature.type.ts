import type { DeviceUpdateEvent } from "./devices.type";

export interface Temperature {
    deviceId: string;
    recordedAt: Date;
    temperature: number;
    receivedAt: Date;
}

export type TemperatureReading = Pick<Temperature, "recordedAt" | "temperature" | "receivedAt">;

export type ReportDevice = { id: string; code: string; name: string };

export type ReportDays = { from: string; to: string };

export type TemperatureReport = ReportDays & { device: ReportDevice } & TemperatureReading;

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
