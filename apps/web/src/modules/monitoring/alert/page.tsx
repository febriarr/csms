import { useCallback, useEffect, useMemo, useState } from "react";
import { useTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import type { ListAlert } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { ALERT_REASONS, DEVICE_STATES, type AlertReason, type DeviceState } from "@workspace/validator";

import { useColdStorages } from "@/modules/settings/master-data/cold-room/hooks";
import { useDevices } from "@/modules/settings/master-data/device/hooks";

import { alertTableFeatures, getAlertColumns, type AlertAction } from "./columns";
import { ACK_FILTERS, ACK_LABELS, acknowledgedParam, reasonLabel, stateMeta, type AckFilter } from "./constants";
import { DateRangeFilter, toDayString, type DayRange } from "./date-range-filter";
import { getAlertErrorMessage } from "./errors";
import { useAcknowledgeAlert, useAlerts } from "./hooks";
import { AlertViewDialog } from "./view-dialog";
import { useScrollToTop } from "@/lib/use-scroll-to-top";

const ALL = "all";
const PAGE_SIZE = 20;
/** Stable reference so the table doesn't see "new data" on every render while loading. */
const NO_ALERTS: ListAlert[] = [];

export function Component() {
    const [ackFilter, setAckFilter] = useState<AckFilter>("OPEN");
    const [coldStorageFilter, setColdStorageFilter] = useState(ALL);
    const [deviceFilter, setDeviceFilter] = useState(ALL);
    const [stateFilter, setStateFilter] = useState(ALL);
    const [reasonFilter, setReasonFilter] = useState(ALL);
    const [range, setRange] = useState<DayRange | undefined>();
    const [page, setPage] = useState(1);
    const [viewing, setViewing] = useState<ListAlert | null>(null);

    const coldStorageId = coldStorageFilter === ALL ? undefined : coldStorageFilter;
    const deviceId = deviceFilter === ALL ? undefined : deviceFilter;
    const toState = stateFilter === ALL ? undefined : (stateFilter as DeviceState);
    const reasonCode = reasonFilter === ALL ? undefined : (reasonFilter as AlertReason);
    // the API applies the days only when both ends are known
    const from = range?.from && range.to ? toDayString(range.from) : undefined;
    const to = range?.from && range.to ? toDayString(range.to) : undefined;
    const acknowledged = acknowledgedParam(ackFilter);

    const query = useMemo(
        () => ({ page, pageSize: PAGE_SIZE, coldStorageId, deviceId, toState, reasonCode, from, to, acknowledged }),
        [page, coldStorageId, deviceId, toState, reasonCode, from, to, acknowledged]
    );

    const alerts = useAlerts(query);
    const metadata = alerts.data?.metadata;
    const isFiltered = Boolean(coldStorageId || deviceId || toState || reasonCode || from);

    // Filter options narrow down step by step: cold room -> device.
    const coldStorages = useColdStorages();
    const filterDevices = useDevices({ coldStorageId });

    // After acknowledging the last row of the last page, fall back to the new last page.
    const totalPages = metadata?.totalPages;
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (totalPages && page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const {
        mutate: acknowledgeMutate,
        isPending: acknowledging,
        variables: acknowledgingVariables,
    } = useAcknowledgeAlert();
    // the alert being acknowledged right now: its menu item is disabled, so it cannot be sent twice
    const acknowledgingId = acknowledging ? acknowledgingVariables : undefined;

    const handleAcknowledge = useCallback(
        (alert: ListAlert) => {
            acknowledgeMutate(alert.id, {
                onSuccess: () => {
                    setViewing(null);
                    toast.success("Success", { description: `Alert "${alert.deviceName}" berhasil di-acknowledge.` });
                },
                onError: (error) => toast.error("Error", { description: getAlertErrorMessage(error) }),
            });
        },
        [acknowledgeMutate]
    );

    const columns = useMemo(
        () =>
            getAlertColumns(
                (action: AlertAction, alert) => {
                    if (action === "view") setViewing(alert);
                    else handleAcknowledge(alert);
                },
                { acknowledgingId }
            ),
        [handleAcknowledge, acknowledgingId]
    );
    const table = useTable({
        features: alertTableFeatures,
        data: alerts.data?.data ?? NO_ALERTS,
        columns,
        getRowId: (row) => row.id,
    });
    const columnCount = columns.length;

    /** Every filter change starts again from the first page. */
    function filter<T>(set: (value: T) => void) {
        return (value: T) => {
            set(value);
            setPage(1);
        };
    }

    const topRef = useScrollToTop<HTMLDivElement>(page);

    return (
        <>
            <title>Alerts</title>
            <div className="flex flex-col gap-4" ref={topRef}>
                <div>
                    <h1 className="font-heading text-xl font-semibold">Alerts</h1>
                    <p className="text-sm text-muted-foreground">
                        State changes of the devices. Acknowledge an alert once someone has taken care of it.
                    </p>
                </div>

                <Tabs value={ackFilter} onValueChange={filter((value: string) => setAckFilter(value as AckFilter))}>
                    <TabsList>
                        {ACK_FILTERS.map((item) => (
                            <TabsTrigger key={item} value={item}>
                                {ACK_LABELS[item]}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="flex flex-col gap-2 xl:flex-row">
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
                                    {device.name} -<span className="text-muted-foreground">{device.pointLabel}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={stateFilter} onValueChange={filter(setStateFilter)}>
                        <SelectTrigger className="w-full xl:w-40" aria-label="Filter by new state">
                            <SelectValue placeholder="All states" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All states</SelectItem>
                            {DEVICE_STATES.map((item) => (
                                <SelectItem key={item} value={item}>
                                    {stateMeta(item).label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={reasonFilter} onValueChange={filter(setReasonFilter)}>
                        <SelectTrigger className="w-full xl:w-56" aria-label="Filter by reason">
                            <SelectValue placeholder="All reasons" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All reasons</SelectItem>
                            {ALERT_REASONS.map((item) => (
                                <SelectItem key={item} value={item}>
                                    {reasonLabel(item)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <DateRangeFilter value={range} onChange={filter(setRange)} className="w-full xl:w-64" />
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
                            {alerts.isPending &&
                                Array.from({ length: 4 }).map((_, row) => (
                                    <TableRow key={row}>
                                        {Array.from({ length: columnCount }).map((__, cell) => (
                                            <TableCell key={cell}>
                                                <Skeleton className="h-4 w-full min-w-12" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}

                            {alerts.isError && (
                                <TableRow>
                                    <TableCell colSpan={columnCount} className="py-8 text-center">
                                        <p className="mb-3 text-sm text-muted-foreground">{alerts.error.message}</p>
                                        <Button variant="outline" size="sm" onClick={() => void alerts.refetch()}>
                                            Retry
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )}

                            {alerts.isSuccess && alerts.data.data.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={columnCount}
                                        className="py-8 text-center text-sm text-muted-foreground"
                                    >
                                        {isFiltered
                                            ? "Tidak ada alert yang cocok dengan filter."
                                            : ackFilter === "OPEN"
                                              ? "Tidak ada alert yang perlu ditangani."
                                              : "Belum ada alert."}
                                    </TableCell>
                                </TableRow>
                            )}

                            {alerts.isSuccess &&
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

                {metadata && metadata.totalPages > 1 && (
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                            Halaman {metadata.page} dari {metadata.totalPages} · {metadata.totalItems} alert
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

                <AlertViewDialog
                    alert={viewing}
                    onOpenChange={(open) => !open && setViewing(null)}
                    onAcknowledge={handleAcknowledge}
                    acknowledging={acknowledging}
                />
            </div>
        </>
    );
}
