import { useMemo, useState } from "react";
import { useTable, type ColumnVisibilityState } from "@tanstack/react-table";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { userRoles } from "@workspace/validator";

import { TablePagination } from "@/components/table-pagination";
import { TableStatusRows } from "@/components/table-status-rows";
import { useClampPage } from "@/lib/use-clamp-page";
import { useDebounced } from "@/lib/use-debounced";
import { useScrollToTop } from "@/lib/use-scroll-to-top";
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
    useClampPage(page, metadata?.totalPages, setPage);

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

    const topRef = useScrollToTop<HTMLDivElement>(page);

    return (
        <>
            <title>Users</title>
            <div className="flex flex-col gap-4" ref={topRef}>
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
                            <TableStatusRows
                                query={users}
                                columnCount={columnCount}
                                isEmpty={users.data?.data.length === 0}
                                emptyMessage={
                                    isFiltered ? "Tidak ada user yang cocok dengan filter." : "Belum ada user."
                                }
                            />

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

                <TablePagination metadata={metadata} itemLabel="user" onPageChange={setPage} />

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
