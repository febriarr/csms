import { RefreshCw } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { formatDate, formatDateTime } from "@/lib/format-date-time";

import { AlertChart } from "./alert-chart";
import { useOverview } from "./hooks";
import { KpiCards } from "./kpi-cards";
import { OpenAlerts } from "./open-alerts";
import { ProblemColdStorages } from "./problem-cold-storages";
import { StatusBanner } from "./status-banner";
import { DiagnosticHealth, NotificationHealth, PauseList } from "./system-health";

function OverviewSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-14 rounded-xl" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-xl" />
                ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
                <Skeleton className="h-72 rounded-xl" />
                <Skeleton className="h-72 rounded-xl" />
            </div>
        </div>
    );
}

export function Component() {
    const { data, isPending, isError, error, refetch, isFetching, dataUpdatedAt } = useOverview();

    return (
        <>
            <title>Overview</title>
            <main className="flex flex-col gap-4">
                <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="truncate font-heading text-xl font-semibold">
                            Overview {formatDate(new Date())}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            What needs attention right now.
                            {dataUpdatedAt > 0 && ` Updated ${formatDateTime(dataUpdatedAt).slice(12)}.`}
                        </p>
                    </div>

                    <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
                        <RefreshCw className={cn(isFetching && "motion-safe:animate-spin")} />
                        Refresh
                    </Button>
                </header>

                {isPending && <OverviewSkeleton />}

                {isError && (
                    <div className="rounded-xl border py-10 text-center">
                        <p className="mb-3 text-sm text-muted-foreground">
                            {data ? "Could not refresh. Showing the last numbers." : error.message}
                        </p>
                        <Button variant="outline" size="sm" onClick={() => void refetch()}>
                            Retry
                        </Button>
                    </div>
                )}

                {data && (
                    <>
                        <StatusBanner overview={data} />
                        <KpiCards overview={data} />

                        <div className="grid gap-4 xl:grid-cols-2">
                            <OpenAlerts alerts={data.needsAttention} total={data.openAlerts.total} />
                            <ProblemColdStorages rooms={data.problemColdStorages} />
                        </div>

                        <AlertChart buckets={data.alertsLast24h} />

                        <div className="grid gap-4 lg:grid-cols-3">
                            <NotificationHealth notifications={data.notifications} />
                            <DiagnosticHealth diagnostics={data.diagnostics} />
                            <PauseList pauses={data.pauses} />
                        </div>
                    </>
                )}
            </main>
        </>
    );
}
