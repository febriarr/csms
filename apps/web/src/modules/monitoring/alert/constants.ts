import { humanizeEnum } from "@/lib/format";
// the state colors are shared with the live page, so a state looks the same everywhere
import { STATE_META, type DisplayState } from "@/modules/monitoring/live/constants";

/** The three tabs above the table. `acknowledged` is a query filter of the backend. */
export type AckFilter = "OPEN" | "ACKNOWLEDGED" | "ALL";

export const ACK_FILTERS = ["OPEN", "ACKNOWLEDGED", "ALL"] as const satisfies readonly AckFilter[];

export const ACK_LABELS: Record<AckFilter, string> = {
    OPEN: "Open",
    ACKNOWLEDGED: "Acknowledged",
    ALL: "All",
};

export function acknowledgedParam(filter: AckFilter): boolean | undefined {
    if (filter === "ALL") return undefined;

    return filter === "ACKNOWLEDGED";
}

export function stateMeta(state: string) {
    const key = state.toUpperCase();

    return key in STATE_META ? STATE_META[key as DisplayState] : STATE_META.UNKNOWN;
}

export const reasonLabel = (code: string) => humanizeEnum(code);
