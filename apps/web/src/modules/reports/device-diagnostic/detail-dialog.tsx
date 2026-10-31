import { useState, type ReactNode } from "react";
import { useTable } from "@tanstack/react-table";

import type { DiagnosticLogItem, DiagnosticSummaryItem } from "@workspace/shared";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

import { TablePagination } from "@/components/table-pagination";
import { TableStatusRows } from "@/components/table-status-rows";
import { formatDate, formatDateTime } from "@/lib/format-date-time";

import { detailColumns, detailTableFeatures, FailCount, ResetReasonBadge, RssiValue } from "./columns";
import { rssiQuality } from "./constants";
import { useDiagnosticDetail, useDiagnosticTrend } from "./hooks";
import { TrendChart } from "./trend-chart";

const PAGE_SIZE = 20;
/** Stable reference so the table doesn't see "new data" on every render while loading. */
const NO_ROWS: DiagnosticLogItem[] = [];

function Tile({ label, children, note }: { label: string; children: ReactNode; note?: ReactNode }) {
    return (
        <div className="rounded-xl border bg-card p-3 text-card-foreground">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl leading-none font-semibold">{children}</div>
            {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
        </div>
    );
}

type BodyProps = { item: DiagnosticSummaryItem; from: string; to: string };

/** Mounted only while a device is open, so the page number starts at 1 every time. */
function DetailBody({ item, from, to }: BodyProps) {
    const [page, setPage] = useState(1);

    const trend = useDiagnosticTrend({ deviceId: item.deviceId, from, to });
    const detail = useDiagnosticDetail({ deviceId: item.deviceId, from, to, page, pageSize: PAGE_SIZE });

    const table = useTable({
        features: detailTableFeatures,
        data: detail.data?.data ?? NO_ROWS,
        columns: detailColumns,
        getRowId: (row) => String(row.id),
    });

    const quality = rssiQuality(item.avgRssi);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <Tile label="Sensor failures">
                    <FailCount value={item.sensorFailTotal} className="text-destructive" />
                </Tile>
                <Tile label="Wi-Fi failures">
                    <FailCount value={item.wifiFailTotal} className="text-amber-600 dark:text-amber-400" />
                </Tile>
                <Tile label="HTTP failures">
                    <FailCount value={item.httpFailTotal} className="text-sky-600 dark:text-sky-400" />
                </Tile>
                <Tile label="Average signal" note={quality.label}>
                    <RssiValue rssi={item.avgRssi} />
                </Tile>
                <Tile
                    label="Last reset"
                    note={item.lastReason ? formatDateTime(item.lastReason.recordedAt) : "No abnormal reset"}
                >
                    {item.lastReason ? (
                        <ResetReasonBadge reason={item.lastReason.resetReason} code={item.lastReason.resetReasonCode} />
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    )}
                </Tile>
            </div>

            <TrendChart trend={trend.data} isPending={trend.isPending} isError={trend.isError} from={from} to={to} />

            <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium">Reports from the device</h3>

                <div className="wrapper-table">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            <TableStatusRows
                                query={detail}
                                columnCount={detailColumns.length}
                                isEmpty={detail.data?.data.length === 0}
                                emptyMessage="Tidak ada laporan diagnostik pada periode ini."
                            />

                            {detail.isSuccess &&
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

                <TablePagination metadata={detail.data?.metadata} itemLabel="laporan" onPageChange={setPage} />
            </div>
        </div>
    );
}

type DiagnosticDetailDialogProps = {
    /** null = closed */
    item: DiagnosticSummaryItem | null;
    /** The period the list was loaded for: the dialog shows the same days. */
    period: { from: string; to: string } | null;
    onOpenChange: (open: boolean) => void;
};

/** Full-screen details of one device: totals, the failures per day, and every row the device reported. */
export function DiagnosticDetailDialog({ item, period, onOpenChange }: DiagnosticDetailDialogProps) {
    return (
        <Dialog open={item !== null && period !== null} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-dvh max-h-none w-screen max-w-none flex-col gap-4 overflow-hidden rounded-none border-0 p-4 sm:max-w-none md:p-6">
                {item && period && (
                    <>
                        <DialogHeader>
                            <DialogTitle>
                                {item.deviceName}{" "}
                                <span className="font-mono text-sm font-normal">({item.deviceCode})</span>
                            </DialogTitle>
                            <DialogDescription>
                                {item.coldStorageName} · {formatDate(period.from)} to {formatDate(period.to)}
                            </DialogDescription>
                        </DialogHeader>

                        <DetailBody key={item.deviceId} item={item} from={period.from} to={period.to} />
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
