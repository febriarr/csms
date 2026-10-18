import { AlertTriangle, CheckCircle2, Thermometer, Wifi } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
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
    {
        id: 1,
        storage: "Cold Storage A",
        temperature: "-18.4°C",
        humidity: "68%",
        state: "Normal",
        time: "14:32:18",
    },
    {
        id: 2,
        storage: "Cold Storage B",
        temperature: "-17.2°C",
        humidity: "71%",
        state: "Warning",
        time: "14:32:12",
    },
    {
        id: 3,
        storage: "Cold Storage C",
        temperature: "-20.1°C",
        humidity: "65%",
        state: "Normal",
        time: "14:32:09",
    },
    {
        id: 4,
        storage: "Cold Storage D",
        temperature: "-16.8°C",
        humidity: "73%",
        state: "Critical",
        time: "14:31:58",
    },
];

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "Normal":
            return "default";
        case "Warning":
            return "secondary";
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
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
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

                            <Thermometer aria-hidden="true" className="size-4 text-sky-500" />
                        </CardHeader>

                        <CardContent>
                            <div className="text-2xl font-semibold">{storageUnits.length}</div>

                            <p className="text-xs text-muted-foreground">monitored units</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Normal</CardTitle>

                            <CheckCircle2 aria-hidden="true" className="size-4 text-green-500" />
                        </CardHeader>

                        <CardContent>
                            <div className="text-2xl font-semibold">{normalCount}</div>

                            <p className="text-xs text-muted-foreground">operating normally</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Warning</CardTitle>

                            <AlertTriangle aria-hidden="true" className="size-4 text-amber-500" />
                        </CardHeader>

                        <CardContent>
                            <div className="text-2xl font-semibold">{warningCount}</div>

                            <p className="text-xs text-muted-foreground">require attention</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Devices Online</CardTitle>

                            <Wifi aria-hidden="true" className="size-4 text-blue-500" />
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

            {/* Storage cards */}
            {/* <section aria-labelledby="storage-heading" className="space-y-3">
                <div>
                    <h2 id="storage-heading" className="text-sm font-medium">
                        Cold Storage
                    </h2>

                    <p className="text-sm text-muted-foreground">Current temperature and device status.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {storageUnits.map((storage) => (
                        <Card key={storage.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <CardTitle className="truncate text-sm font-medium">{storage.name}</CardTitle>

                                        <p className="mt-1 text-xs text-muted-foreground">Target {storage.target}°C</p>
                                    </div>

                                    <Badge variant={getStatusVariant(storage.status)} className="shrink-0">
                                        {storage.status}
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-5">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <div className="font-mono text-3xl font-semibold tracking-tight">
                                            {storage.temperature.toFixed(1)}°C
                                        </div>

                                        <p className="mt-1 text-xs text-muted-foreground">Current temperature</p>
                                    </div>

                                    <Thermometer aria-hidden="true" className="size-5 text-muted-foreground" />
                                </div>

                                <div className="grid grid-cols-2 divide-x rounded-md border bg-muted/30">
                                    <div className="px-3 py-2">
                                        <p className="text-xs text-muted-foreground">Device</p>

                                        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                                            <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
                                            {storage.device}
                                        </p>
                                    </div>

                                    <div className="px-3 py-2 pl-4">
                                        <p className="text-xs text-muted-foreground">Updated</p>

                                        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                                            <Clock3 aria-hidden="true" className="size-3.5 text-muted-foreground" />
                                            {storage.updated}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section> */}

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
