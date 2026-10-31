import { Link } from "react-router";

import type { OverviewProblemColdStorage } from "@workspace/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

import { DeviceStateBadge } from "@/components/device-state-badge";
import { formatTemperature } from "@/lib/format";
import { Elapsed } from "@/modules/monitoring/live/time";

/** "2.4° above the critical limit" for a hot device; an offline device has no reading to compare. */
function marginOf({ worstState, worstDevice }: OverviewProblemColdStorage): string | null {
    const { temperature, criticalThreshold, warningThreshold } = worstDevice;

    if (worstState === "OFFLINE" || temperature === null) return null;

    const limit = worstState === "CRITICAL" ? criticalThreshold : warningThreshold;
    const over = temperature - limit;

    return `${Math.abs(over).toFixed(1)}° ${over >= 0 ? "above" : "below"} the ${worstState.toLowerCase()} limit`;
}

export function ProblemColdStorages({ rooms }: { rooms: OverviewProblemColdStorage[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Cold rooms with a problem</CardTitle>
                <CardDescription>Worst first. A room is as bad as its worst device.</CardDescription>
            </CardHeader>

            <CardContent>
                {rooms.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Every cold room is fine.</p>
                ) : (
                    <ul className="divide-y">
                        {rooms.map((room) => {
                            const margin = marginOf(room);

                            return (
                                <li key={room.id} className="py-3 first:pt-0">
                                    <Link
                                        to="/dashboard/monitoring/live"
                                        className="flex items-center justify-between gap-3 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    >
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <DeviceStateBadge state={room.worstState} />
                                                <span className="truncate text-sm font-medium">{room.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {room.locationName}
                                                </span>
                                            </div>

                                            <p className="truncate text-xs text-muted-foreground">
                                                {room.worstDevice.name}
                                                {margin && ` · ${margin}`}
                                                {" · for "}
                                                <Elapsed date={room.worstDevice.stateChangedAt} />
                                            </p>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <div className="font-mono text-sm">
                                                {formatTemperature(room.worstDevice.temperature)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {room.problemDeviceCount}/{room.deviceCount} devices
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
