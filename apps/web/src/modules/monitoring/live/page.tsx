import { useMemo, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { useColdStorages } from "@/modules/settings/master-data/cold-room/hooks";
import { useDivisions } from "@/modules/settings/master-data/division/hooks";
import { useLocations } from "@/modules/settings/master-data/location/hooks";

import { getDisplayState, STATE_ORDER, type DisplayState } from "./constants";
import { DeviceCard } from "./device-card";
import { useLiveDevices } from "./hooks";
import type { SeriesPoint } from "./recent.api";
import { SummaryBar, type StateFilter } from "./summary-bar";
import { formatDate } from "@/lib/format-date-time";

const ALL = "all";
/** Stable reference so a card does not re-render only because it has no series yet. */
const NO_POINTS: SeriesPoint[] = [];

const rank = (state: DisplayState) => STATE_ORDER.indexOf(state);

export function Component() {
    const [divisionFilter, setDivisionFilter] = useState(ALL);
    const [locationFilter, setLocationFilter] = useState(ALL);
    const [coldStorageFilter, setColdStorageFilter] = useState(ALL);
    const [stateFilter, setStateFilter] = useState<StateFilter>("ALL");

    const divisionId = divisionFilter === ALL ? undefined : divisionFilter;
    const locationId = locationFilter === ALL ? undefined : locationFilter;
    const coldStorageId = coldStorageFilter === ALL ? undefined : coldStorageFilter;

    const query = useMemo(() => ({ divisionId, locationId, coldStorageId }), [divisionId, locationId, coldStorageId]);

    const { devices, series, isPending, isError, error, refetch, streamStatus } = useLiveDevices(query);

    // Filter options narrow down step by step: division -> location -> cold room.
    const divisions = useDivisions();
    const filterLocations = useLocations({ divisionId });
    const filterColdStorages = useColdStorages({ divisionId, locationId });

    const isFiltered = Boolean(divisionId || locationId || coldStorageId);

    // The counts ignore the state filter, so the chips keep showing the whole picture of the selected place.
    const counts = useMemo(() => {
        const result = Object.fromEntries(STATE_ORDER.map((state) => [state, 0])) as Record<DisplayState, number>;
        for (const device of devices) result[getDisplayState(device)] += 1;

        return result;
    }, [devices]);

    // most urgent first, then by name, so a problem is always at the top of the grid
    const visible = useMemo(
        () =>
            devices
                .map((device) => ({ device, state: getDisplayState(device) }))
                .filter((item) => stateFilter === "ALL" || item.state === stateFilter)
                .sort((a, b) => rank(a.state) - rank(b.state) || a.device.name.localeCompare(b.device.name))
                .map((item) => item.device),
        [devices, stateFilter]
    );

    return (
        <>
            <title>Live Monitoring</title>
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="font-heading text-xl font-semibold">Live Monitoring {formatDate(new Date())}</h1>
                    <p className="text-sm text-muted-foreground">
                        Real-time temperature and state of every device. The most urgent ones come first.
                    </p>
                </div>

                <div className="flex flex-col gap-2 xl:flex-row">
                    <Select
                        value={divisionFilter}
                        onValueChange={(value) => {
                            setDivisionFilter(value);
                            setLocationFilter(ALL); // the old selections may not belong to the new division
                            setColdStorageFilter(ALL);
                        }}
                    >
                        <SelectTrigger className="w-full xl:w-56" aria-label="Filter by division">
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
                        <SelectTrigger className="w-full xl:w-56" aria-label="Filter by location">
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
                        <SelectTrigger className="w-full xl:w-56" aria-label="Filter by cold room">
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

                    {isFiltered && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setDivisionFilter(ALL);
                                setLocationFilter(ALL);
                                setColdStorageFilter(ALL);
                            }}
                        >
                            Reset
                        </Button>
                    )}
                </div>

                <SummaryBar
                    counts={counts}
                    total={devices.length}
                    value={stateFilter}
                    onChange={setStateFilter}
                    stream={streamStatus}
                />

                {isPending && (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <Skeleton key={index} className="h-80 rounded-xl" />
                        ))}
                    </div>
                )}

                {isError && (
                    <div className="rounded-xl border py-10 text-center">
                        <p className="mb-3 text-sm text-muted-foreground">{error?.message}</p>
                        <Button variant="outline" size="sm" onClick={() => void refetch()}>
                            Retry
                        </Button>
                    </div>
                )}

                {!isPending && !isError && visible.length === 0 && (
                    <p className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
                        {isFiltered || stateFilter !== "ALL"
                            ? "Tidak ada device yang cocok dengan filter."
                            : "Belum ada device."}
                    </p>
                )}

                {!isPending && visible.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {visible.map((device) => (
                            <DeviceCard key={device.id} device={device} points={series[device.id] ?? NO_POINTS} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
