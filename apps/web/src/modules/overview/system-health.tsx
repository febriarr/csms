import { Link } from "react-router";

import type { Overview } from "@workspace/shared";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

import { formatDateTime } from "@/lib/format-date-time";
import { humanizeEnum } from "@/lib/format";

export function NotificationHealth({ notifications }: Pick<Overview, "notifications">) {
    const { today, whatsapp } = notifications;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Notifications today</CardTitle>
                <CardDescription>Did the messages reach the people who need them?</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">WhatsApp</span>
                    {!whatsapp.enabled ? (
                        <Badge variant="muted">Disabled</Badge>
                    ) : whatsapp.connected ? (
                        <Badge variant="success">Connected</Badge>
                    ) : (
                        <Badge variant="destructive">Not connected</Badge>
                    )}
                </div>

                <dl className="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <dd className="text-xl font-semibold tabular-nums">{today.success}</dd>
                        <dt className="text-xs text-muted-foreground">Sent</dt>
                    </div>
                    <div>
                        <dd className="text-xl font-semibold tabular-nums">{today.pending}</dd>
                        <dt className="text-xs text-muted-foreground">Pending</dt>
                    </div>
                    <div>
                        <dd
                            className={
                                today.failed > 0
                                    ? "text-xl font-semibold text-destructive tabular-nums"
                                    : "text-xl font-semibold tabular-nums"
                            }
                        >
                            {today.failed}
                        </dd>
                        <dt className="text-xs text-muted-foreground">Failed</dt>
                    </div>
                </dl>

                {today.failed > 0 && (
                    <Link to="/dashboard/reports/notification-log" className="text-xs underline underline-offset-4">
                        See the failed messages
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}

export function DiagnosticHealth({ diagnostics }: Pick<Overview, "diagnostics">) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Device health today</CardTitle>
                <CardDescription>
                    {diagnostics.affectedDevices === 0
                        ? "No device reported a failure."
                        : `${diagnostics.affectedDevices} device(s) reported failures.`}
                </CardDescription>
            </CardHeader>

            {diagnostics.top.length > 0 && (
                <CardContent>
                    <ul className="divide-y">
                        {diagnostics.top.map((item) => (
                            <li key={item.deviceId} className="flex items-center justify-between gap-3 py-2 first:pt-0">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{item.deviceName}</p>
                                    <p className="truncate text-xs text-muted-foreground">{item.coldStorageName}</p>
                                </div>
                                <p className="shrink-0 font-mono text-xs text-muted-foreground">
                                    sensor {item.sensorFailTotal} · wifi {item.wifiFailTotal} · http{" "}
                                    {item.httpFailTotal}
                                </p>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            )}
        </Card>
    );
}

export function PauseList({ pauses }: Pick<Overview, "pauses">) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Planned pauses</CardTitle>
                <CardDescription>No alerts are raised for these while they last.</CardDescription>
            </CardHeader>

            <CardContent>
                {pauses.length === 0 ? (
                    <p className="py-2 text-center text-sm text-muted-foreground">No pause is running or planned.</p>
                ) : (
                    <ul className="divide-y">
                        {pauses.map((pause) => (
                            <li key={pause.id} className="flex items-center justify-between gap-3 py-2 first:pt-0">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{pause.targetName}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {humanizeEnum(pause.kind)} · {formatDateTime(pause.startsAt)}
                                        {pause.endsAt
                                            ? ` → ${formatDateTime(pause.endsAt)}`
                                            : " → until further notice"}
                                    </p>
                                </div>
                                <Badge variant={pause.timeline === "ACTIVE" ? "warning" : "info"}>
                                    {pause.timeline === "ACTIVE" ? "Active" : "Scheduled"}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
