import { useMemo, useState } from "react";
import { useTable } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import type { MonitoringPauseView, PauseTimeline } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { PAUSE_KINDS, type PauseKind } from "@workspace/validator";

import { useDebounced } from "@/lib/use-debounced";

import { getPauseColumns, pauseTableFeatures, type PauseAction } from "./columns";
import { KIND_LABELS, pauseTargetName, TIMELINE_LABELS, TIMELINES } from "./constants";
import { DeletePauseDialog } from "./delete-dialog";
import { EndPauseDialog } from "./end-dialog";
import { PauseFormDialog } from "./form";
import { usePauses } from "./hooks";
import { PauseRuleAlert } from "./pause-rule-alert";

const ALL = "all";
/** Stable reference so the table doesn't see "new data" on every render while loading. */
const NO_PAUSES: MonitoringPauseView[] = [];

const EMPTY_MESSAGES: Record<PauseTimeline, string> = {
    ACTIVE: "Tidak ada pause yang sedang berjalan.",
    SCHEDULED: "Tidak ada pause terjadwal.",
    ENDED: "Belum ada riwayat pause.",
};

type DialogState = { mode: "create" } | { mode: PauseAction; pause: MonitoringPauseView } | null;

const time = (value: Date | string | null) => (value ? new Date(value).getTime() : 0);

/** Running and ended pauses: newest first. Scheduled ones: the soonest first. */
function compare(tab: PauseTimeline) {
    return (a: MonitoringPauseView, b: MonitoringPauseView) => {
        switch (tab) {
            case "SCHEDULED":
                return time(a.startsAt) - time(b.startsAt);
            case "ENDED":
                return time(b.endsAt) - time(a.endsAt);
            case "ACTIVE":
                return time(b.startsAt) - time(a.startsAt);
        }
    };
}

export function Component() {
    const [tab, setTab] = useState<PauseTimeline>("ACTIVE");
    const [search, setSearch] = useState("");
    const [kindFilter, setKindFilter] = useState(ALL);
    const [dialog, setDialog] = useState<DialogState>(null);

    const debouncedSearch = useDebounced(search.trim().toLowerCase());
    const kind = kindFilter === ALL ? undefined : (kindFilter as PauseKind);

    const pauses = usePauses();

    // The list is small and has no server-side status filter, so the tabs, search and kind filter work on it directly.
    const counts = useMemo(() => {
        const result: Record<PauseTimeline, number> = { ACTIVE: 0, SCHEDULED: 0, ENDED: 0 };
        for (const pause of pauses.data ?? NO_PAUSES) result[pause.timeline] += 1;

        return result;
    }, [pauses.data]);

    const rows = useMemo(
        () =>
            (pauses.data ?? NO_PAUSES)
                .filter((pause) => pause.timeline === tab)
                .filter((pause) => !kind || pause.kind === kind)
                .filter(
                    (pause) =>
                        !debouncedSearch ||
                        `${pauseTargetName(pause)} ${pause.note ?? ""}`.toLowerCase().includes(debouncedSearch)
                )
                .sort(compare(tab)),
        [pauses.data, tab, kind, debouncedSearch]
    );

    const isFiltered = Boolean(kind || debouncedSearch);

    const columns = useMemo(() => getPauseColumns((action, pause) => setDialog({ mode: action, pause })), []);
    const table = useTable({
        features: pauseTableFeatures,
        data: rows,
        columns,
        getRowId: (row) => row.id,
    });
    const columnCount = columns.length;

    const closeDialog = () => setDialog(null);

    return (
        <>
            <title>Monitoring Pause</title>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="font-heading text-xl font-semibold">Monitoring Pause</h1>
                        <p className="text-sm text-muted-foreground">
                            Hold alerts for machines that are switched off on purpose or cold rooms under maintenance.
                        </p>
                    </div>
                    <Button onClick={() => setDialog({ mode: "create" })}>
                        <Plus />
                        Add Pause
                    </Button>
                </div>

                <PauseRuleAlert />

                <Tabs value={tab} onValueChange={(value) => setTab(value as PauseTimeline)}>
                    <TabsList>
                        {TIMELINES.map((timeline) => (
                            <TabsTrigger key={timeline} value={timeline}>
                                {TIMELINE_LABELS[timeline]}
                                {pauses.isSuccess && (
                                    <span className="ml-1.5 text-xs text-muted-foreground">{counts[timeline]}</span>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="flex flex-col gap-2 xl:flex-row">
                    <InputGroup className="max-w-sm flex-1">
                        <InputGroupInput
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search target or note..."
                            aria-label="Search pauses"
                        />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>

                    <Select value={kindFilter} onValueChange={setKindFilter}>
                        <SelectTrigger className="w-full xl:w-48" aria-label="Filter by kind">
                            <SelectValue placeholder="All kinds" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All kinds</SelectItem>
                            {PAUSE_KINDS.map((item) => (
                                <SelectItem key={item} value={item}>
                                    {KIND_LABELS[item]}
                                </SelectItem>
                            ))}
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
                            {pauses.isPending &&
                                Array.from({ length: 4 }).map((_, row) => (
                                    <TableRow key={row}>
                                        {Array.from({ length: columnCount }).map((__, cell) => (
                                            <TableCell key={cell}>
                                                <Skeleton className="h-4 w-full min-w-12" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}

                            {pauses.isError && (
                                <TableRow>
                                    <TableCell colSpan={columnCount} className="py-8 text-center">
                                        <p className="mb-3 text-sm text-muted-foreground">{pauses.error.message}</p>
                                        <Button variant="outline" size="sm" onClick={() => void pauses.refetch()}>
                                            Retry
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )}

                            {pauses.isSuccess && rows.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={columnCount}
                                        className="py-8 text-center text-sm text-muted-foreground"
                                    >
                                        {isFiltered ? "Tidak ada pause yang cocok dengan filter." : EMPTY_MESSAGES[tab]}
                                    </TableCell>
                                </TableRow>
                            )}

                            {pauses.isSuccess &&
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

                <PauseFormDialog
                    open={dialog?.mode === "create"}
                    onOpenChange={(open) => !open && closeDialog()}
                    onSuccess={(pause, timeline) => {
                        closeDialog();
                        setTab(timeline); // show the new pause where it belongs
                        toast.success("Success", {
                            description: `Pause untuk "${pauseTargetName(pause)}" berhasil dibuat.`,
                        });
                    }}
                />

                <EndPauseDialog
                    pause={dialog?.mode === "end" ? dialog.pause : null}
                    onOpenChange={(open) => !open && closeDialog()}
                    onEnded={(pause) => {
                        closeDialog();
                        toast.success("Success", {
                            description: `Pause untuk "${pauseTargetName(pause)}" berhasil diakhiri.`,
                        });
                    }}
                />

                <DeletePauseDialog
                    pause={dialog?.mode === "delete" ? dialog.pause : null}
                    onOpenChange={(open) => !open && closeDialog()}
                    onDeleted={(pause) => {
                        closeDialog();
                        toast.success("Success", {
                            description: `Pause untuk "${pauseTargetName(pause)}" berhasil dihapus.`,
                        });
                    }}
                />
            </div>
        </>
    );
}
