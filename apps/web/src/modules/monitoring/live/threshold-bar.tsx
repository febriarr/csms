import { cn } from "@workspace/ui/lib/utils";

import { ZONE_CLASSES } from "./constants";

type ThresholdBarProps = {
    value: number | null;
    /** null = the device has no defrost state (the spiral). */
    defrost: number | null;
    warning: number;
    critical: number;
    dim?: boolean;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const label = (value: number) => `${value.toFixed(1)}°`;

/**
 * Where the reading sits against the device's own thresholds. The rule is "greater than" (see ThresholdRuleAlert):
 * below the first threshold is normal, above warning is a warning, above critical is critical. The scale is fitted to
 * the thresholds, so the needle moves the same way for a freezer and for a chiller.
 */
export function ThresholdBar({ value, defrost, warning, critical, dim }: ThresholdBarProps) {
    const span = Math.max(critical - warning, 3);
    const lowest = defrost ?? warning;
    const low = lowest - span * 1.2;
    const high = critical + span * 0.8;

    const pct = (v: number) => clamp(((v - low) / (high - low)) * 100);

    const zones = [
        { from: 0, to: pct(lowest), className: ZONE_CLASSES.normal },
        ...(defrost != null ? [{ from: pct(defrost), to: pct(warning), className: ZONE_CLASSES.defrost }] : []),
        { from: pct(warning), to: pct(critical), className: ZONE_CLASSES.warning },
        { from: pct(critical), to: 100, className: ZONE_CLASSES.critical },
    ];

    const markers = [
        ...(defrost != null ? [{ value: defrost, className: "text-sky-600 dark:text-sky-400" }] : []),
        { value: warning, className: "text-amber-600 dark:text-amber-400" },
        { value: critical, className: "text-destructive" },
    ];

    return (
        <div
            role="img"
            aria-label={
                `${value == null ? "No reading" : `Reading ${value.toFixed(1)} degrees`}. ` +
                `Warning above ${warning.toFixed(1)}, critical above ${critical.toFixed(1)}.`
            }
            className={cn("pb-4", dim && "opacity-50")}
        >
            <div className="relative h-2 rounded-full bg-muted">
                <div className="absolute inset-0 overflow-hidden rounded-full">
                    {zones.map((zone, index) => (
                        <div
                            key={index}
                            className={cn("absolute inset-y-0", zone.className)}
                            style={{ left: `${zone.from}%`, width: `${zone.to - zone.from}%` }}
                        />
                    ))}
                </div>

                {value != null && (
                    <div
                        className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-sm transition-[left] duration-500 ease-out"
                        style={{ left: `${pct(value)}%` }}
                    />
                )}

                {markers.map((marker) => (
                    <span
                        key={marker.value}
                        className={cn(
                            "absolute top-full mt-1 -translate-x-1/2 font-mono text-[10px] leading-none",
                            marker.className
                        )}
                        style={{ left: `${pct(marker.value)}%` }}
                    >
                        {label(marker.value)}
                    </span>
                ))}
            </div>
        </div>
    );
}
