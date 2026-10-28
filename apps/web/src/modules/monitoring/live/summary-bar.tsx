import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { STATE_META, STATE_ORDER, type DisplayState } from "./constants";
import type { StreamStatus } from "./hooks";
import { Badge } from "@workspace/ui/components/badge";

export type StateFilter = DisplayState | "ALL";

/** These four are always shown (a zero is information too); the others only when some device is in that state. */
const ALWAYS_SHOWN: readonly DisplayState[] = ["CRITICAL", "WARNING", "OFFLINE", "NORMAL"];

const STREAM_LABELS: Record<StreamStatus, { label: string; dot: string; text: string }> = {
    connecting: { label: "Connecting...", dot: "bg-muted-foreground", text: "text-muted-foreground" },
    live: {
        label: "Live",
        dot: "bg-emerald-500 motion-safe:animate-pulse",
        text: "text-emerald-600 dark:text-emerald-400",
    },
    reconnecting: { label: "Reconnecting...", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
    closed: { label: "Stream closed, reload the page", dot: "bg-destructive", text: "text-destructive" },
};

type SummaryBarProps = {
    counts: Record<DisplayState, number>;
    total: number;
    value: StateFilter;
    onChange: (value: StateFilter) => void;
    stream: StreamStatus;
};

export function SummaryBar({ counts, total, value, onChange, stream }: SummaryBarProps) {
    const states = STATE_ORDER.filter((state) => ALWAYS_SHOWN.includes(state) || counts[state] > 0);
    const connection = STREAM_LABELS[stream];

    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    variant={value === "ALL" ? "secondary" : "outline"}
                    aria-pressed={value === "ALL"}
                    onClick={() => onChange("ALL")}
                >
                    All
                    <span className="font-mono text-xs text-muted-foreground">{total}</span>
                </Button>

                {states.map((state) => (
                    <Button
                        key={state}
                        size="sm"
                        variant={value === state ? "secondary" : "outline"}
                        aria-pressed={value === state}
                        onClick={() => onChange(value === state ? "ALL" : state)}
                    >
                        <span aria-hidden className={cn("size-2 rounded-full", STATE_META[state].dot)} />
                        {STATE_META[state].label}
                        <span className="font-mono text-xs text-muted-foreground">{counts[state]}</span>
                    </Button>
                ))}
            </div>

            <Badge variant="outline" asChild>
                <span role="status" className={cn("flex items-center gap-2 text-xs font-medium", connection.text)}>
                    <span aria-hidden className={cn("size-2 rounded-full", connection.dot)} />
                    {connection.label}
                </span>
            </Badge>
        </div>
    );
}
