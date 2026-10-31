import { useSyncExternalStore } from "react";

import { cn } from "@workspace/ui/lib/utils";

/* one shared clock: every ticking label subscribes to it, so there is a single interval, not one per card */

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let snapshot = Date.now();

function subscribe(listener: () => void) {
    listeners.add(listener);

    if (!timer) {
        snapshot = Date.now();
        timer = setInterval(() => {
            snapshot = Date.now();
            listeners.forEach((notify) => notify());
        }, 1000);
    }

    return () => {
        listeners.delete(listener);

        if (listeners.size === 0 && timer) {
            clearInterval(timer);
            timer = null;
        }
    };
}

const getSnapshot = () => snapshot;

/** Current time in ms, refreshed every second. Only the component that calls it re-renders. */
export function useNow(): number {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/* formatting */

/** "12s", "4m", "2h 10m", "3d 4h" */
export function formatDuration(ms: number): string {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;

    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function formatAgo(ms: number): string {
    return ms < 5000 ? "just now" : `${formatDuration(ms)} ago`;
}

/* ticking labels */

type TimeProps = { date: Date | string | null; className?: string };

/** "12s ago". Turns amber when the last signal is older than `staleAfterMs`. */
export function TimeAgo({ date, staleAfterMs, className }: TimeProps & { staleAfterMs?: number }) {
    const now = useNow();

    if (!date) return <span className={className}>No signal yet</span>;

    const age = now - new Date(date).getTime();
    const stale = staleAfterMs !== undefined && age > staleAfterMs;

    return <span className={cn(className, stale && "text-amber-600 dark:text-amber-400")}>{formatAgo(age)}</span>;
}

/** "4m", the time elapsed since `date`. */
export function Elapsed({ date, className }: TimeProps) {
    const now = useNow();

    return <span className={className}>{date ? formatDuration(now - new Date(date).getTime()) : "-"}</span>;
}
