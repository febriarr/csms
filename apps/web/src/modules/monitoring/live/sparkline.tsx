import { useMemo } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { SPARKLINE_MINUTES, type SeriesPoint } from "./recent.api";
import { useNow } from "./time";

const WIDTH = 200;
const HEIGHT = 40;
const PAD = 3;
const WINDOW_MS = SPARKLINE_MINUTES * 60_000;

type Chart = {
    path: string;
    lines: { y: number; className: string }[];
    min: number;
    max: number;
};

function buildChart(
    allPoints: SeriesPoint[],
    warning: number,
    critical: number,
    gapMs: number,
    end: number
): Chart | null {
    const from = end - WINDOW_MS;
    const points = allPoints.filter((point) => point.t >= from);

    const values = points.map((point) => point.v);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // A threshold line only joins the chart when the readings come near it. Otherwise a threshold far away would
    // squash the line into a flat stripe.
    const pad = Math.max(max - min, 2);
    const candidates = [
        { value: warning, className: "stroke-amber-500/60" },
        { value: critical, className: "stroke-destructive/60" },
    ].filter((line) => line.value >= min - pad && line.value <= max + pad);

    const yMin = Math.min(min, ...candidates.map((line) => line.value));
    const yMax = Math.max(max, ...candidates.map((line) => line.value));
    const span = yMax - yMin || 1;

    const x = (t: number) => Math.min(WIDTH, Math.max(0, ((t - (end - WINDOW_MS)) / WINDOW_MS) * WIDTH));
    const y = (value: number) => HEIGHT - PAD - ((value - yMin) / span) * (HEIGHT - PAD * 2);

    // a silence longer than `gapMs` breaks the line: no data is not the same as a steady temperature
    let path = "";
    points.forEach((point, index) => {
        const previous = points[index - 1];
        const command = previous && point.t - previous.t <= gapMs ? "L" : "M";

        path += `${command}${x(point.t).toFixed(1)} ${y(point.v).toFixed(1)}`;
    });

    return {
        path,
        lines: candidates.map((line) => ({ y: y(line.value), className: line.className })),
        min,
        max,
    };
}

type SparklineProps = {
    points: SeriesPoint[];
    warning: number;
    critical: number;
    /** A pause between two readings longer than this is drawn as a break. */
    gapMs: number;
    /** Text color class; the line uses the current color. */
    tone: string;
};

export function Sparkline({ points, warning, critical, gapMs, tone }: SparklineProps) {
    const now = useNow();
    // anchored to the clock (in 10 s steps), so a silent device visibly stops short of the right edge
    const end = Math.floor(now / 10_000) * 10_000;
    const chart = useMemo(
        () => buildChart(points, warning, critical, gapMs, end),
        [points, warning, critical, gapMs, end]
    );
    const hours = SPARKLINE_MINUTES / 60;

    return (
        <div>
            {chart ? (
                <svg
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={`Temperature over the last ${hours} hours, from ${chart.min.toFixed(1)} to ${chart.max.toFixed(1)} degrees`}
                    className={cn("h-10 w-full overflow-visible", tone)}
                >
                    {chart.lines.map((line, index) => (
                        <line
                            key={index}
                            x1={0}
                            x2={WIDTH}
                            y1={line.y}
                            y2={line.y}
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            className={cn("[vector-effect:non-scaling-stroke]", line.className)}
                        />
                    ))}
                    <path
                        d={chart.path}
                        fill="none"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="stroke-current [vector-effect:non-scaling-stroke]"
                    />
                </svg>
            ) : (
                <div className="flex h-10 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                    Collecting data...
                </div>
            )}

            <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>-{hours}h</span>
                {chart && (
                    <span>
                        min {chart.min.toFixed(1)}° · max {chart.max.toFixed(1)}°
                    </span>
                )}
                <span>now</span>
            </div>
        </div>
    );
}
