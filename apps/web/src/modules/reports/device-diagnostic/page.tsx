import { useMemo, useState } from "react";
import { useTable } from "@tanstack/react-table";
import { RefreshCw, Search } from "lucide-react";

import type { DiagnosticSummaryItem } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

import { DateRangeFilter, toDayString, type DayRange } from "@/components/date-range-filter";
import { TableStatusRows } from "@/components/table-status-rows";
import { formatDate } from "@/lib/format-date-time";
import { getRangeProblem } from "@/lib/report-range";
import { useDebounced } from "@/lib/use-debounced";

import { getSummaryColumns, summaryTableFeatures } from "./columns";
import { DiagnosticDetailDialog } from "./detail-dialog";
import { useDiagnosticSummary } from "./hooks";

const ALL = "all";
/** Stable reference so the table doesn't see "new data" on every render while loading. */
const NO_ITEMS: DiagnosticSummaryItem[] = [];

export function Component() {
    const [range, setRange] = useState<DayRange | undefined>();
    const [coldStorageFilter, setColdStorageFilter] = useState(ALL);
    const [search, setSearch] = useState("");
    const [viewing, setViewing] = useState<DiagnosticSummaryItem | null>(null);

    const debouncedSearch = useDebounced(search.trim().toLowerCase());

    // Without a complete range the API reports the last 7 days. The period it used comes back in the response.
    const from = range?.from && range.to ? toDayString(range.from) : undefined;
    const to = range?.from && range.to ? toDayString(range.to) : undefined;
    const rangeProblem = getRangeProblem(from, to);

    const params = useMemo(() => (rangeProblem ? undefined : { from, to }), [rangeProblem, from, to]);
    const summary = useDiagnosticSummary(params);
    const report = summary.data;

    // The cold rooms to choose from are the ones that have a device with failures in this period.
    const coldStorages = useMemo(
        () => [...new Set((report?.items ?? []).map((item) => item.coldStorageName))].sort((a, b) => a.localeCompare(b)),
        [report]
    );
    // a cold room that disappeared from the list (another period) must not keep filtering everything out
    const activeColdStorage = coldStorages.includes(coldStorageFilter) ? coldStorageFilter : ALL;

    const items = useMemo(
        () =>
            (report?.items ?? []).filter(
                (item) =>
                    (activeColdStorage === ALL || item.coldStorageName === activeColdStorage) &&
                    (!debouncedSearch ||
                        item.deviceName.toLowerCase().includes(debouncedSearch) ||
                        item.deviceCode.toLowerCase().includes(debouncedSearch))
            ),
        [report, activeColdStorage, debouncedSearch]
    );
    const isFiltered = activeColdStorage !== ALL || debouncedSearch !== "";

    const columns = useMemo(() => getSummaryColumns((_action, item) => setViewing(item)), []);
    const table = useTable({
        features: summaryTableFeatures,
        data: report ? items : NO_ITEMS,
        columns,
        getRowId: (row) => row.deviceId,
    });

    return (
        <>
            <title>Device Diagnostic</title>
            <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h1 className="font-heading text-xl font-semibold">Device Diagnostic</h1>
                        <p className="text-sm text-muted-foreground">
                            Devices that reported sensor, Wi-Fi or HTTP failures. The worst come first.
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Refresh"
                        disabled={summary.isFetching}
                        onClick={() => void summary.refetch()}
                    >
                        <RefreshCw className={summary.isFetching ? "animate-spin" : undefined} />
                    </Button>
                </div>

                <div className="flex flex-col gap-2 xl:flex-row">
                    <DateRangeFilter
                        value={range}
                        onChange={setRange}
                        placeholder="Last 7 days"
                        className="w-full xl:w-64"
                    />

                    <Select value={activeColdStorage} onValueChange={setColdStorageFilter}>
                        <SelectTrigger className="w-full xl:w-56" aria-label="Filter by cold room">
                            <SelectValue placeholder="All cold rooms" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All cold rooms</SelectItem>
                            {coldStorages.map((name) => (
                                <SelectItem key={name} value={name}>
                                    {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <InputGroup className="max-w-sm flex-1">
                        <InputGroupInput
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search device name or code..."
                            aria-label="Search devices"
                        />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>
                </div>

                {rangeProblem ? (
                    <p className="text-sm text-destructive">{rangeProblem}</p>
                ) : (
                    <>
                        {report && (
                            <p className="text-sm text-muted-foreground">
                                {formatDate(report.from)} to {formatDate(report.to)} · {items.length} device
                                {isFiltered ? " cocok dengan filter" : " bermasalah"}
                            </p>
                        )}

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
                                        query={summary}
                                        columnCount={columns.length}
                                        isEmpty={items.length === 0}
                                        emptyMessage={
                                            isFiltered
                                                ? "Tidak ada device yang cocok dengan filter."
                                                : "Tidak ada device dengan kegagalan pada periode ini."
                                        }
                                    />

                                    {summary.isSuccess &&
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
                    </>
                )}

                <DiagnosticDetailDialog
                    item={viewing}
                    period={report ? { from: report.from, to: report.to } : null}
                    onOpenChange={(open) => !open && setViewing(null)}
                />
            </div>
        </>
    );
}
