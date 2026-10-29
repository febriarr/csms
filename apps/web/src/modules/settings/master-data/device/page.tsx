import { useMemo, useState } from "react";
import { useTable, type ColumnVisibilityState } from "@tanstack/react-table";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import type { DeviceView } from "@workspace/shared";
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

import { TableStatusRows } from "@/components/table-status-rows";
import { useDebounced } from "@/lib/use-debounced";
import { useColdStorages } from "@/modules/settings/master-data/cold-room/hooks";
import { useDivisions } from "@/modules/settings/master-data/division/hooks";
import { useLocations } from "@/modules/settings/master-data/location/hooks";

import {
    columnLabels,
    defaultColumnVisibility,
    deviceTableFeatures,
    getDeviceColumns,
    type DeviceAction,
} from "./columns";
import { DeleteDeviceDialog } from "./delete-dialog";
import { DeviceFormDialog } from "./form";
import { useDevices } from "./hooks";
import { ThresholdRuleAlert } from "./threshold-rule-alert";
import { DeviceViewDialog } from "./view-dialog";

const ALL = "all";
/** Stable reference so the table doesn't see "new data" on every render while loading. */
const NO_DEVICES: DeviceView[] = [];

type DialogState = { mode: "create" } | { mode: DeviceAction; device: DeviceView } | null;

export function Component() {
    const [search, setSearch] = useState("");
    const [divisionFilter, setDivisionFilter] = useState(ALL);
    const [locationFilter, setLocationFilter] = useState(ALL);
    const [coldStorageFilter, setColdStorageFilter] = useState(ALL);
    const [dialog, setDialog] = useState<DialogState>(null);
    const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(defaultColumnVisibility);

    const debouncedSearch = useDebounced(search.trim());
    const divisionId = divisionFilter === ALL ? undefined : divisionFilter;
    const locationId = locationFilter === ALL ? undefined : locationFilter;
    const coldStorageId = coldStorageFilter === ALL ? undefined : coldStorageFilter;

    const query = useMemo(
        () => ({ search: debouncedSearch || undefined, divisionId, locationId, coldStorageId }),
        [debouncedSearch, divisionId, locationId, coldStorageId]
    );

    const devices = useDevices(query);
    // Filter options narrow down step by step: division -> location -> cold room.
    const divisions = useDivisions();
    const filterLocations = useLocations({ divisionId });
    const filterColdStorages = useColdStorages({ divisionId, locationId });

    const isFiltered = Object.values(query).some((value) => value !== undefined);

    const columns = useMemo(() => getDeviceColumns((action, device) => setDialog({ mode: action, device })), []);
    // TanStack Table v9: features are registered explicitly, and the core row model is built in.
    const table = useTable({
        features: deviceTableFeatures,
        data: devices.data ?? NO_DEVICES,
        columns,
        state: { columnVisibility },
        onColumnVisibilityChange: setColumnVisibility,
        getRowId: (row) => row.id,
    });
    const columnCount = table.getVisibleLeafColumns().length;

    const closeDialog = () => setDialog(null);

    return (
        <>
            <title>Device</title>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="font-heading text-xl font-semibold">Devices</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage the monitoring devices in each cold room.
                        </p>
                    </div>
                    <Button onClick={() => setDialog({ mode: "create" })}>
                        <Plus />
                        Add Device
                    </Button>
                </div>

                <ThresholdRuleAlert />

                <div className="flex flex-col gap-2 xl:flex-row">
                    <InputGroup className="max-w-sm flex-1">
                        <InputGroupInput
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search devices..."
                            aria-label="Search devices"
                        />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>

                    <Select
                        value={divisionFilter}
                        onValueChange={(value) => {
                            setDivisionFilter(value);
                            setLocationFilter(ALL); // the old selections may not belong to the new division
                            setColdStorageFilter(ALL);
                        }}
                    >
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

                    <Select
                        value={locationFilter}
                        onValueChange={(value) => {
                            setLocationFilter(value);
                            setColdStorageFilter(ALL);
                        }}
                    >
                        <SelectTrigger className="w-full xl:w-48" aria-label="Filter by location">
                            <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All locations</SelectItem>
                            {filterLocations.data?.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                    {location.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={coldStorageFilter} onValueChange={setColdStorageFilter}>
                        <SelectTrigger className="w-full xl:w-48" aria-label="Filter by cold room">
                            <SelectValue placeholder="All cold rooms" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All cold rooms</SelectItem>
                            {filterColdStorages.data?.map((coldStorage) => (
                                <SelectItem key={coldStorage.id} value={coldStorage.id}>
                                    {coldStorage.name}
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
                                query={devices}
                                columnCount={columnCount}
                                isEmpty={devices.data?.length === 0}
                                emptyMessage={
                                    isFiltered ? "Tidak ada device yang cocok dengan filter." : "Belum ada device."
                                }
                            />

                            {devices.isSuccess &&
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

                <DeviceFormDialog
                    open={dialog?.mode === "create" || dialog?.mode === "edit"}
                    device={dialog?.mode === "edit" ? dialog.device : null}
                    defaultColdStorageId={coldStorageId ?? ""}
                    onOpenChange={(open) => !open && closeDialog()}
                    onSuccess={(result, device) => {
                        closeDialog();
                        toast.success("Success", {
                            description:
                                result === "created"
                                    ? `Device "${device.name}" berhasil ditambahkan.`
                                    : `Device "${device.name}" berhasil diperbarui.`,
                        });
                    }}
                />

                <DeviceViewDialog
                    device={dialog?.mode === "view" ? dialog.device : null}
                    onOpenChange={(open) => !open && closeDialog()}
                />

                <DeleteDeviceDialog
                    device={dialog?.mode === "delete" ? dialog.device : null}
                    onOpenChange={(open) => !open && closeDialog()}
                    onDeleted={(device) => {
                        closeDialog();
                        toast.success("Success", { description: `Device "${device.name}" berhasil dihapus.` });
                    }}
                />
            </div>
        </>
    );
}
