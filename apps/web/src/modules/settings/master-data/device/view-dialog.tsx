import type { DeviceView } from "@workspace/shared";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import { formatDateTime } from "@/lib/format-date-time";
import { formatTemperature, humanizeEnum } from "@/lib/format";

type Entry = [label: string, value: string];
type Section = { title: string; entries: Entry[] };

const text = (value: string | null | undefined) => value || "-";

/** deletedAt and deletedBy are intentionally left out. */
function getSections(device: DeviceView): Section[] {
    const { monitoring } = device;

    const status: Entry[] = [
        ["State", humanizeEnum(device.state)],
        ["State changed at", formatDateTime(device.stateChangedAt)],
        ["Last seen at", formatDateTime(device.lastSeenAt)],
        ["Last temperature", formatTemperature(device.lastTemperature)],
        ["Last recorded at", formatDateTime(device.lastRecordedAt)],
        ["Active", device.isActive ? "Yes" : "No"],
        ["Monitoring status", humanizeEnum(monitoring.status)],
    ];

    if (monitoring.pause) {
        status.push(
            ["Pause type", humanizeEnum(monitoring.pause.kind)],
            ["Pause starts at", formatDateTime(monitoring.pause.startsAt)],
            ["Pause ends at", formatDateTime(monitoring.pause.endsAt)]
        );
    }

    return [
        {
            title: "General",
            entries: [
                ["ID", device.id],
                ["Code", device.code],
                ["Name", device.name],
                ["Division", device.divisionName],
                ["Location", device.locationName],
                ["Cold room", device.coldStorageName],
                ["Point", text(device.pointLabel)],
                ["Firmware version", text(device.firmwareVersion)],
            ],
        },
        {
            title: "Thresholds & Heartbeat",
            entries: [
                ["Defrost threshold", formatTemperature(device.defrostThreshold)],
                ["Warning threshold", formatTemperature(device.warningThreshold)],
                ["Critical threshold", formatTemperature(device.criticalThreshold)],
                ["Heartbeat interval", `${device.heartbeatIntervalSeconds} s`],
            ],
        },
        { title: "Status", entries: status },
        {
            title: "Record",
            entries: [
                ["Created at", formatDateTime(device.createdAt)],
                ["Updated at", formatDateTime(device.updatedAt)],
            ],
        },
    ];
}

type DeviceViewDialogProps = {
    /** null = closed */
    device: DeviceView | null;
    onOpenChange: (open: boolean) => void;
};

export function DeviceViewDialog({ device, onOpenChange }: DeviceViewDialogProps) {
    return (
        <Dialog open={device !== null} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-none flex-col overflow-hidden md:w-[80vw] md:max-w-[80vw]">
                {device && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Device Details</DialogTitle>
                            <DialogDescription>Read-only details of {device.name}.</DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-6 overflow-y-auto">
                            {getSections(device).map((section) => (
                                <section key={section.title} className="flex flex-col gap-3">
                                    <h3 className="text-sm font-medium">{section.title}</h3>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {section.entries.map(([label, value]) => {
                                            const id = `view-${label.toLowerCase().replace(/\W+/g, "-")}`;
                                            return (
                                                <Field key={label}>
                                                    <FieldLabel htmlFor={id}>{label}</FieldLabel>
                                                    <Input id={id} value={value} disabled />
                                                </Field>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
