import type { DeviceView } from "@workspace/shared";

import { STATE_ORDER, type DisplayState } from "@/lib/device-state";

/** Colors of the zones in the threshold bar. */
export const ZONE_CLASSES = {
    normal: "bg-emerald-500/25",
    defrost: "bg-sky-500/25",
    warning: "bg-amber-500/30",
    critical: "bg-destructive/30",
} as const;

export function getDisplayState(device: DeviceView): DisplayState {
    if (!device.isActive) return "INACTIVE";

    const state = String(device.state).toUpperCase();

    // an unexpected value from the backend must not look like "all fine"
    return state !== "INACTIVE" && (STATE_ORDER as readonly string[]).includes(state)
        ? (state as DisplayState)
        : "UNKNOWN";
}
