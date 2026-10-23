import type { Timestamps } from "./timestamp.type";

export type ResetReason = "BROWNOUT" | "PANIC" | "WATCHDOG" | "UNKNOWN";

export interface ResetReport {
    resetReason: ResetReason;
    resetReasonCode: number | null;
    lastRssi: number | null;
    lastSensorFailCount: number | null;
    lastWifiFailCount: number | null;
    lastHttpFailCount: number | null;
    recordedAt: Date;
}

export interface DiagnosticSummaryItem {
    deviceId: string;
    deviceCode: string;
    deviceName: string;
    coldStorageName: string;
    sensorFailTotal: number;
    wifiFailTotal: number;
    httpFailTotal: number;
    total: number;
    avgRssi: number | null;
    /** The most recent abnormal reset within the range, if any. */
    lastReason: ResetReport | null;
}

export interface DiagnosticTrendPoint {
    /** Calendar day in the plant's time zone, YYYY-MM-DD. */
    day: string;
    sensorFailTotal: number;
    wifiFailTotal: number;
    httpFailTotal: number;
    avgRssi: number | null;
}

export interface DiagnosticRange {
    from: string;
    to: string;
}

export interface DiagnosticSummaryReport extends DiagnosticRange {
    items: DiagnosticSummaryItem[];
}

export interface DiagnosticLogItem extends Timestamps {
    id: string;
    deviceId: string;
    sensorFailCount: number;
    wifiFailCount: number;
    httpFailCount: number;
    rssi: number;

    resetReason: ResetReason;
    resetReasonCode: number | null;
    lastRssi: number | null;
    lastSensorFailCount: number | null;
    lastWifiFailCount: number | null;
    lastHttpFailCount: number | null;
    recordedAt: Date;
    receivedAt: Date;
}
