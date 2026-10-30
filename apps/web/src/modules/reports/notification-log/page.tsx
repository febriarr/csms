import { useMemo, useState } from "react";
import { useTable } from "@tanstack/react-table";
import { RefreshCw, Search } from "lucide-react";

import type { ListNotificationLog } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import {
    NOTIFICATION_CHANNELS,
    NOTIFICATION_STATUSES,
    type NotificationChannel,
    type NotificationStatus,
} from "@workspace/validator";

import { DateRangeFilter, toDayString, type DayRange } from "@/components/date-range-filter";
import { TablePagination } from "@/components/table-pagination";
import { TableStatusRows } from "@/components/table-status-rows";
import { getRangeProblem } from "@/lib/report-range";
import { useDebounced } from "@/lib/use-debounced";
import { useScrollToTop } from "@/lib/use-scroll-to-top";
import { useColdStorages } from "@/modules/settings/master-data/cold-room/hooks";
import { useDevices } from "@/modules/settings/master-data/device/hooks";
import { channelLabel } from "@/modules/settings/notification/constants";

import { getLogColumns, logTableFeatures, type LogAction } from "./columns";
import { statusLabel } from "./constants";
import { useNotificationLogs } from "./hooks";
import { LogViewDialog } from "./view-dialog";

const ALL = "all";
const PAGE_SIZE = 20;
/** Stable reference so the table doesn't see "new data" on every render while loading. */
const NO_LOGS: ListNotificationLog[] = [];

export function Component() {
    const [coldStorageFilter, setColdStorageFilter] = useState(ALL);
    const [deviceFilter, setDeviceFilter] = useState(ALL);
    const [channelFilter, setChannelFilter] = useState(ALL);
    const [statusFilter, setStatusFilter] = useState(ALL);
    const [search, setSearch] = useState("");
    const [range, setRange] = useState<DayRange | undefined>();
    const [page, setPage] = useState(1);
    const [viewing, setViewing] = useState<ListNotificationLog | null>(null);

    const debouncedSearch = useDebounced(search.trim());
    const coldStorageId = coldStorageFilter === ALL ? undefined : coldStorageFilter;
    const deviceId = deviceFilter === ALL ? undefined : deviceFilter;
    const channel = channelFilter === ALL ? undefined : (channelFilter as NotificationChannel);
    const status = statusFilter === ALL ? undefined : (statusFilter as NotificationStatus);
    // the API applies the days only when both ends are known
    const from = range?.from && range.to ? toDayString(range.from) : undefined;
    const to = range?.from && range.to ? toDayString(range.to) : undefined;
    const rangeProblem = getRangeProblem(from, to);

    const query = useMemo(
        () => ({
            page,
            pageSize: PAGE_SIZE,
            coldStorageId,
            deviceId,
            channel,
            status,
            search: debouncedSearch || undefined,
            // an invalid period is not sent: the message under the filters says why
            from: rangeProblem ? undefined : from,
            to: rangeProblem ? undefined : to,
        }),
        [page, coldStorageId, deviceId, channel, status, debouncedSearch, from, to, rangeProblem]
    );

    const logs = useNotificationLogs(query);
    const metadata = logs.data?.metadata;
    const isFiltered = Boolean(coldStorageId || deviceId || channel || status || debouncedSearch || from);

    // Filter options narrow down step by step: cold room -> device.
    const coldStorages = useColdStorages();
    const filterDevices = useDevices({ coldStorageId });

    const columns = useMemo(() => getLogColumns((_action: LogAction, log) => setViewing(log)), []);
    const table = useTable({
        features: logTableFeatures,
        data: logs.data?.data ?? NO_LOGS,
        columns,
        getRowId: (row) => row.id,
    });
    const topRef = useScrollToTop<HTMLDivElement>(page);

    /** Every filter change starts again from the first page. */
    function filter<T>(set: (value: T) => void) {
        return (value: T) => {
            set(value);
            setPage(1);
        };
    }

    return (
        <>
            <title>Notification Log</title>
            <div className="flex flex-col gap-4" ref={topRef}>
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h1 className="font-heading text-xl font-semibold">Notification Log</h1>
                        <p className="text-sm text-muted-foreground">
                            Every alert message that was queued for a recipient, and whether it was delivered.
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Refresh"
                        disabled={logs.isFetching}
                        onClick={() => void logs.refetch()}
                    >
                        <RefreshCw className={logs.isFetching ? "animate-spin" : undefined} />
                    </Button>
                </div>

                <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap">
                    <InputGroup className="max-w-sm flex-1">
                        <InputGroupInput
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Search recipient name or number..."
                            aria-label="Search recipients"
                        />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>

                    <Select
                        value={coldStorageFilter}
                        onValueChange={(value) => {
                            setColdStorageFilter(value);
                            setDeviceFilter(ALL); // the old device may not belong to the new cold room
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-full xl:w-48" aria-label="Filter by cold room">
                            <SelectValue placeholder="All cold rooms" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All cold rooms</SelectItem>
                            {coldStorages.data?.map((coldStorage) => (
                                <SelectItem key={coldStorage.id} value={coldStorage.id}>
                                    {coldStorage.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={deviceFilter} onValueChange={filter(setDeviceFilter)}>
                        <SelectTrigger className="w-full xl:w-48" aria-label="Filter by device">
                            <SelectValue placeholder="All devices" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All devices</SelectItem>
                            {filterDevices.data?.map((device) => (
                                <SelectItem key={device.id} value={device.id}>
                                    {device.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={channelFilter} onValueChange={filter(setChannelFilter)}>
                        <SelectTrigger className="w-full xl:w-40" aria-label="Filter by channel">
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

                    <Select value={statusFilter} onValueChange={filter(setStatusFilter)}>
                        <SelectTrigger className="w-full xl:w-40" aria-label="Filter by status">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All statuses</SelectItem>
                            {NOTIFICATION_STATUSES.map((item) => (
                                <SelectItem key={item} value={item}>
                                    {statusLabel(item)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <DateRangeFilter value={range} onChange={filter(setRange)} className="w-full xl:w-64" />
                </div>

                {rangeProblem && <p className="text-sm text-destructive">{rangeProblem}</p>}

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
                                query={logs}
                                columnCount={columns.length}
                                isEmpty={logs.data?.data.length === 0}
                                emptyMessage={
                                    isFiltered
                                        ? "Tidak ada notifikasi yang cocok dengan filter."
                                        : "Belum ada notifikasi yang dikirim."
                                }
                            />

                            {logs.isSuccess &&
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

                <TablePagination metadata={metadata} itemLabel="notifikasi" onPageChange={setPage} />

                <LogViewDialog log={viewing} onOpenChange={(open) => !open && setViewing(null)} />
            </div>
        </>
    );
}
