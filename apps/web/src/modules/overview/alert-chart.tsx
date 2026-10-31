import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { OverviewAlertBucket } from "@workspace/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@workspace/ui/components/chart";

const chartConfig = {
    critical: { label: "Critical", color: "var(--destructive)" },
    warning: { label: "Warning", color: "var(--warning)" },
    offline: { label: "Offline", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

export function AlertChart({ buckets }: { buckets: OverviewAlertBucket[] }) {
    const data = buckets.map((bucket) => ({ ...bucket, label: hourFormatter.format(new Date(bucket.hour)) }));
    const total = buckets.reduce((sum, b) => sum + b.critical + b.warning + b.offline, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Alerts in the last 24 hours</CardTitle>
                <CardDescription>
                    {total === 0
                        ? "No device went into a bad state."
                        : `${total} transition(s) into a bad state, per hour.`}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
                    <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 12, top: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} width={28} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Bar dataKey="critical" stackId="a" fill="var(--color-critical)" />
                        <Bar dataKey="warning" stackId="a" fill="var(--color-warning)" />
                        <Bar dataKey="offline" stackId="a" fill="var(--color-offline)" radius={[3, 3, 0, 0]} />
                        <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
