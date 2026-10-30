import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import { stateMeta } from "@/lib/device-state";

/** The state of a device (or of an alert transition) as a colored badge with a dot. Same colors as the live cards. */
export function DeviceStateBadge({ state, className }: { state: string; className?: string }) {
    const meta = stateMeta(state);

    return (
        <Badge variant={meta.badge} className={cn("gap-1.5", className)}>
            <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />
            {meta.label}
        </Badge>
    );
}
