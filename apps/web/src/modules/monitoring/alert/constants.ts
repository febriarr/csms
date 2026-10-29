import { humanizeEnum } from "@/lib/format";

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

export const reasonLabel = (code: string) => humanizeEnum(code);
