import { tableFeatures, columnVisibilityFeature, createColumnHelper } from "@tanstack/react-table";
import type { UserListItem } from "./user.type";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Button } from "@workspace/ui/components/button";
import { Eye, MenuIcon, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { roleLabels } from "./constants";
import { formatDateTime } from "@/lib/format-date-time";

export type UserAction = "view" | "edit" | "delete";

/**
 * Tanstack Table v9: only the registered features exist on the table. The core row model is built in.
 */
export const userTableFeatures = tableFeatures({ columnVisibilityFeature });

const LABELS = {
    name: "Name",
    username: "Username",
    role: "Role",
    banned: "Status",
    createdAt: "Created",
} as const;

export const columnLabels: Record<string, string> = LABELS;

function Muted({ children }: { children: React.ReactNode }) {
    return <span className="text-muted-foreground">{children}</span>;
}

const columnHelper = createColumnHelper<typeof userTableFeatures, UserListItem>();

type ColumnsOptions = {
    /** Only a super admin sees edit and delete */
    canManage: boolean;
    /**
     * Your own row never gets Edit or Delete: role changes and deletion of yourself are blocked by the backend too.
     */
    currentUserId: string | undefined;
};

export function getUserColumns(
    onAction: (action: UserAction, user: UserListItem) => void,
    { canManage, currentUserId }: ColumnsOptions
) {
    return columnHelper.columns([
        columnHelper.display({
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            enableHiding: false,
            cell: ({ row }) => {
                const user = row.original;
                const canModify = canManage && user.id !== currentUserId;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name}`}>
                                <MenuIcon />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onSelect={() => onAction("view", user)}>
                                <Eye />
                                View
                            </DropdownMenuItem>
                            {canModify && (
                                <>
                                    <DropdownMenuItem onSelect={() => onAction("edit", user)}>
                                        <Pencil />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem variant="destructive" onSelect={() => onAction("delete", user)}>
                                        <Trash2 />
                                        Delete
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        }),
        columnHelper.accessor("name", {
            header: LABELS.name,
            enableHiding: false,
            cell: (info) => (
                <span className="font-medium">
                    {info.getValue()}
                    {info.row.original.id === currentUserId && <Muted>(You)</Muted>}
                </span>
            ),
        }),
        columnHelper.accessor("username", {
            header: LABELS.username,
            cell: (info) => <Muted>@{info.row.original.displayUsername || info.getValue()}</Muted>,
        }),
        columnHelper.accessor("role", {
            header: LABELS.role,
            cell: (info) => <Badge variant="outline">{roleLabels[info.getValue()] ?? info.getValue()}</Badge>,
        }),
        columnHelper.accessor("banned", {
            header: LABELS.banned,
            cell: (info) => (
                <Badge variant={info.getValue() ? "destructive" : "success"}>
                    {info.getValue() ? "Banned" : "Active"}
                </Badge>
            ),
        }),
        columnHelper.accessor("createdAt", {
            header: LABELS.createdAt,
            cell: (info) => <Muted>{formatDateTime(info.getValue())}</Muted>,
        }),
    ]);
}
