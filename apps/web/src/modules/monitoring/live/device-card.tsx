import { memo } from "react";
import { ArrowDownRight, ArrowUpRight, Clock, Minus, Pause } from "lucide-react";

import type { DeviceView } from "@workspace/shared";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import { formatTemperature, humanizeEnum } from "@/lib/format";

import { STATE_META } from "@/lib/device-state";

import { getDisplayState } from "./constants";

import type { SeriesPoint } from "./recent.api";
import { Sparkline } from "./sparkline";
import { ThresholdBar } from "./threshold-bar";
import { Elapsed, TimeAgo } from "./time";

const TREND_WINDOW_MS = 15 * 60_000;
/** Below this change (in degrees) the temperature counts as steady. */
const STEADY_BELOW = 0.1;

/** Change over the last 15 minutes, or null when the series does not cover enough of that window. */
function trendOf(points: SeriesPoint[]): number | null {
    const last = points.at(-1);
    if (!last) return null;

    const first = points.find((point) => point.t >= last.t - TREND_WINDOW_MS);
    if (!first || first === last || last.t - first.t < TREND_WINDOW_MS * 0.6) return null;

    return last.v - first.v;
}

function TrendChip({ delta }: { delta: number }) {
    const steady = Math.abs(delta) < STEADY_BELOW;
    const Icon = steady ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

    return (
        <span
            className="flex items-center gap-1 font-mono text-xs text-muted-foreground"
            title="Change over the last 15 minutes"
        >
            <Icon className="size-3.5" />
            {steady ? "steady" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}°`}
            <span className="text-[10px]">15m</span>
        </span>
    );
}

type DeviceCardProps = {
    device: DeviceView;
    points: SeriesPoint[];
};

export const DeviceCard = memo(function DeviceCard({ device, points }: DeviceCardProps) {
    const state = getDisplayState(device);
    const meta = STATE_META[state];
    const dim = state === "OFFLINE" || state === "INACTIVE";
    const reading = device.lastTemperature;
    const heartbeatMs = device.heartbeatIntervalSeconds * 1000;
    const trend = dim ? null : trendOf(points);
    const { monitoring } = device;
    const isPaused = monitoring.status === "PAUSED";

    return (
        <article
            aria-label={`${device.name}: ${meta.label}`}
            className={cn(
                "relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-card py-4 pr-4 pl-5 text-card-foreground",
                isPaused ? "border-orange-500/50" : meta.card
            )}
        >
            {/* the state as a color, readable from across the room */}
            <span
                aria-hidden
                className={cn("absolute inset-y-0 left-0 w-1", isPaused ? "bg-orange-500" : meta.strip)}
            />

            <header className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="truncate font-medium">{device.name}</h3>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                        {device.code}
                        {device.pointLabel ? ` · ${device.pointLabel}` : ""}
                    </p>
                </div>

                {!isPaused && (
                    <Badge variant="outline" className={cn("shrink-0 gap-1.5", meta.badge)}>
                        <span
                            aria-hidden
                            className={cn(
                                "size-1.5 rounded-full",
                                meta.dot,
                                state === "CRITICAL" && "motion-safe:animate-pulse"
                            )}
                        />
                        {meta.label}
                    </Badge>
                )}
            </header>

            <p
                className="-mt-2 truncate text-xs text-muted-foreground"
                title={`${device.divisionName} / ${device.locationName} / ${device.coldStorageName}`}
            >
                {device.coldStorageName} · {device.locationName}
            </p>

            {monitoring.status !== "ACTIVE" && (
                <Badge
                    variant="outline"
                    className="w-fit gap-1.5 border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                    title="Alerts are held for this device"
                >
                    <Pause className="size-3" />
                    {monitoring.status === "PULLING_DOWN" ? "Pulling down" : "Paused"}
                    {monitoring.pause && ` · ${humanizeEnum(monitoring.pause.kind)}`}
                </Badge>
            )}

            {isPaused ? (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                        <Pause className="size-5 text-muted-foreground" />
                    </div>

                    <p className="mt-3 font-medium">Monitoring Paused</p>

                    <p className="mt-1 text-xs text-muted-foreground">Temperature monitoring is temporarily paused.</p>

                    {monitoring.pause && (
                        <div className="mt-3 flex items-center gap-2">
                            <Badge variant="outline">{humanizeEnum(monitoring.pause.kind)}</Badge>
                            <span className="text-xs text-muted-foreground">
                                for <Elapsed date={monitoring.pause.startsAt} className="font-mono" />
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="flex items-end justify-between gap-2">
                        <div>
                            <div
                                className={cn(
                                    "font-mono text-3xl leading-none font-semibold tabular-nums",
                                    dim
                                        ? "text-muted-foreground"
                                        : state === "CRITICAL" || state === "WARNING"
                                          ? meta.text
                                          : "text-foreground"
                                )}
                            >
                                {reading == null ? "—" : formatTemperature(reading)}
                            </div>
                            {dim && reading != null && (
                                <p className="mt-1 text-xs text-muted-foreground">Last known reading</p>
                            )}
                        </div>

                        {trend !== null && <TrendChip delta={trend} />}
                    </div>

                    <ThresholdBar
                        value={reading}
                        defrost={device.defrostThreshold}
                        warning={device.warningThreshold}
                        critical={device.criticalThreshold}
                        dim={dim}
                    />

                    <Sparkline
                        points={points}
                        warning={device.warningThreshold}
                        critical={device.criticalThreshold}
                        gapMs={Math.max(heartbeatMs * 3, 60_000)}
                        tone={dim ? "text-muted-foreground" : meta.text}
                    />

                    <footer className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Clock className="size-3" />
                            <TimeAgo date={device.lastSeenAt} staleAfterMs={dim ? undefined : heartbeatMs * 2} />
                        </span>

                        {state !== "INACTIVE" && (
                            <span>
                                {meta.label} for <Elapsed date={device.stateChangedAt} className="font-mono" />
                            </span>
                        )}
                    </footer>
                </>
            )}
        </article>
    );
});
