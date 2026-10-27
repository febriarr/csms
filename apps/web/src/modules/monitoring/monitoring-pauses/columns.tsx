import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import { MenuIcon, Square, Trash2 } from "lucide-react";

import type { MonitoringPauseView } from "@workspace/shared";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { formatDateTime } from "@/lib/format-date-time";

import { KIND_LABELS, pauseTargetName } from "./constants";

export type PauseAction = "end" | "delete";

/** No optional table features are needed here (no column visibility, sorting, or pagination yet). */
export const pauseTableFeatures = tableFeatures({});

const columnHelper = createColumnHelper<typeof pauseTableFeatures, MonitoringPauseView>();

function Muted({ children }: { children: React.ReactNode }) {
    return <span className="text-muted-foreground">{children}</span>;
}

export function getPauseColumns(onAction: (action: PauseAction, pause: MonitoringPauseView) => void) {
    return columnHelper.columns([
        columnHelper.display({
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => {
                const pause = row.original;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Actions for pause of ${pauseTargetName(pause)}`}
                            >
                                <MenuIcon />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {/* only a running pause can be ended; a scheduled one is cancelled, an ended one is history */}
                            {pause.timeline === "ACTIVE" && (
                                <>
                                    <DropdownMenuItem onSelect={() => onAction("end", pause)}>
                                        <Square />
                                        End pause
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem variant="destructive" onSelect={() => onAction("delete", pause)}>
                                <Trash2 />
                                {pause.timeline === "SCHEDULED" ? "Cancel schedule" : "Delete"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        }),
        columnHelper.display({
            id: "target",
            header: "Target",
            cell: ({ row }) => {
                const pause = row.original;

                return (
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{pauseTargetName(pause)}</span>
                        <Badge variant="outline">{pause.deviceId ? "Device" : "Cold room"}</Badge>
                    </div>
                );
            },
        }),
        columnHelper.accessor("kind", {
            header: "Kind",
            cell: (info) => <Badge variant="secondary">{KIND_LABELS[info.getValue()]}</Badge>,
        }),
        columnHelper.accessor("startsAt", {
            header: "Starts",
            cell: (info) => formatDateTime(info.getValue()),
        }),
        columnHelper.accessor("endsAt", {
            header: "Ends",
            cell: (info) =>
                info.getValue() ? (
                    formatDateTime(info.getValue())
                ) : (
                    <Badge variant="outline">Until further notice</Badge>
                ),
        }),
        columnHelper.accessor("maxPulldownMinutes", {
            header: "Pull-down",
            cell: (info) => <Muted>{info.getValue() > 0 ? `${info.getValue()} min` : "-"}</Muted>,
        }),
        columnHelper.accessor("note", {
            header: "Note",
            cell: (info) => (
                <span className="block max-w-xs truncate text-muted-foreground" title={info.getValue() ?? undefined}>
                    {info.getValue() ?? "-"}
                </span>
            ),
        }),
    ]);
}
