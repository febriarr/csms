import { Check } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

import type { OverviewAlert } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

import { DeviceStateBadge } from "@/components/device-state-badge";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatTemperature } from "@/lib/format";
import { reasonLabel } from "@/modules/monitoring/alert/constants";
import { TimeAgo } from "@/modules/monitoring/live/time";

import { useAcknowledgeFromOverview } from "./hooks";

type OpenAlertsProps = { alerts: OverviewAlert[]; total: number };

export function OpenAlerts({ alerts, total }: OpenAlertsProps) {
    const acknowledge = useAcknowledgeFromOverview();

    function handleAcknowledge(id: string) {
        acknowledge.mutate(id, {
            onSuccess: () => toast.success("Alert acknowledged"),
            onError: (error) => toast.error(getErrorMessage(error)),
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Needs action</CardTitle>
                <CardDescription>The newest alerts nobody has acknowledged yet.</CardDescription>
            </CardHeader>

            <CardContent>
                {alerts.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nothing is waiting for you.</p>
                ) : (
                    <ul className="divide-y">
                        {alerts.map((alert) => (
                            <li key={alert.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <DeviceStateBadge state={alert.toState} />
                                        <span className="truncate text-sm font-medium">{alert.deviceName}</span>
                                        <span className="text-xs text-muted-foreground">{alert.coldStorageName}</span>
                                    </div>

                                    <p className="truncate text-xs text-muted-foreground">
                                        {reasonLabel(alert.reasonCode)}
                                        {alert.temperature !== null && ` · ${formatTemperature(alert.temperature)}`}
                                        {" · "}
                                        <TimeAgo date={alert.occurredAt} />
                                    </p>
                                </div>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={acknowledge.isPending && acknowledge.variables === alert.id}
                                    onClick={() => handleAcknowledge(alert.id)}
                                >
                                    <Check />
                                    Acknowledge
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}

                {total > alerts.length && (
                    <Button asChild variant="link" size="sm" className="mt-2 px-0">
                        <Link to="/dashboard/monitoring/alerts">See all {total} open alerts</Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
