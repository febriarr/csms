import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import { stateMeta } from "./constants";

export function StateBadge({ state }: { state: string }) {
    const meta = stateMeta(state);

    return (
        <Badge variant="outline" className={cn("gap-1.5", meta.badge)}>
            <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />
            {meta.label}
        </Badge>
    );
}
