import type { ReactNode } from "react";
import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import { ArrowRight } from "lucide-react";

import type { ReportEvent, TemperatureReportRow } from "@workspace/shared";
import { Badge } from "@workspace/ui/components/badge";

import { DeviceStateBadge } from "@/components/device-state-badge";
import { formatTemperature, humanizeEnum } from "@/lib/format";
import { formatDateTime } from "@/lib/format-date-time";

import { EVALUATION_META } from "./constants";

/* shared bits */

const PAUSE_STYLE = "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400";
const NOT_EVALUATED_STYLE = "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";

function Muted({ children }: { children: ReactNode }) {
    return <span className="text-muted-foreground">{children}</span>;
}

/** Quiet text when the alert logic looked at the reading, a badge (with the reason on hover) when it did not. */
function EvaluationCell({ evaluation }: { evaluation: TemperatureReportRow["evaluation"] }) {
    const meta = EVALUATION_META[evaluation];

    if (evaluation === "EVALUATED") return <Muted>{meta.label}</Muted>;

    return (
        <Badge variant="outline" className={NOT_EVALUATED_STYLE} title={meta.hint}>
            {meta.label}
        </Badge>
    );
}

/* readings */

/** No optional table features are needed (the backend paginates, nothing is sorted or hidden on the client). */
export const readingTableFeatures = tableFeatures({});

const readingHelper = createColumnHelper<typeof readingTableFeatures, TemperatureReportRow>();

export const readingColumns = readingHelper.columns([
    readingHelper.accessor("recordedAt", {
        header: "Time",
        cell: (info) => <span className="whitespace-nowrap">{formatDateTime(info.getValue())}</span>,
    }),
    readingHelper.accessor("temperature", {
        header: "Temperature",
        cell: (info) => <span className="font-mono tabular-nums">{formatTemperature(info.getValue())}</span>,
    }),
    readingHelper.accessor("state", {
        header: "State",
        cell: (info) => <DeviceStateBadge state={info.getValue()} />,
    }),
    readingHelper.accessor("evaluation", {
        header: "Evaluation",
        cell: (info) => <EvaluationCell evaluation={info.getValue()} />,
    }),
    readingHelper.accessor("note", {
        header: "Note",
        cell: (info) => {
            const note = info.getValue();

            return note ? (
                <span className="block max-w-md truncate text-muted-foreground" title={note}>
                    {note}
                </span>
            ) : (
                <Muted>-</Muted>
            );
        },
    }),
    readingHelper.accessor("receivedAt", {
        header: "Received",
        cell: (info) => <Muted>{formatDateTime(info.getValue())}</Muted>,
    }),
]);

/* events: alerts and planned pauses */

export const eventTableFeatures = tableFeatures({});

const eventHelper = createColumnHelper<typeof eventTableFeatures, ReportEvent>();

function EventKind({ event }: { event: ReportEvent }) {
    if (event.type === "ALERT") {
        return (
            <div className="flex items-center gap-1.5">
                <DeviceStateBadge state={event.fromState} />
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                <DeviceStateBadge state={event.toState} />
            </div>
        );
    }

    return (
        <Badge variant="outline" className={PAUSE_STYLE}>
            Pause · {humanizeEnum(event.kind)}
        </Badge>
    );
}

function EventDetail({ event }: { event: ReportEvent }) {
    if (event.type === "ALERT") {
        return (
            <div className="max-w-xl">
                <p>{event.reason ?? humanizeEnum(event.reasonCode)}</p>
                {event.temperature != null && (
                    <p className="font-mono text-xs text-muted-foreground">{formatTemperature(event.temperature)}</p>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-xl">
            <p>
                {event.scope === "DEVICE" ? "Set for this device" : "Set for the whole cold room"}
                {" · "}
                {event.endsAt ? `until ${formatDateTime(event.endsAt)}` : "until further notice"}
            </p>
            <p className="text-xs text-muted-foreground">
                Pull-down time {event.maxPulldownMinutes} min{event.note ? ` · ${event.note}` : ""}
            </p>
        </div>
    );
}

export const eventColumns = eventHelper.columns([
    eventHelper.display({
        id: "at",
        header: "Time",
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.at)}</span>,
    }),
    eventHelper.display({
        id: "kind",
        header: "Event",
        cell: ({ row }) => <EventKind event={row.original} />,
    }),
    eventHelper.display({
        id: "detail",
        header: "Detail",
        cell: ({ row }) => <EventDetail event={row.original} />,
    }),
]);
