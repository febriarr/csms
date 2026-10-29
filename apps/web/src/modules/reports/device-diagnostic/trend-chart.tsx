import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import type { DiagnosticTrendReport } from "@workspace/shared";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@workspace/ui/components/chart";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { FAILURES, fillDays, shortDay } from "./constants";

const chartConfig = {
    sensorFailTotal: { label: "Sensor", color: "var(--destructive)" },
    wifiFailTotal: { label: "Wi-Fi", color: "var(--warning)" },
    httpFailTotal: { label: "HTTP", color: "#0ea5e9" },
    avgRssi: { label: "Avg RSSI (dBm)", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

type TrendChartProps = {
    trend: DiagnosticTrendReport | undefined;
    isPending: boolean;
    isError: boolean;
    /** The period asked for, used to show quiet days as zero. */
    from: string;
    to: string;
};

/** Failures per day as stacked bars, with the average signal strength of that day as a line. */
export function TrendChart({ trend, isPending, isError, from, to }: TrendChartProps) {
    const data = useMemo(() => (trend ? fillDays(from, to, trend.points) : []), [trend, from, to]);

    if (isPending) return <Skeleton className="h-64 w-full rounded-xl" />;

    if (isError) {
        return (
            <p className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
                Grafik tren tidak dapat dimuat.
            </p>
        );
    }

    const hasRssi = data.some((point) => point.avgRssi !== null);

    return (
        <div className="rounded-xl border p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Failures per day</h3>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {FAILURES.map((item) => (
                        <span key={item.key} className="flex items-center gap-1.5">
                            <span aria-hidden className="size-2 rounded-sm" style={{ backgroundColor: item.color }} />
                            {item.label}
                        </span>
                    ))}
                    {hasRssi && (
                        <span className="flex items-center gap-1.5">
                            <span aria-hidden className="h-0.5 w-3 bg-muted-foreground" />
                            Avg RSSI
                        </span>
                    )}
                </div>
            </div>

            <ChartContainer config={chartConfig} className="h-56 w-full">
                <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortDay} />
                    <YAxis yAxisId="count" allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                    {hasRssi && (
                        <YAxis
                            yAxisId="rssi"
                            orientation="right"
                            domain={["auto", "auto"]}
                            tickLine={false}
                            axisLine={false}
                            width={36}
                        />
                    )}

                    <ChartTooltip content={<ChartTooltipContent />} />

                    {FAILURES.map((item) => (
                        <Bar
                            key={item.key}
                            yAxisId="count"
                            dataKey={item.key}
                            stackId="failures"
                            fill={`var(--color-${item.key})`}
                            isAnimationActive={false}
                        />
                    ))}

                    {hasRssi && (
                        <Line
                            yAxisId="rssi"
                            dataKey="avgRssi"
                            type="monotone"
                            stroke="var(--color-avgRssi)"
                            strokeWidth={1.5}
                            dot={false}
                            connectNulls={false}
                            isAnimationActive={false}
                        />
                    )}
                </ComposedChart>
            </ChartContainer>
        </div>
    );
}
