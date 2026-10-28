import type { ReactNode } from "react";
import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import { ArrowRight, CheckCheck, Eye, MenuIcon } from "lucide-react";

import type { ListAlert } from "@workspace/shared";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { formatTemperature } from "@/lib/format";
import { formatDateTime } from "@/lib/format-date-time";

import { reasonLabel } from "./constants";
import { StateBadge } from "./state-badge";

export type AlertAction = "view" | "acknowledge";

/** No optional table features are needed here (no column visibility, sorting, or client-side pagination). */
export const alertTableFeatures = tableFeatures({});

const OPEN_STYLE = "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";

const columnHelper = createColumnHelper<typeof alertTableFeatures, ListAlert>();

function Muted({ children }: { children: ReactNode }) {
    return <span className="text-muted-foreground">{children}</span>;
}

type ColumnOptions = {
    /** The alert that is being acknowledged right now: its menu item is disabled so it cannot be sent twice. */
    acknowledgingId?: string;
};

export function getAlertColumns(onAction: (action: AlertAction, alert: ListAlert) => void, options: ColumnOptions = {}) {
    return columnHelper.columns([
        columnHelper.display({
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => {
                const alert = row.original;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for alert of ${alert.deviceName}`}>
                                <MenuIcon />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onSelect={() => onAction("view", alert)}>
                                <Eye />
                                View
                            </DropdownMenuItem>
                            {alert.acknowledgedAt === null && (
                                <DropdownMenuItem
                                    disabled={options.acknowledgingId === alert.id}
                                    onSelect={() => onAction("acknowledge", alert)}
                                >
                                    <CheckCheck />
                                    Acknowledge
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        }),
        columnHelper.accessor("occurredAt", {
            header: "Occurred",
            cell: (info) => <span className="whitespace-nowrap">{formatDateTime(info.getValue())}</span>,
        }),
        columnHelper.accessor("deviceName", {
            header: "Device",
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.deviceName}</div>
                    <div className="font-mono text-xs text-muted-foreground">{row.original.deviceCode}</div>
                </div>
            ),
        }),
        columnHelper.accessor("coldStorageName", {
            header: "Cold Room",
            cell: (info) => <Muted>{info.getValue()}</Muted>,
        }),
        columnHelper.display({
            id: "transition",
            header: "State",
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5">
                    <StateBadge state={row.original.fromState} />
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    <StateBadge state={row.original.toState} />
                </div>
            ),
        }),
        columnHelper.accessor("temperature", {
            header: "Temperature",
            cell: (info) =>
                info.getValue() == null ? (
                    <Muted>-</Muted>
                ) : (
                    <span className="font-mono tabular-nums">{formatTemperature(info.getValue())}</span>
                ),
        }),
        columnHelper.accessor("reason", {
            header: "Reason",
            cell: ({ row }) => {
                const text = row.original.reason ?? reasonLabel(row.original.reasonCode);

                return (
                    <span className="block max-w-xs truncate text-muted-foreground" title={text}>
                        {text}
                    </span>
                );
            },
        }),
        columnHelper.accessor("acknowledgedAt", {
            header: "Status",
            cell: ({ row }) => {
                const alert = row.original;

                if (alert.acknowledgedAt === null) {
                    return (
                        <Badge variant="outline" className={OPEN_STYLE}>
                            Open
                        </Badge>
                    );
                }

                return (
                    <div className="flex flex-col items-start gap-0.5">
                        <Badge variant="success">Acknowledged</Badge>
                        <span className="text-xs text-muted-foreground">
                            {alert.acknowledgedByName ?? "-"} · {formatDateTime(alert.acknowledgedAt)}
                        </span>
                    </div>
                );
            },
        }),
    ]);
}
