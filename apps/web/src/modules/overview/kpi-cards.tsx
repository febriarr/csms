import type { LucideIcon } from "lucide-react";
import { AlertTriangle, BellRing, CheckCircle2, Pause, WifiOff } from "lucide-react";

import type { Overview } from "@workspace/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

type KpiProps = {
    title: string;
    value: string | number;
    hint: string;
    icon: LucideIcon;
    /** Colors the number and the icon when the value means "look at this". */
    tone?: "neutral" | "critical" | "warning" | "ok";
};

const TONES = {
    neutral: { icon: "text-muted-foreground", value: "" },
    ok: { icon: "text-emerald-600 dark:text-emerald-400", value: "" },
    warning: { icon: "text-amber-600 dark:text-amber-400", value: "text-amber-600 dark:text-amber-400" },
    critical: { icon: "text-destructive", value: "text-destructive" },
} as const;

function Kpi({ title, value, hint, icon: Icon, tone = "neutral" }: KpiProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon aria-hidden="true" className={cn("size-4", TONES[tone].icon)} />
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-semibold tabular-nums", TONES[tone].value)}>{value}</div>
                <p className="text-xs text-muted-foreground">{hint}</p>
            </CardContent>
        </Card>
    );
}

/** A zero is information too, so every card is always shown. */
export function KpiCards({ overview }: { overview: Overview }) {
    const { devices, openAlerts } = overview;
    const critical = devices.byState.CRITICAL;
    const warning = devices.byState.WARNING;
    const offline = devices.byState.OFFLINE;

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi
                title="Critical"
                value={critical}
                hint={critical === 0 ? "no device above the critical limit" : "device(s) above the critical limit"}
                icon={AlertTriangle}
                tone={critical > 0 ? "critical" : "ok"}
            />
            <Kpi
                title="Warning"
                value={warning}
                hint={warning === 0 ? "no device above the warning limit" : "device(s) above the warning limit"}
                icon={AlertTriangle}
                tone={warning > 0 ? "warning" : "ok"}
            />
            <Kpi
                title="Offline"
                value={offline}
                hint={`${devices.online}/${devices.monitored} monitored devices online`}
                icon={WifiOff}
                tone={offline > 0 ? "critical" : "ok"}
            />
            <Kpi
                title="Open alerts"
                value={openAlerts.total}
                hint={openAlerts.total === 0 ? "everything acknowledged" : "waiting to be acknowledged"}
                icon={BellRing}
                tone={openAlerts.critical > 0 ? "critical" : openAlerts.total > 0 ? "warning" : "ok"}
            />
            <Kpi
                title="Paused"
                value={devices.paused}
                hint={
                    devices.inactive > 0 ? `planned pause, ${devices.inactive} inactive` : "devices in a planned pause"
                }
                icon={devices.paused > 0 ? Pause : CheckCircle2}
            />
        </div>
    );
}
