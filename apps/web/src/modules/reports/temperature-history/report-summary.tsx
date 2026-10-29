import type { TemperatureReportSummary } from "@workspace/shared";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { TEMPERATURE_STATES } from "@workspace/validator";

import { STATE_META } from "@/lib/device-state";

import { EVALUATION_META } from "./constants";

type ReportSummaryProps = {
    summary: TemperatureReportSummary | undefined;
    isPending: boolean;
};

const percent = (count: number, total: number) => (total === 0 ? "0%" : `${((count / total) * 100).toFixed(1)}%`);

function Tile({
    label,
    dot,
    value,
    note,
    title,
}: {
    label: string;
    dot?: string;
    value: number;
    note?: string;
    title?: string;
}) {
    return (
        <div className="rounded-xl border bg-card p-3 text-card-foreground" title={title}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {dot && <span aria-hidden className={cn("size-2 rounded-full", dot)} />}
                {label}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-2xl leading-none font-semibold tabular-nums">{value}</span>
                {note && <span className="font-mono text-xs text-muted-foreground">{note}</span>}
            </div>
        </div>
    );
}

/** How the readings of the period spread over the states, and how many the alert logic did not look at. */
export function ReportSummary({ summary, isPending }: ReportSummaryProps) {
    if (isPending) {
        return (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-18 rounded-xl" />
                ))}
            </div>
        );
    }

    if (!summary) return null;

    const { total, byState, byEvaluation } = summary;
    const notEvaluated = total - byEvaluation.EVALUATED;
    const breakdown = (Object.keys(EVALUATION_META) as (keyof typeof EVALUATION_META)[])
        .filter((key) => key !== "EVALUATED" && byEvaluation[key] > 0)
        .map((key) => `${EVALUATION_META[key].label}: ${byEvaluation[key]}`)
        .join(", ");

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Tile label="Readings" value={total} />

            {TEMPERATURE_STATES.map((state) => (
                <Tile
                    key={state}
                    label={STATE_META[state].label}
                    dot={STATE_META[state].dot}
                    value={byState[state]}
                    note={percent(byState[state], total)}
                />
            ))}

            <Tile
                label="Not evaluated"
                dot="bg-orange-500"
                value={notEvaluated}
                note={percent(notEvaluated, total)}
                title={breakdown || "Every reading went through the alert rules."}
            />
        </div>
    );
}
