import type { ListNotificationLog } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Textarea } from "@workspace/ui/components/textarea";

import { DetailSections, type DetailSection } from "@/components/detail-sections";
import { stateMeta } from "@/lib/device-state";
import { formatDateTime } from "@/lib/format-date-time";
import { channelLabel } from "@/modules/settings/notification/constants";

import { statusLabel } from "./constants";

function getSections(log: ListNotificationLog): DetailSection[] {
    return [
        {
            title: "Message",
            entries: [
                ["ID", log.id],
                ["Status", statusLabel(log.status)],
                ["Channel", channelLabel(log.channel)],
                ["Sent to", log.recipient ?? "-"],
                ["Recipient", log.recipientName ?? "Deleted recipient"],
                ["Attempts", String(log.attemptCount)],
                ["Queued at", formatDateTime(log.createdAt)],
                ["Sent at", formatDateTime(log.sentAt)],
            ],
        },
        {
            title: "Alert",
            entries: [
                ["Alert ID", log.alertId],
                ["Device", `${log.deviceName} (${log.deviceCode})`],
                ["Cold room", log.coldStorageName],
                ["Alert state", stateMeta(log.alertState).label],
                ["Alert occurred at", formatDateTime(log.alertOccurredAt)],
            ],
        },
    ];
}

type LogViewDialogProps = {
    /** null = closed */
    log: ListNotificationLog | null;
    onOpenChange: (open: boolean) => void;
};

export function LogViewDialog({ log, onOpenChange }: LogViewDialogProps) {
    return (
        <Dialog open={log !== null} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-none flex-col overflow-hidden md:max-w-2xl">
                {log && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Notification Details</DialogTitle>
                            <DialogDescription>
                                Read-only details of the message about {log.deviceName}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
                            <DetailSections sections={getSections(log)} idPrefix="notification-log" />

                            <Field>
                                <FieldLabel htmlFor="notification-log-message">Message</FieldLabel>
                                <Textarea
                                    id="notification-log-message"
                                    rows={8}
                                    value={log.message ?? "-"}
                                    disabled
                                    className="font-mono text-xs"
                                />
                            </Field>

                            {log.errorMessage && (
                                <Field>
                                    <FieldLabel htmlFor="notification-log-error">Last error</FieldLabel>
                                    <Textarea id="notification-log-error" rows={3} value={log.errorMessage} disabled />
                                </Field>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
