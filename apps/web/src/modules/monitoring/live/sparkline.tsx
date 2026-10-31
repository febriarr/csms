import { useMemo } from "react";
import { Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@workspace/ui/components/chart";
import { cn } from "@workspace/ui/lib/utils";

import { SPARKLINE_MINUTES, type SeriesPoint } from "./recent.api";
import { useNow } from "./time";

const WINDOW_MS = SPARKLINE_MINUTES * 60_000;

type SparklineProps = {
    points: SeriesPoint[];
    warning: number;
    critical: number;

    /**
     * A pause between two readings longer than this
     * is drawn as a break.
     */
    gapMs: number;

    /**
     * Text/line color class.
     *
     * Example:
     * text-foreground
     * text-success
     * text-warning
     * text-destructive
     */
    tone: string;

    /** Shorter chart and a lighter label row, for the compact card. */
    compact?: boolean;
};

type ChartPoint = {
    t: number;
    value: number | null;
};

type ChartData = {
    data: ChartPoint[];
    min: number;
    max: number;
    yMin: number;
    yMax: number;
    warningVisible: boolean;
    criticalVisible: boolean;
};

const chartConfig = {
    value: {
        label: "Temperature",
    },
} satisfies ChartConfig;

function buildChart(
    allPoints: SeriesPoint[],
    warning: number,
    critical: number,
    gapMs: number,
    end: number
): ChartData | null {
    const from = end - WINDOW_MS;

    const points = allPoints.filter((point) => point.t >= from && point.t <= end).sort((a, b) => a.t - b.t);

    if (points.length === 0) {
        return null;
    }

    const values = points.map((point) => point.v);

    const min = Math.min(...values);
    const max = Math.max(...values);

    /**
     * Only show threshold lines when they are reasonably
     * close to the actual temperature range.
     *
     * Otherwise a distant threshold would make the graph
     * appear almost flat.
     */
    const pad = Math.max(max - min, 2);

    const warningVisible = warning >= min - pad && warning <= max + pad;

    const criticalVisible = critical >= min - pad && critical <= max + pad;

    const visibleThresholds = [...(warningVisible ? [warning] : []), ...(criticalVisible ? [critical] : [])];

    const yMin = Math.min(min, ...visibleThresholds);
    const yMax = Math.max(max, ...visibleThresholds);

    /**
     * Recharts breaks the line when value === null
     * and connectNulls === false.
     *
     * This prevents a missing telemetry period from being
     * interpreted as a stable temperature.
     */
    const data: ChartPoint[] = [];

    for (let index = 0; index < points.length; index++) {
        const point = points[index];
        const previous = points[index - 1];

        if (previous && point.t - previous.t > gapMs) {
            data.push({
                t: point.t,
                value: null,
            });
        }

        data.push({
            t: point.t,
            value: point.v,
        });
    }

    return {
        data,
        min,
        max,
        yMin,
        yMax,
        warningVisible,
        criticalVisible,
    };
}

export function Sparkline({ points, warning, critical, gapMs, tone, compact }: SparklineProps) {
    const now = useNow();

    /**
     * Update the right edge every 10 seconds.
     *
     * This means the chart remains anchored to the real clock.
     * If telemetry stops arriving, the line stops before "now".
     */
    const end = Math.floor(now / 10_000) * 10_000;

    const chart = useMemo(
        () => buildChart(points, warning, critical, gapMs, end),
        [points, warning, critical, gapMs, end]
    );

    const hours = SPARKLINE_MINUTES / 60;

    if (!chart) {
        return (
            <div>
                <div
                    className={cn(
                        "flex items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground",
                        compact ? "h-8" : "h-10"
                    )}
                >
                    {compact ? "Collecting…" : "Collecting data..."}
                </div>

                <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>-{hours}h</span>
                    <span>now</span>
                </div>
            </div>
        );
    }

    return (
        <div>
            <ChartContainer
                config={chartConfig}
                className={cn("w-full overflow-visible", compact ? "h-8" : "h-10", tone)}
            >
                <LineChart
                    data={chart.data}
                    margin={{
                        top: 3,
                        right: 0,
                        bottom: 3,
                        left: 0,
                    }}
                >
                    <XAxis dataKey="t" type="number" domain={[end - WINDOW_MS, end]} hide />

                    <YAxis type="number" domain={[chart.yMin, chart.yMax]} hide />

                    {chart.warningVisible && (
                        <ReferenceLine y={warning} stroke="var(--warning)" strokeWidth={1} strokeDasharray="3 3" />
                    )}

                    {chart.criticalVisible && (
                        <ReferenceLine y={critical} stroke="var(--destructive)" strokeWidth={1} strokeDasharray="3 3" />
                    )}

                    <Line
                        type="linear"
                        dataKey="value"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        dot={false}
                        activeDot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ChartContainer>

            <div
                className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground"
                title={`min ${chart.min.toFixed(1)}° · max ${chart.max.toFixed(1)}°`}
            >
                <span>-{hours}h</span>

                {!compact && (
                    <span
                        aria-label={`Temperature over the last ${hours} hours, from ${chart.min.toFixed(
                            1
                        )} to ${chart.max.toFixed(1)} degrees`}
                    >
                        min {chart.min.toFixed(1)}° · max {chart.max.toFixed(1)}°
                    </span>
                )}

                <span>now</span>
            </div>
        </div>
    );
}
