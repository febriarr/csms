import type { ReactNode } from "react";
import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import { Eye, MenuIcon } from "lucide-react";

import type { ListNotificationLog } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { DeviceStateBadge } from "@/components/device-state-badge";
import { formatDateTime } from "@/lib/format-date-time";
import { channelLabel } from "@/modules/settings/notification/constants";

import { StatusBadge } from "./status-badge";

export type LogAction = "view";

/** No optional table features are needed (the backend paginates and filters). */
export const logTableFeatures = tableFeatures({});

const columnHelper = createColumnHelper<typeof logTableFeatures, ListNotificationLog>();

function Muted({ children }: { children: ReactNode }) {
    return <span className="text-muted-foreground">{children}</span>;
}

export function getLogColumns(onAction: (action: LogAction, log: ListNotificationLog) => void) {
    return columnHelper.columns([
        columnHelper.display({
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for the message to ${row.original.recipient ?? "recipient"}`}>
                            <MenuIcon />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onSelect={() => onAction("view", row.original)}>
                            <Eye />
                            View
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        }),
        columnHelper.accessor("createdAt", {
            header: "Queued",
            cell: (info) => <span className="whitespace-nowrap">{formatDateTime(info.getValue())}</span>,
        }),
        columnHelper.accessor("deviceName", {
            header: "Device",
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.deviceName}</div>
                    <div className="text-xs text-muted-foreground">
                        <span className="font-mono">{row.original.deviceCode}</span> · {row.original.coldStorageName}
                    </div>
                </div>
            ),
        }),
        columnHelper.accessor("alertState", {
            header: "Alert",
            cell: (info) => <DeviceStateBadge state={info.getValue()} />,
        }),
        columnHelper.accessor("recipient", {
            header: "Recipient",
            cell: ({ row }) => (
                <div>
                    {/* the name is the current one, the target is what was used at send time */}
                    <div className="font-medium">
                        {row.original.recipientName ?? <Muted>Deleted recipient</Muted>}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{row.original.recipient ?? "-"}</div>
                </div>
            ),
        }),
        columnHelper.accessor("channel", {
            header: "Channel",
            cell: (info) => <Muted>{channelLabel(info.getValue())}</Muted>,
        }),
        columnHelper.accessor("status", {
            header: "Status",
            cell: (info) => <StatusBadge status={info.getValue()} />,
        }),
        columnHelper.accessor("attemptCount", {
            header: "Attempts",
            cell: (info) => <span className="font-mono tabular-nums">{info.getValue()}</span>,
        }),
        columnHelper.accessor("sentAt", {
            header: "Sent",
            cell: (info) =>
                info.getValue() ? (
                    <span className="whitespace-nowrap">{formatDateTime(info.getValue())}</span>
                ) : (
                    <Muted>-</Muted>
                ),
        }),
        columnHelper.accessor("errorMessage", {
            header: "Error",
            cell: (info) => {
                const error = info.getValue();

                return error ? (
                    <span className="block max-w-xs truncate text-destructive" title={error}>
                        {error}
                    </span>
                ) : (
                    <Muted>-</Muted>
                );
            },
        }),
    ]);
}
