import { CheckCheck, Loader2 } from "lucide-react";

import type { ListAlert } from "@workspace/shared";
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
import { formatTemperature } from "@/lib/format";
import { formatDateTime } from "@/lib/format-date-time";

import { reasonLabel } from "./constants";

function getSections(alert: ListAlert): DetailSection[] {
    return [
        {
            title: "Alert",
            entries: [
                ["ID", alert.id],
                ["Device", `${alert.deviceName} (${alert.deviceCode})`],
                ["Cold room", alert.coldStorageName],
                ["Occurred at", formatDateTime(alert.occurredAt)],
                ["From state", stateMeta(alert.fromState).label],
                ["To state", stateMeta(alert.toState).label],
                ["Temperature", alert.temperature == null ? "-" : formatTemperature(alert.temperature)],
                ["Reason code", reasonLabel(alert.reasonCode)],
            ],
        },
        {
            title: "Acknowledgement",
            entries:
                alert.acknowledgedAt === null
                    ? [["Status", "Open"]]
                    : [
                          ["Status", "Acknowledged"],
                          ["Acknowledged by", alert.acknowledgedByName ?? "-"],
                          ["Acknowledged at", formatDateTime(alert.acknowledgedAt)],
                      ],
        },
    ];
}

type AlertViewDialogProps = {
    /** null = closed */
    alert: ListAlert | null;
    onOpenChange: (open: boolean) => void;
    onAcknowledge: (alert: ListAlert) => void;
    acknowledging: boolean;
};

export function AlertViewDialog({ alert, onOpenChange, onAcknowledge, acknowledging }: AlertViewDialogProps) {
    return (
        <Dialog open={alert !== null} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-none flex-col overflow-hidden md:max-w-2xl">
                {alert && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Alert Details</DialogTitle>
                            <DialogDescription>Read-only details of the alert of {alert.deviceName}.</DialogDescription>
                        </DialogHeader>

                        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
                            <DetailSections sections={getSections(alert)} idPrefix="alert" />

                            <Field>
                                <FieldLabel htmlFor="alert-reason">Reason</FieldLabel>
                                <Textarea id="alert-reason" rows={4} value={alert.reason ?? "-"} disabled />
                            </Field>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Close
                            </Button>
                            {alert.acknowledgedAt === null && (
                                <Button type="button" disabled={acknowledging} onClick={() => onAcknowledge(alert)}>
                                    {acknowledging ? <Loader2 className="animate-spin" /> : <CheckCheck />}
                                    {acknowledging ? "Acknowledging..." : "Acknowledge"}
                                </Button>
                            )}
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
