import type { ReactNode } from "react";
import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import { Eye, MenuIcon } from "lucide-react";

import type { DiagnosticLogItem, DiagnosticSummaryItem, ResetReport } from "@workspace/shared";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

import { formatDateTime } from "@/lib/format-date-time";

import { formatRssi, RESET_REASON_META, rssiQuality } from "./constants";

/* shared bits */

function Muted({ children }: { children: ReactNode }) {
    return <span className="text-muted-foreground">{children}</span>;
}

/** A failure counter: a quiet zero, or the number in the color of its kind. */
export function FailCount({ value, className }: { value: number | null; className: string }) {
    if (value === null) return <Muted>-</Muted>;
    if (value === 0) return <span className="font-mono text-muted-foreground tabular-nums">0</span>;

    return <span className={cn("font-mono font-medium tabular-nums", className)}>{value}</span>;
}

export function RssiValue({ rssi }: { rssi: number | null }) {
    const quality = rssiQuality(rssi);

    return (
        <span className="whitespace-nowrap" title={quality.label}>
            <span className={cn("font-mono tabular-nums", quality.text)}>{formatRssi(rssi)}</span>
        </span>
    );
}

export function ResetReasonBadge({ reason, code }: { reason: ResetReport["resetReason"]; code: number | null }) {
    const meta = RESET_REASON_META[reason];

    return (
        <Badge variant="outline" className={meta.badge} title={meta.hint}>
            {meta.label}
            {code !== null && <span className="font-mono text-[10px] opacity-70">#{code}</span>}
        </Badge>
    );
}

/* summary: one row per device with failures */

export type DiagnosticAction = "view";

/** No optional table features are needed (the list is short and sorted by the backend). */
export const summaryTableFeatures = tableFeatures({});

const summaryHelper = createColumnHelper<typeof summaryTableFeatures, DiagnosticSummaryItem>();

export function getSummaryColumns(onAction: (action: DiagnosticAction, item: DiagnosticSummaryItem) => void) {
    return summaryHelper.columns([
        summaryHelper.display({
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${row.original.deviceName}`}>
                            <MenuIcon />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onSelect={() => onAction("view", row.original)}>
                            <Eye />
                            View details
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        }),
        summaryHelper.accessor("deviceName", {
            header: "Device",
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.deviceName}</div>
                    <div className="font-mono text-xs text-muted-foreground">{row.original.deviceCode}</div>
                </div>
            ),
        }),
        summaryHelper.accessor("coldStorageName", {
            header: "Cold Room",
            cell: (info) => <Muted>{info.getValue()}</Muted>,
        }),
        summaryHelper.accessor("sensorFailTotal", {
            header: "Sensor",
            cell: (info) => <FailCount value={info.getValue()} className="text-destructive" />,
        }),
        summaryHelper.accessor("wifiFailTotal", {
            header: "Wi-Fi",
            cell: (info) => (
                <FailCount value={info.getValue()} className="text-amber-600 dark:text-amber-400" />
            ),
        }),
        summaryHelper.accessor("httpFailTotal", {
            header: "HTTP",
            cell: (info) => <FailCount value={info.getValue()} className="text-sky-600 dark:text-sky-400" />,
        }),
        summaryHelper.accessor("total", {
            header: "Total",
            cell: (info) => <span className="font-mono font-semibold tabular-nums">{info.getValue()}</span>,
        }),
        summaryHelper.accessor("avgRssi", {
            header: "Avg RSSI",
            cell: (info) => <RssiValue rssi={info.getValue()} />,
        }),
        summaryHelper.accessor("lastReason", {
            header: "Last Reset",
            cell: ({ row }) => {
                const reason = row.original.lastReason;

                if (!reason) return <Muted>-</Muted>;

                return (
                    <div className="flex flex-col items-start gap-0.5">
                        <ResetReasonBadge reason={reason.resetReason} code={reason.resetReasonCode} />
                        <span className="text-xs text-muted-foreground">{formatDateTime(reason.recordedAt)}</span>
                    </div>
                );
            },
        }),
    ]);
}

/* detail: the individual rows of one device */

export const detailTableFeatures = tableFeatures({});

const detailHelper = createColumnHelper<typeof detailTableFeatures, DiagnosticLogItem>();

export const detailColumns = detailHelper.columns([
    detailHelper.accessor("recordedAt", {
        header: "Time",
        cell: (info) => <span className="whitespace-nowrap">{formatDateTime(info.getValue())}</span>,
    }),
    detailHelper.accessor("sensorFailCount", {
        header: "Sensor",
        cell: (info) => <FailCount value={info.getValue()} className="text-destructive" />,
    }),
    detailHelper.accessor("wifiFailCount", {
        header: "Wi-Fi",
        cell: (info) => <FailCount value={info.getValue()} className="text-amber-600 dark:text-amber-400" />,
    }),
    detailHelper.accessor("httpFailCount", {
        header: "HTTP",
        cell: (info) => <FailCount value={info.getValue()} className="text-sky-600 dark:text-sky-400" />,
    }),
    detailHelper.accessor("rssi", {
        header: "RSSI",
        cell: (info) => <RssiValue rssi={info.getValue()} />,
    }),
    detailHelper.accessor("resetReason", {
        header: "Reset Reason",
        cell: ({ row }) =>
            row.original.resetReason ? (
                <ResetReasonBadge reason={row.original.resetReason} code={row.original.resetReasonCode} />
            ) : (
                <Muted>-</Muted>
            ),
    }),
    detailHelper.display({
        id: "beforeReset",
        header: "Before Reset",
        cell: ({ row }) => {
            const item = row.original;

            // these four are only filled together with a reset reason: what the device counted before it restarted
            if (!item.resetReason) return <Muted>-</Muted>;

            return (
                <div className="flex items-center gap-3 whitespace-nowrap text-xs">
                    <span className="flex items-center gap-1">
                        <Muted>S</Muted>
                        <FailCount value={item.lastSensorFailCount} className="text-destructive" />
                    </span>
                    <span className="flex items-center gap-1">
                        <Muted>W</Muted>
                        <FailCount value={item.lastWifiFailCount} className="text-amber-600 dark:text-amber-400" />
                    </span>
                    <span className="flex items-center gap-1">
                        <Muted>H</Muted>
                        <FailCount value={item.lastHttpFailCount} className="text-sky-600 dark:text-sky-400" />
                    </span>
                    <RssiValue rssi={item.lastRssi} />
                </div>
            );
        },
    }),
]);
