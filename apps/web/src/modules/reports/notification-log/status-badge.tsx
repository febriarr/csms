import type { NotificationStatus } from "@workspace/validator";
import { Badge } from "@workspace/ui/components/badge";

import { STATUS_META } from "./constants";

const PENDING_STYLE = "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";

export function StatusBadge({ status }: { status: NotificationStatus }) {
    const meta = STATUS_META[status];

    if (status === "SUCCESS") return <Badge variant="success" title={meta.hint}>{meta.label}</Badge>;
    if (status === "FAILED") return <Badge variant="destructive" title={meta.hint}>{meta.label}</Badge>;

    return (
        <Badge variant="outline" className={PENDING_STYLE} title={meta.hint}>
            {meta.label}
        </Badge>
    );
}
