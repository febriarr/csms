import { useMemo, useState } from "react";
import { useTable } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import type { NotificationRecipientWithSubscriptions } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { NOTIFICATION_CHANNELS, type NotificationChannel } from "@workspace/validator";

import { TableStatusRows } from "@/components/table-status-rows";
import { useDebounced } from "@/lib/use-debounced";
import { useDivisions } from "@/modules/settings/master-data/division/hooks";

import { getRecipientColumns, recipientTableFeatures, type RecipientAction } from "./columns";
import { channelLabel } from "./constants";
import { DeleteRecipientDialog } from "./delete-dialog";
import { RecipientFormDialog } from "./form";
import { useRecipients } from "./hooks";
import { SubscriptionDialog } from "./subscription-dialog";

const ALL = "all";
/** Stable reference so the table doesn't see "new data" on every render while loading. */
const NO_RECIPIENTS: NotificationRecipientWithSubscriptions[] = [];

type DialogState =
    { mode: "create" } | { mode: RecipientAction; recipient: NotificationRecipientWithSubscriptions } | null;

export function Component() {
    const [search, setSearch] = useState("");
    const [channelFilter, setChannelFilter] = useState(ALL);
    const [divisionFilter, setDivisionFilter] = useState(ALL);
    const [statusFilter, setStatusFilter] = useState(ALL);
    const [dialog, setDialog] = useState<DialogState>(null);

    const debouncedSearch = useDebounced(search.trim());
    const channel = channelFilter === ALL ? undefined : (channelFilter as NotificationChannel);
    const divisionId = divisionFilter === ALL ? undefined : divisionFilter;
    const isActive = statusFilter === ALL ? undefined : statusFilter === "active";

    const query = useMemo(
        () => ({ name: debouncedSearch || undefined, channel, divisionId, isActive }),
        [debouncedSearch, channel, divisionId, isActive]
    );

    const recipients = useRecipients(query);
    const divisions = useDivisions();

    const isFiltered = Object.values(query).some((value) => value !== undefined);

    const columns = useMemo(
        () => getRecipientColumns((action, recipient) => setDialog({ mode: action, recipient })),
        []
    );
    const table = useTable({
        features: recipientTableFeatures,
        data: recipients.data ?? NO_RECIPIENTS,
        columns,
        getRowId: (row) => row.id,
    });
    const columnCount = columns.length;

    const closeDialog = () => setDialog(null);

    return (
        <>
            <title>Notification Recipients</title>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="font-heading text-xl font-semibold">Notification Recipients</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage who receives WARNING and CRITICAL alerts, and from which areas.
                        </p>
                    </div>
                    <Button onClick={() => setDialog({ mode: "create" })}>
                        <Plus />
                        Add Recipient
                    </Button>
                </div>

                <div className="flex flex-col gap-2 xl:flex-row">
                    <InputGroup className="max-w-sm flex-1">
                        <InputGroupInput
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search recipients..."
                            aria-label="Search recipients"
                        />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>

                    <Select value={channelFilter} onValueChange={setChannelFilter}>
                        <SelectTrigger className="w-full xl:w-48" aria-label="Filter by channel">
                            <SelectValue placeholder="All channels" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All channels</SelectItem>
                            {NOTIFICATION_CHANNELS.map((item) => (
                                <SelectItem key={item} value={item}>
                                    {channelLabel(item)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                        <SelectTrigger className="w-full xl:w-48" aria-label="Filter by division">
                            <SelectValue placeholder="All divisions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All divisions</SelectItem>
                            {divisions.data?.map((division) => (
                                <SelectItem key={division.id} value={division.id}>
                                    {division.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full xl:w-40" aria-label="Filter by status">
                            <SelectValue placeholder="All status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
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
                                query={recipients}
                                columnCount={columnCount}
                                isEmpty={recipients.data?.length === 0}
                                emptyMessage={
                                    isFiltered
                                        ? "Tidak ada penerima yang cocok dengan filter."
                                        : "Belum ada penerima notifikasi."
                                }
                            />

                            {recipients.isSuccess &&
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {row.getAllCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                <table.FlexRender cell={cell} />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </div>

                <RecipientFormDialog
                    open={dialog?.mode === "create" || dialog?.mode === "edit"}
                    recipient={dialog?.mode === "edit" ? dialog.recipient : null}
                    onOpenChange={(open) => !open && closeDialog()}
                    onSuccess={(result, recipient) => {
                        closeDialog();
                        toast.success("Success", {
                            description:
                                result === "created"
                                    ? `Penerima "${recipient.name}" berhasil ditambahkan.`
                                    : `Penerima "${recipient.name}" berhasil diperbarui.`,
                        });
                    }}
                />

                <SubscriptionDialog
                    recipient={dialog?.mode === "subscriptions" ? dialog.recipient : null}
                    onOpenChange={(open) => !open && closeDialog()}
                    onSaved={(recipient) => {
                        closeDialog();
                        toast.success("Success", {
                            description: `Langganan "${recipient.name}" berhasil disimpan.`,
                        });
                    }}
                />

                <DeleteRecipientDialog
                    recipient={dialog?.mode === "delete" ? dialog.recipient : null}
                    onOpenChange={(open) => !open && closeDialog()}
                    onDeleted={(recipient) => {
                        closeDialog();
                        toast.success("Success", { description: `Penerima "${recipient.name}" berhasil dihapus.` });
                    }}
                />
            </div>
        </>
    );
}
