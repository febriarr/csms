import type { ReactNode } from "react";
import {
    columnVisibilityFeature,
    createColumnHelper,
    tableFeatures,
    type ColumnVisibilityState,
} from "@tanstack/react-table";
import { Eye, MenuIcon, Pencil, Trash2 } from "lucide-react";

import type { DeviceView } from "@workspace/shared";
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
import { formatTemperature, humanizeEnum } from "@/lib/format";

export type DeviceAction = "view" | "edit" | "delete";

/**
 * TanStack Table v9: only the features that are registered exist on the table and in the column types
 * (e.g. `enableHiding` needs columnVisibilityFeature). The core row model is built in.
 */
export const deviceTableFeatures = tableFeatures({ columnVisibilityFeature });

/** Column id -> label. Used for the headers and for the "Columns" menu (ids are the keys). */
const LABELS = {
    code: "Code",
    name: "Name",
    coldStorageName: "Cold Room",
    locationName: "Location",
    divisionName: "Division",
    pointLabel: "Point",
    defrostThreshold: "Defrost Threshold",
    warningThreshold: "Warning Threshold",
    criticalThreshold: "Critical Threshold",
    heartbeatIntervalSeconds: "Heartbeat",
    firmwareVersion: "Firmware",
    state: "State",
    lastTemperature: "Last Temperature",
    lastSeenAt: "Last Seen",
    lastRecordedAt: "Last Recorded",
    stateChangedAt: "State Changed",
    monitoringStatus: "Monitoring",
    isActive: "Active",
    createdAt: "Created",
    updatedAt: "Updated",
} as const;

export const columnLabels: Record<string, string> = LABELS;

/**
 * Only what a master-data page needs is visible at first (identity, place, thresholds, state). Everything else is
 * one click away in the "Columns" menu. `false` = hidden; columns not listed are visible.
 */
export const defaultColumnVisibility: ColumnVisibilityState = {
    defrostThreshold: false,
    lastSeenAt: false,
    lastTemperature: false,
    lastRecordedAt: false,
    stateChangedAt: false,
    monitoringStatus: false,
    state: false,
    createdAt: false,
    updatedAt: false,
};

const STATE_STYLES: Record<string, string> = {
    NORMAL: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    WARNING: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    CRITICAL: "border-destructive/40 bg-destructive/10 text-destructive",
    DEFROST: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    OFFLINE: "text-muted-foreground",
};

function StateBadge({ state }: { state: string }) {
    return (
        <Badge variant="outline" className={STATE_STYLES[state.toUpperCase()]}>
            {humanizeEnum(state)}
        </Badge>
    );
}

/**
 * Two levels of emphasis in the table:
 * - foreground (default): what is scanned while monitoring (name, cold room, thresholds, live temperature, badges)
 * - muted: context and metadata (code, location, division, point, firmware, heartbeat, timestamps, empty "-")
 */
function Muted({ children }: { children: ReactNode }) {
    return <span className="text-muted-foreground">{children}</span>;
}

/** Nullable text: the value in muted color, or a muted dash when empty. */
const mutedOrDash = (value: string | null | undefined) => <Muted>{value ?? "-"}</Muted>;

// the first generic is the registered features, the second is the row type.
const columnHelper = createColumnHelper<typeof deviceTableFeatures, DeviceView>();

export function getDeviceColumns(onAction: (action: DeviceAction, device: DeviceView) => void) {
    return columnHelper.columns([
        columnHelper.display({
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            enableHiding: false,
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${row.original.name}`}>
                            <MenuIcon />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onSelect={() => onAction("view", row.original)}>
                            <Eye />
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onAction("edit", row.original)}>
                            <Pencil />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => onAction("delete", row.original)}>
                            <Trash2 />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        }),
        columnHelper.accessor("code", {
            header: LABELS.code,
            enableHiding: false,
            cell: (info) => <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>,
        }),
        columnHelper.accessor("name", {
            header: LABELS.name,
            cell: (info) => <span className="font-medium">{info.getValue()}</span>,
        }),
        // foreground: the cold room is the main "where" of a device
        columnHelper.accessor("coldStorageName", { header: LABELS.coldStorageName }),
        columnHelper.accessor("locationName", {
            header: LABELS.locationName,
            cell: (info) => <Muted>{info.getValue()}</Muted>,
        }),
        columnHelper.accessor("divisionName", {
            header: LABELS.divisionName,
            cell: (info) => <Muted>{info.getValue()}</Muted>,
        }),
        columnHelper.accessor("pointLabel", {
            header: LABELS.pointLabel,
            cell: (info) => mutedOrDash(info.getValue()),
        }),
        columnHelper.accessor("defrostThreshold", {
            header: LABELS.defrostThreshold,
            cell: (info) => <Muted>{formatTemperature(info.getValue())}</Muted>,
        }),
        // foreground: warning & critical thresholds drive the alerts
        columnHelper.accessor("warningThreshold", {
            header: LABELS.warningThreshold,
            cell: (info) => formatTemperature(info.getValue()),
        }),
        columnHelper.accessor("criticalThreshold", {
            header: LABELS.criticalThreshold,
            cell: (info) => formatTemperature(info.getValue()),
        }),
        columnHelper.accessor("heartbeatIntervalSeconds", {
            header: LABELS.heartbeatIntervalSeconds,
            cell: (info) => <Muted>{info.getValue()} s</Muted>,
        }),
        columnHelper.accessor("firmwareVersion", {
            header: LABELS.firmwareVersion,
            cell: (info) => mutedOrDash(info.getValue()),
        }),
        columnHelper.accessor("state", {
            header: LABELS.state,
            cell: (info) => <StateBadge state={info.getValue()} />,
        }),
        // foreground when there is a reading (live data), muted dash when empty
        columnHelper.accessor("lastTemperature", {
            header: LABELS.lastTemperature,
            cell: (info) => (info.getValue() == null ? <Muted>-</Muted> : formatTemperature(info.getValue())),
        }),
        columnHelper.accessor("lastSeenAt", {
            header: LABELS.lastSeenAt,
            cell: (info) => <Muted>{formatDateTime(info.getValue())}</Muted>,
        }),
        columnHelper.accessor("lastRecordedAt", {
            header: LABELS.lastRecordedAt,
            cell: (info) => <Muted>{formatDateTime(info.getValue())}</Muted>,
        }),
        columnHelper.accessor("stateChangedAt", {
            header: LABELS.stateChangedAt,
            cell: (info) => <Muted>{formatDateTime(info.getValue())}</Muted>,
        }),
        columnHelper.accessor((row) => row.monitoring.status, {
            id: "monitoringStatus",
            header: LABELS.monitoringStatus,
            cell: (info) => (
                <Badge
                    variant="outline"
                    className={info.getValue() === "ACTIVE" ? STATE_STYLES.NORMAL : STATE_STYLES.WARNING}
                >
                    {humanizeEnum(info.getValue())}
                </Badge>
            ),
        }),
        columnHelper.accessor("isActive", {
            header: LABELS.isActive,
            cell: (info) => (
                <Badge variant={info.getValue() ? "success" : "destructive"}>
                    {info.getValue() ? "Active" : "Inactive"}
                </Badge>
            ),
        }),
        columnHelper.accessor("createdAt", {
            header: LABELS.createdAt,
            cell: (info) => <Muted>{formatDateTime(info.getValue())}</Muted>,
        }),
        columnHelper.accessor("updatedAt", {
            header: LABELS.updatedAt,
            cell: (info) => <Muted>{formatDateTime(info.getValue())}</Muted>,
        }),
    ]);
}
