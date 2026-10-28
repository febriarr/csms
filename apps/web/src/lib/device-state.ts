/** What a device is shown as. Inactive devices are not monitored, so they get a state of their own. */
export type DisplayState = "CRITICAL" | "WARNING" | "OFFLINE" | "DEFROST" | "NORMAL" | "INACTIVE" | "UNKNOWN";

/** Most urgent first: this is both the chip order and the sort order of the grid. */
export const STATE_ORDER: readonly DisplayState[] = [
    "CRITICAL",
    "WARNING",
    "OFFLINE",
    "DEFROST",
    "NORMAL",
    "INACTIVE",
    "UNKNOWN",
];

type StateMeta = {
    label: string;
    /** Badge and chip colors. */
    badge: string;
    /** Accent strip on the left edge of the card. */
    strip: string;
    /** Text color of the big reading and small accents. */
    text: string;
    /** Status dot. */
    dot: string;
    /** Border / ring of the whole card. */
    card: string;
};

// Tailwind only generates classes it can see as complete strings, so none of these are built from pieces.
const MUTED: Omit<StateMeta, "label"> = {
    badge: "border-border bg-muted text-muted-foreground",
    strip: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    card: "bg-muted/30",
};

export const STATE_META: Record<DisplayState, StateMeta> = {
    CRITICAL: {
        label: "Critical",
        badge: "border-destructive/40 bg-destructive/10 text-destructive",
        strip: "bg-destructive",
        text: "text-destructive",
        dot: "bg-destructive",
        card: "border-destructive/50 ",
    },
    WARNING: {
        label: "Warning",
        badge: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        strip: "bg-amber-500",
        text: "text-amber-600 dark:text-amber-400",
        dot: "bg-amber-500",
        card: "border-amber-500/40",
    },
    OFFLINE: { label: "Offline", ...MUTED },
    DEFROST: {
        label: "Defrost",
        badge: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        strip: "bg-sky-500",
        text: "text-sky-600 dark:text-sky-400",
        dot: "bg-sky-500",
        card: "border-sky-500/30",
    },
    NORMAL: {
        label: "Normal",
        badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        strip: "bg-emerald-500",
        text: "text-emerald-600 dark:text-emerald-400",
        dot: "bg-emerald-500",
        card: "",
    },
    INACTIVE: { label: "Inactive", ...MUTED },
    UNKNOWN: { label: "Unknown", ...MUTED },
};

/** Colors and label of any state string coming from the backend. An unexpected value is "Unknown", never "Normal". */
export function stateMeta(state: string) {
    const key = state.toUpperCase();

    return key in STATE_META ? STATE_META[key as DisplayState] : STATE_META.UNKNOWN;
}
