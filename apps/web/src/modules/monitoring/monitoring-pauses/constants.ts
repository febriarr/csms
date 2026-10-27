import type { MonitoringPauseView, PauseTimeline } from "@workspace/shared";
import { PAUSE_KINDS, type PauseKind } from "@workspace/validator";

export { PAUSE_KINDS };

export const KIND_LABELS: Record<PauseKind, string> = {
    MAINTENANCE: "Maintenance",
    MACHINE_OFF: "Machine off",
};

/** Tab order: what an operator checks most often comes first. */
export const TIMELINES = ["ACTIVE", "SCHEDULED", "ENDED"] as const satisfies readonly PauseTimeline[];

export const TIMELINE_LABELS: Record<PauseTimeline, string> = {
    ACTIVE: "Active",
    SCHEDULED: "Scheduled",
    ENDED: "Ended",
};

export type PauseTarget = "COLD_STORAGE" | "DEVICE";

/** "Spiral 1 (1011)" for a device pause, the cold room name for a cold room pause. */
export function pauseTargetName(pause: MonitoringPauseView): string {
    return pause.deviceId ? `${pause.deviceName ?? "-"} (${pause.deviceCode ?? "-"})` : (pause.coldStorageName ?? "-");
}
