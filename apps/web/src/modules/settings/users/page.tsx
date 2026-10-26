import { useEffect, useMemo, useState } from "react";
import { useTable, type ColumnVisibilityState } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import type { UserRole } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { userRoles } from "@workspace/validator";

import { useDebounced } from "@/lib/use-debounced";
import { useAuth } from "@/modules/auth/auth.context";

import { columnLabels, getUserColumns, userTableFeatures, type UserAction } from "./columns";
import { roleLabels } from "./constants";
import { DeleteUserDialog } from "./delete-dialog";
import { UserFormDialog } from "./form";
import { useUsers } from "./hooks";
import type { UserListItem } from "./user.type";
import { UserViewDialog } from "./view-dialog";

const ALL = "all";
const PAGE_SIZE = 10;
/** Stable reference so the table doesn't see "new data" on every render while loading. */
const NO_USERS: UserListItem[] = [];

type DialogState = { mode: "create" } | { mode: UserAction; user: UserListItem } | null;

export function Component() {
    const { user: currentUser } = useAuth();
    // Edit, Delete and Add are only offered to a super admin. The backend enforces the same with @Roles.
    const canManage = currentUser?.role === "super_admin";

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState(ALL);
    const [page, setPage] = useState(1);
    const [dialog, setDialog] = useState<DialogState>(null);
    const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

    const debouncedSearch = useDebounced(search.trim());
    const role = roleFilter === ALL ? undefined : (roleFilter as UserRole);

    const query = useMemo(
        () => ({ page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined, role }),
        [page, debouncedSearch, role]
    );

    const users = useUsers(query);
    const metadata = users.data?.metadata;
    const isFiltered = query.search !== undefined || query.role !== undefined;

    // After deleting the last row of the last page, fall back to the new last page.
    const totalPages = metadata?.totalPages;
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (totalPages && page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const currentUserId = currentUser?.id;
    const columns = useMemo(
        () => getUserColumns((action, user) => setDialog({ mode: action, user }), { canManage, currentUserId }),
        [canManage, currentUserId]
    );
    // TanStack Table v9: features are registered explicitly, and the core row model is built in.
    // Pagination is done by the backend, so the table only renders the rows of the current page.
    const table = useTable({
        features: userTableFeatures,
        data: users.data?.data ?? NO_USERS,
        columns,
        state: { columnVisibility },
        onColumnVisibilityChange: setColumnVisibility,
        getRowId: (row) => row.id,
    });
    const columnCount = table.getVisibleLeafColumns().length;

    const closeDialog = () => setDialog(null);

    return (
        <>
            <title>Users</title>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="font-heading text-xl font-semibold">Users</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage the accounts that can sign in to the dashboard.
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={() => setDialog({ mode: "create" })}>
                            <Plus />
                            Add User
                        </Button>
                    )}
                </div>

                <div className="flex flex-col gap-2 xl:flex-row">
                    <InputGroup className="max-w-sm flex-1">
                        <InputGroupInput
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Search by name..."
                            aria-label="Search users by name"
                        />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>

                    <Select
                        value={roleFilter}
                        onValueChange={(value) => {
                            setRoleFilter(value);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-full xl:w-48" aria-label="Filter by role">
                            <SelectValue placeholder="All roles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All roles</SelectItem>
                            {userRoles.map((value) => (
                                <SelectItem key={value} value={value}>
                                    {roleLabels[value]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <SlidersHorizontal />
                                Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
                            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        // keep the menu open so several columns can be toggled in a row
                                        onSelect={(event) => event.preventDefault()}
                                    >
                                        {columnLabels[column.id] ?? column.id}
                                    </DropdownMenuCheckboxItem>
                                ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="wrapper-table">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead
                                            key={header.id}
                                            className={header.column.id === "actions" ? "w-12" : undefined}
                                        >
                                            {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {users.isPending &&
                                Array.from({ length: 4 }).map((_, row) => (
                                    <TableRow key={row}>
                                        {Array.from({ length: columnCount }).map((__, cell) => (
                                            <TableCell key={cell}>
                                                <Skeleton className="h-4 w-full min-w-12" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}

                            {users.isError && (
                                <TableRow>
                                    <TableCell colSpan={columnCount} className="py-8 text-center">
                                        <p className="mb-3 text-sm text-muted-foreground">{users.error.message}</p>
                                        <Button variant="outline" size="sm" onClick={() => void users.refetch()}>
                                            Retry
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )}

                            {users.isSuccess && users.data.data.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={columnCount}
                                        className="py-8 text-center text-sm text-muted-foreground"
                                    >
                                        {isFiltered ? "Tidak ada user yang cocok dengan filter." : "Belum ada user."}
                                    </TableCell>
                                </TableRow>
                            )}

                            {users.isSuccess &&
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                <table.FlexRender cell={cell} />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </div>

                {metadata && metadata.totalPages > 1 && (
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                            Halaman {metadata.page} dari {metadata.totalPages} · {metadata.totalItems} user
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={metadata.page <= 1}
                                onClick={() => setPage((current) => Math.max(1, current - 1))}
                            >
                                <ChevronLeft />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={metadata.page >= metadata.totalPages}
                                onClick={() => setPage((current) => current + 1)}
                            >
                                Next
                                <ChevronRight />
                            </Button>
                        </div>
                    </div>
                )}

                <UserViewDialog
                    user={dialog?.mode === "view" ? dialog.user : null}
                    onOpenChange={(open) => !open && closeDialog()}
                />

                {/* The management dialogs are not even mounted for an admin. */}
                {canManage && (
                    <>
                        <UserFormDialog
                            open={dialog?.mode === "create" || dialog?.mode === "edit"}
                            user={dialog?.mode === "edit" ? dialog.user : null}
                            onOpenChange={(open) => !open && closeDialog()}
                            onSuccess={(result, name) => {
                                closeDialog();
                                toast.success("Success", {
                                    description:
                                        result === "created"
                                            ? `User "${name}" berhasil ditambahkan.`
                                            : `User "${name}" berhasil diperbarui.`,
                                });
                            }}
                        />

                        <DeleteUserDialog
                            user={dialog?.mode === "delete" ? dialog.user : null}
                            onOpenChange={(open) => !open && closeDialog()}
                            onDeleted={(user) => {
                                closeDialog();
                                toast.success("Success", { description: `User "${user.name}" berhasil dihapus.` });
                            }}
                        />
                    </>
                )}
            </div>
        </>
    );
}
