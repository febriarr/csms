import { ResetReason } from '@workspace/shared';

/** What a device sends along with a reading; a row is only stored when something in it is worth keeping. */
export type DiagnosticPayload = {
    sensorFailCount: number;
    wifiFailCount: number;
    httpFailCount: number;
    rssi: number | null;
    reason?: {
        resetReason: ResetReason;
        resetReasonCode: number;
        lastRssi: number | null;
        lastSensorFailCount: number;
        lastWifiFailCount: number;
        lastHttpFailCount: number;
    } | null;
};

/** The range used when a report is opened without choosing dates: today and the six days before it. */
export const DEFAULT_REPORT_DAYS = 7;
