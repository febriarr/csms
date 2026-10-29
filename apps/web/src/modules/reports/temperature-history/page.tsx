import { useMemo, useState } from "react";
import { useTable } from "@tanstack/react-table";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import type { ReportEvent, TemperatureReportRow } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

import { DateRangeFilter, toDayString, type DayRange } from "@/components/date-range-filter";
import { TablePagination } from "@/components/table-pagination";
import { TableStatusRows } from "@/components/table-status-rows";
import { useScrollToTop } from "@/lib/use-scroll-to-top";
import { useColdStorages } from "@/modules/settings/master-data/cold-room/hooks";
import { useDevices } from "@/modules/settings/master-data/device/hooks";

import { eventColumns, eventTableFeatures, readingColumns, readingTableFeatures } from "./columns";
import { exportFilename, getRangeProblem } from "./constants";
import { getReportErrorMessage } from "./errors";
import { useExportReport, useRefreshReport, useReport, useReportEvents, useReportSummary } from "./hooks";
import { ReportSummary } from "./report-summary";
import type { ExportFormat, ReportParams } from "./temperature-history.api";

const ALL = "all";
const PAGE_SIZE = 50;
/** Stable references so the tables don't see "new data" on every render while loading. */
const NO_READINGS: TemperatureReportRow[] = [];
const NO_EVENTS: ReportEvent[] = [];

type Tab = "readings" | "events";

const EXPORT_FORMATS: { format: ExportFormat; label: string }[] = [
    { format: "xlsx", label: "Excel (.xlsx)" },
    { format: "csv", label: "CSV (.csv)" },
];

export function Component() {
    const [coldStorageFilter, setColdStorageFilter] = useState(ALL);
    const [deviceId, setDeviceId] = useState("");
    const [range, setRange] = useState<DayRange | undefined>();
    const [tab, setTab] = useState<Tab>("readings");
    const [page, setPage] = useState(1);

    const coldStorageId = coldStorageFilter === ALL ? undefined : coldStorageFilter;
    // the API applies the days only when both ends are known
    const from = range?.from && range.to ? toDayString(range.from) : undefined;
    const to = range?.from && range.to ? toDayString(range.to) : undefined;
    const rangeProblem = getRangeProblem(from, to);

    // Filter options narrow down step by step: cold room -> device. The device is required.
    const coldStorages = useColdStorages();
    const filterDevices = useDevices({ coldStorageId });
    const selectedDevice = filterDevices.data?.find((device) => device.id === deviceId);

    // Nothing is requested until the device and a valid period are chosen.
    const params = useMemo<ReportParams | undefined>(
        () => (deviceId && from && to && !rangeProblem ? { deviceId, from, to } : undefined),
        [deviceId, from, to, rangeProblem]
    );
    const pageParams = useMemo(() => (params ? { ...params, page, pageSize: PAGE_SIZE } : undefined), [params, page]);

    const report = useReport(pageParams);
    const events = useReportEvents(params);
    const summary = useReportSummary(params);
    const refresh = useRefreshReport();

    const { mutate: exportMutate, isPending: exporting } = useExportReport();
    const topRef = useScrollToTop<HTMLDivElement>(page);

    const readingsTable = useTable({
        features: readingTableFeatures,
        data: report.data?.data ?? NO_READINGS,
        columns: readingColumns,
        getRowId: (row) => String(row.recordedAt),
    });
    const eventsTable = useTable({
        features: eventTableFeatures,
        data: events.data ?? NO_EVENTS,
        columns: eventColumns,
        getRowId: (row, index) => `${row.type}-${String(row.at)}-${index}`,
    });

    function handleExport(format: ExportFormat) {
        if (!params) return;

        exportMutate(
            { ...params, format, filename: exportFilename(selectedDevice?.code ?? "device", params.from, params.to, format) },
            {
                onSuccess: () =>
                    toast.success("Success", { description: `Laporan ${format.toUpperCase()} berhasil diunduh.` }),
                onError: (error) => toast.error("Error", { description: getReportErrorMessage(error) }),
            }
        );
    }

    /** A new device or period starts again from the first page. */
    function filter<T>(set: (value: T) => void) {
        return (value: T) => {
            set(value);
            setPage(1);
        };
    }

    return (
        <>
            <title>Temperature History</title>
            <div className="flex flex-col gap-4" ref={topRef}>
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h1 className="font-heading text-xl font-semibold">Temperature History</h1>
                        <p className="text-sm text-muted-foreground">
                            Every reading of a device in a period, with its state and why an alert was or was not raised.
                        </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label="Refresh"
                            disabled={!params}
                            onClick={() => void refresh()}
                        >
                            <RefreshCw />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button disabled={!params || exporting}>
                                    {exporting ? <Loader2 className="animate-spin" /> : <Download />}
                                    {exporting ? "Exporting..." : "Export"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {EXPORT_FORMATS.map((item) => (
                                    <DropdownMenuItem key={item.format} onSelect={() => handleExport(item.format)}>
                                        {item.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex flex-col gap-2 xl:flex-row">
                    <Select
                        value={coldStorageFilter}
                        onValueChange={(value) => {
                            setColdStorageFilter(value);
                            setDeviceId(""); // the old device may not belong to the new cold room
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-full xl:w-56" aria-label="Filter by cold room">
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

                    <Select value={deviceId} onValueChange={filter(setDeviceId)}>
                        <SelectTrigger className="w-full xl:w-72" aria-label="Device">
                            <SelectValue placeholder="Select a device" />
                        </SelectTrigger>
                        <SelectContent>
                            {filterDevices.data?.map((device) => (
                                <SelectItem key={device.id} value={device.id}>
                                    {device.name} ({device.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <DateRangeFilter
                        value={range}
                        onChange={filter(setRange)}
                        placeholder="Select a period"
                        className="w-full xl:w-64"
                    />
                </div>

                {rangeProblem && <p className="text-sm text-destructive">{rangeProblem}</p>}

                {!params ? (
                    <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                        Pilih device dan rentang tanggal untuk melihat riwayat suhu.
                    </p>
                ) : (
                    <>
                        <ReportSummary summary={summary.data} isPending={summary.isPending} />

                        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
                            <TabsList>
                                <TabsTrigger value="readings">
                                    Readings
                                    {report.data && (
                                        <span className="ml-1.5 text-xs text-muted-foreground">
                                            {report.data.metadata.totalItems}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="events">
                                    Events
                                    {events.data && (
                                        <span className="ml-1.5 text-xs text-muted-foreground">{events.data.length}</span>
                                    )}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {tab === "readings" ? (
                            <>
                                <div className="wrapper-table">
                                    <Table>
                                        <TableHeader>
                                            {readingsTable.getHeaderGroups().map((headerGroup) => (
                                                <TableRow key={headerGroup.id}>
                                                    {headerGroup.headers.map((header) => (
                                                        <TableHead key={header.id}>
                                                            {header.isPlaceholder ? null : (
                                                                <readingsTable.FlexRender header={header} />
                                                            )}
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableHeader>
                                        <TableBody>
                                            <TableStatusRows
                                                query={report}
                                                columnCount={readingColumns.length}
                                                isEmpty={report.data?.data.length === 0}
                                                emptyMessage="Tidak ada bacaan suhu pada periode ini."
                                            />

                                            {report.isSuccess &&
                                                readingsTable.getRowModel().rows.map((row) => (
                                                    <TableRow key={row.id}>
                                                        {row.getAllCells().map((cell) => (
                                                            <TableCell key={cell.id}>
                                                                <readingsTable.FlexRender cell={cell} />
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <TablePagination
                                    metadata={report.data?.metadata}
                                    itemLabel="bacaan"
                                    onPageChange={setPage}
                                />
                            </>
                        ) : (
                            <div className="wrapper-table">
                                <Table>
                                    <TableHeader>
                                        {eventsTable.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead key={header.id}>
                                                        {header.isPlaceholder ? null : (
                                                            <eventsTable.FlexRender header={header} />
                                                        )}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableHeader>
                                    <TableBody>
                                        <TableStatusRows
                                            query={events}
                                            columnCount={eventColumns.length}
                                            isEmpty={events.data?.length === 0}
                                            emptyMessage="Tidak ada alert atau pause pada periode ini."
                                        />

                                        {events.isSuccess &&
                                            eventsTable.getRowModel().rows.map((row) => (
                                                <TableRow key={row.id}>
                                                    {row.getAllCells().map((cell) => (
                                                        <TableCell key={cell.id}>
                                                            <eventsTable.FlexRender cell={cell} />
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
