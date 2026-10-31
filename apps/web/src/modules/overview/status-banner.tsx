import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { Overview } from "@workspace/shared";
import { cn } from "@workspace/ui/lib/utils";

type Verdict = { tone: "ok" | "warning" | "critical"; text: string };

/** One sentence for the whole plant, colored by the worst thing going on. */
export function verdictOf({ devices }: Pick<Overview, "devices">): Verdict {
    const { CRITICAL, WARNING, OFFLINE } = devices.byState;

    const parts = [
        CRITICAL > 0 && `${CRITICAL} critical`,
        WARNING > 0 && `${WARNING} warning`,
        OFFLINE > 0 && `${OFFLINE} offline`,
    ].filter(Boolean);

    if (parts.length === 0) {
        return {
            tone: "ok",
            text: devices.monitored === 0 ? "No device is being monitored" : "All devices are normal",
        };
    }

    return { tone: CRITICAL > 0 ? "critical" : "warning", text: parts.join(", ") };
}

const STYLES = {
    ok: {
        box: "border-emerald-500/30 bg-emerald-500/5",
        icon: CheckCircle2,
        color: "text-emerald-600 dark:text-emerald-400",
    },
    warning: {
        box: "border-amber-500/40 bg-amber-500/5",
        icon: AlertTriangle,
        color: "text-amber-600 dark:text-amber-400",
    },
    critical: { box: "border-destructive/50 bg-destructive/5", icon: AlertTriangle, color: "text-destructive" },
} as const;

export function StatusBanner({ overview }: { overview: Overview }) {
    const verdict = verdictOf(overview);
    const { box, icon: Icon, color } = STYLES[verdict.tone];

    return (
        <div role="status" className={cn("flex items-center gap-3 rounded-xl border px-4 py-3", box)}>
            <Icon aria-hidden className={cn("size-5 shrink-0", color)} />
            <p className={cn("text-base font-medium", color)}>{verdict.text}</p>
        </div>
    );
}
