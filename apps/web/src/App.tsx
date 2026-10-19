import { AlertTriangle, CheckCircle2, Thermometer, Wifi } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@workspace/ui/components/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

const storageUnits = [
    {
        id: "cs-001",
        name: "Cold Storage A",
        temperature: -18.4,
        target: -18,
        status: "Normal",
        device: "Online",
        updated: "12 sec ago",
    },
    {
        id: "cs-002",
        name: "Cold Storage B",
        temperature: -17.2,
        target: -18,
        status: "Warning",
        device: "Online",
        updated: "18 sec ago",
    },
    {
        id: "cs-003",
        name: "Cold Storage C",
        temperature: -20.1,
        target: -20,
        status: "Normal",
        device: "Online",
        updated: "9 sec ago",
    },
    {
        id: "cs-004",
        name: "Cold Storage D",
        temperature: -16.8,
        target: -18,
        status: "Critical",
        device: "Online",
        updated: "24 sec ago",
    },
];

const telemetry = [
    { id: 1, storage: "Cold Storage A", temperature: "-18.4°C", humidity: "68%", state: "Normal", time: "14:32:18" },
    { id: 2, storage: "Cold Storage B", temperature: "-17.2°C", humidity: "71%", state: "Warning", time: "14:32:12" },
    { id: 3, storage: "Cold Storage C", temperature: "-20.1°C", humidity: "65%", state: "Normal", time: "14:32:09" },
    { id: 4, storage: "Cold Storage D", temperature: "-16.8°C", humidity: "73%", state: "Critical", time: "14:31:58" },
];

const WARNING_AT = -17.5;
const CRITICAL_AT = -17.0;

const times = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
];

const series = {
    a: [-18.2, -18.5, -18.3, -18.6, -18.4, -18.1, -18.3, -18.5, -18.2, -18.4, -18.6, -18.4],
    b: [-18.0, -17.9, -17.8, -17.9, -17.6, -17.7, -17.5, -17.4, -17.5, -17.3, -17.3, -17.2],
    c: [-20.2, -20.0, -20.3, -20.1, -19.9, -20.2, -20.1, -20.3, -20.0, -20.2, -20.1, -20.1],
    d: [-18.1, -18.0, -17.8, -17.6, -17.4, -17.5, -17.2, -17.0, -17.1, -16.9, -16.9, -16.8],
};

const trend = times.map((time, i) => ({
    time,
    a: series.a[i],
    b: series.b[i],
    c: series.c[i],
    d: series.d[i],
}));

const chartConfig = {
    a: { label: "Cold Storage A", color: "var(--chart-1)" },
    b: { label: "Cold Storage B", color: "var(--chart-2)" },
    c: { label: "Cold Storage C", color: "var(--chart-3)" },
    d: { label: "Cold Storage D", color: "var(--chart-4)" },
} satisfies ChartConfig;

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
    switch (status) {
        case "Normal":
            return "success";
        case "Warning":
            return "warning";
        case "Critical":
            return "destructive";
        default:
            return "outline";
    }
}

export function Component() {
    const normalCount = storageUnits.filter((storage) => storage.status === "Normal").length;
    const warningCount = storageUnits.filter((storage) => storage.status === "Warning").length;
    const criticalCount = storageUnits.filter((storage) => storage.status === "Critical").length;
    const onlineCount = storageUnits.filter((storage) => storage.device === "Online").length;

    return (
        <main className="space-y-6">
            {/* Page header */}
            <header className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                    <h1 className="truncate font-heading text-xl font-medium">Monitoring 18-OCT-2026</h1>

                    <Badge variant="outline" className="gap-1.5">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                        Live
                    </Badge>
                </div>

                <p className="text-sm text-muted-foreground">Real-time cold storage temperature monitoring.</p>
            </header>

            {/* Overview */}
            <section aria-labelledby="overview-heading" className="space-y-3">
                <div>
                    <h2 id="overview-heading" className="text-sm font-medium">
                        Overview
                    </h2>

                    <p className="text-sm text-muted-foreground">Current status of all monitored storage units.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
                            <Thermometer aria-hidden="true" className="size-4 text-chart-1" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold">{storageUnits.length}</div>
                            <p className="text-xs text-muted-foreground">monitored units</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Normal</CardTitle>
                            <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold">{normalCount}</div>
                            <p className="text-xs text-muted-foreground">operating normally</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Warning</CardTitle>
                            <AlertTriangle aria-hidden="true" className="size-4 text-warning" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold">{warningCount}</div>
                            <p className="text-xs text-muted-foreground">require attention</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Devices Online</CardTitle>
                            <Wifi aria-hidden="true" className="size-4 text-chart-2" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold">
                                {onlineCount}/{storageUnits.length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {criticalCount > 0 ? `${criticalCount} critical condition` : "all systems connected"}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Temperature trend */}
            <section aria-labelledby="trend-heading" className="space-y-3">
                <div>
                    <h2 id="trend-heading" className="text-sm font-medium">
                        Temperature Trend
                    </h2>

                    <p className="text-sm text-muted-foreground">Readings per storage unit since 09:00.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">All cold storage</CardTitle>
                        <CardDescription>
                            Dashed lines mark the warning ({WARNING_AT}°C) and critical ({CRITICAL_AT}°C) thresholds.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
                            <LineChart accessibilityLayer data={trend} margin={{ left: 4, right: 12, top: 8 }}>
                                <CartesianGrid vertical={false} />

                                <XAxis
                                    dataKey="time"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    minTickGap={24}
                                />

                                <YAxis
                                    domain={[-21, -16]}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    width={44}
                                    tickFormatter={(value: number) => `${value}°`}
                                />

                                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />

                                <ReferenceLine
                                    y={WARNING_AT}
                                    stroke="var(--warning)"
                                    strokeDasharray="4 4"
                                    strokeWidth={1.5}
                                />
                                <ReferenceLine
                                    y={CRITICAL_AT}
                                    stroke="var(--destructive)"
                                    strokeDasharray="4 4"
                                    strokeWidth={1.5}
                                />

                                <Line dataKey="a" type="monotone" stroke="var(--color-a)" strokeWidth={2} dot={false} />
                                <Line dataKey="b" type="monotone" stroke="var(--color-b)" strokeWidth={2} dot={false} />
                                <Line dataKey="c" type="monotone" stroke="var(--color-c)" strokeWidth={2} dot={false} />
                                <Line dataKey="d" type="monotone" stroke="var(--color-d)" strokeWidth={2} dot={false} />

                                <ChartLegend content={<ChartLegendContent />} />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </section>

            {/* Latest telemetry */}
            <section aria-labelledby="telemetry-heading" className="space-y-3">
                <div>
                    <h2 id="telemetry-heading" className="text-sm font-medium">
                        Latest Telemetry
                    </h2>

                    <p className="text-sm text-muted-foreground">Latest readings received from monitoring devices.</p>
                </div>

                <Card className="overflow-hidden p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Storage</TableHead>
                                <TableHead>Temperature</TableHead>
                                <TableHead>Humidity</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Time</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {telemetry.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.storage}</TableCell>
                                    <TableCell className="font-mono">{item.temperature}</TableCell>
                                    <TableCell className="font-mono">{item.humidity}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(item.state)}>{item.state}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                        {item.time}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </section>
        </main>
    );
}
