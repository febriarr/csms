import { useState, type SyntheticEvent } from "react";
import { Loader2 } from "lucide-react";

import type { MonitoringPauseView, PauseTimeline } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { createPauseSchema, type CreatePauseInput, type PauseKind } from "@workspace/validator";

import { toFieldErrors } from "@/lib/form-errors";
import { useColdStorages } from "@/modules/settings/master-data/cold-room/hooks";
import { useDevices } from "@/modules/settings/master-data/device/hooks";

import { KIND_LABELS, PAUSE_KINDS, type PauseTarget } from "./constants";
import { DateTimePicker } from "./date-time-picker";
import { getPauseErrorMessage, getServerFieldErrors } from "./errors";
import { useCreatePause } from "./hooks";

type StartMode = "NOW" | "SCHEDULED";
type EndMode = "OPEN" | "SET";

/* dialog wrapper */

type PauseFormDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called after the pause was created and the list was refetched. `timeline` says which tab it lands in. */
    onSuccess: (pause: MonitoringPauseView, timeline: PauseTimeline) => void;
};

export function PauseFormDialog({ open, onOpenChange, onSuccess }: PauseFormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-none flex-col overflow-hidden md:max-w-xl">
                {/* Mounted only while open, so the form and its mutation state reset every time. */}
                {open && <PauseForm onCancel={() => onOpenChange(false)} onSuccess={onSuccess} />}
            </DialogContent>
        </Dialog>
    );
}

/* helpers */

/** Where the new pause will show up, judged from what was sent (the same rule the server applies). */
function getTimeline(input: CreatePauseInput): PauseTimeline {
    const now = Date.now();

    if (input.startsAt && Date.parse(input.startsAt) > now) return "SCHEDULED";
    if (input.endsAt && Date.parse(input.endsAt) <= now) return "ENDED";

    return "ACTIVE";
}

/* form */

type PauseFormProps = {
    onCancel: () => void;
    onSuccess: (pause: MonitoringPauseView, timeline: PauseTimeline) => void;
};

function PauseForm({ onCancel, onSuccess }: PauseFormProps) {
    const create = useCreatePause();
    const coldStorages = useColdStorages();
    const devices = useDevices();

    const [targetType, setTargetType] = useState<PauseTarget>("COLD_STORAGE");
    const [targetId, setTargetId] = useState("");
    const [kind, setKind] = useState<PauseKind>(PAUSE_KINDS[0]);
    const [startMode, setStartMode] = useState<StartMode>("NOW");
    const [startsAt, setStartsAt] = useState<Date | undefined>();
    const [endMode, setEndMode] = useState<EndMode>("OPEN");
    const [endsAt, setEndsAt] = useState<Date | undefined>();
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const serverError = create.error;
    const errors = { ...getServerFieldErrors(serverError), ...clientErrors };
    const targetError = errors.deviceId ?? errors.coldStorageId;

    const hasFieldError = Object.keys(errors).some((field) => field !== "_root");
    const rootError = errors._root ?? (serverError && !hasFieldError ? getPauseErrorMessage(serverError) : undefined);

    const targetOptions =
        targetType === "DEVICE"
            ? (devices.data?.map((item) => ({ id: item.id, label: `${item.name} (${item.code})` })) ?? [])
            : (coldStorages.data?.map((item) => ({ id: item.id, label: `${item.name} · ${item.location}` })) ?? []);
    const targetsPending = targetType === "DEVICE" ? devices.isPending : coldStorages.isPending;

    function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (create.isPending) return;

        const form = new FormData(event.currentTarget);
        const text = (key: string) => String(form.get(key) ?? "");

        // An empty picker would silently mean "now" / "until further notice" to the API, so ask explicitly.
        const missing: Record<string, string> = {};
        if (startMode === "SCHEDULED" && !startsAt) missing.startsAt = "Pilih waktu mulai.";
        if (endMode === "SET" && !endsAt) missing.endsAt = "Pilih waktu selesai.";

        const parsed = createPauseSchema.safeParse({
            deviceId: targetType === "DEVICE" ? targetId || undefined : undefined,
            coldStorageId: targetType === "COLD_STORAGE" ? targetId || undefined : undefined,
            kind,
            startsAt: startMode === "SCHEDULED" ? startsAt?.toISOString() : undefined,
            endsAt: endMode === "SET" ? endsAt?.toISOString() : null,
            maxPulldownMinutes: text("maxPulldownMinutes"),
            note: text("note"),
        });

        const found: Record<string, string> = parsed.success ? {} : toFieldErrors(parsed.error);
        const all = { ...found, ...missing };

        if (!parsed.success || Object.keys(missing).length > 0) return setClientErrors(all);
        setClientErrors({});

        create.mutate(parsed.data, { onSuccess: (saved) => onSuccess(saved, getTimeline(parsed.data)) });
    }

    const disabled = create.isPending;

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
            <DialogHeader>
                <DialogTitle>Add Pause</DialogTitle>
                <DialogDescription>
                    Hold alerts for a cold room or a device during planned downtime or maintenance.
                </DialogDescription>
            </DialogHeader>

            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                        <Field>
                            <FieldLabel htmlFor="targetType">Target type</FieldLabel>
                            <Select
                                value={targetType}
                                onValueChange={(value) => {
                                    setTargetType(value as PauseTarget);
                                    setTargetId(""); // an id of the other kind would be invalid
                                }}
                                disabled={disabled}
                            >
                                <SelectTrigger id="targetType" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="COLD_STORAGE">Cold room</SelectItem>
                                    <SelectItem value="DEVICE">Device</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field data-invalid={!!targetError}>
                            <FieldLabel htmlFor="targetId">
                                {targetType === "DEVICE" ? "Device" : "Cold Room"}
                            </FieldLabel>
                            <Select value={targetId} onValueChange={setTargetId} disabled={disabled}>
                                <SelectTrigger id="targetId" className="w-full" aria-invalid={!!targetError}>
                                    <SelectValue
                                        placeholder={
                                            targetsPending
                                                ? "Loading..."
                                                : targetType === "DEVICE"
                                                  ? "Select a device"
                                                  : "Select a cold room"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {targetOptions.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {targetType === "COLD_STORAGE" && (
                                <FieldDescription>Berlaku untuk semua device di cold room ini.</FieldDescription>
                            )}
                            {targetError && <FieldError>{targetError}</FieldError>}
                        </Field>
                    </div>

                    <Field data-invalid={!!errors.kind}>
                        <FieldLabel htmlFor="kind">Kind</FieldLabel>
                        <Select value={kind} onValueChange={(value) => setKind(value as PauseKind)} disabled={disabled}>
                            <SelectTrigger id="kind" className="w-full sm:w-64" aria-invalid={!!errors.kind}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAUSE_KINDS.map((item) => (
                                    <SelectItem key={item} value={item}>
                                        {KIND_LABELS[item]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.kind && <FieldError>{errors.kind}</FieldError>}
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field data-invalid={!!errors.startsAt}>
                            <FieldLabel htmlFor="startMode">Start</FieldLabel>
                            <Select
                                value={startMode}
                                onValueChange={(value) => setStartMode(value as StartMode)}
                                disabled={disabled}
                            >
                                <SelectTrigger id="startMode" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NOW">Start now</SelectItem>
                                    <SelectItem value="SCHEDULED">Schedule for later</SelectItem>
                                </SelectContent>
                            </Select>
                            {startMode === "SCHEDULED" && (
                                <DateTimePicker
                                    id="startsAt"
                                    value={startsAt}
                                    onChange={setStartsAt}
                                    placeholder="Select start time"
                                    disabled={disabled}
                                    invalid={!!errors.startsAt}
                                />
                            )}
                            {errors.startsAt && <FieldError>{errors.startsAt}</FieldError>}
                        </Field>

                        <Field data-invalid={!!errors.endsAt}>
                            <FieldLabel htmlFor="endMode">End</FieldLabel>
                            <Select
                                value={endMode}
                                onValueChange={(value) => setEndMode(value as EndMode)}
                                disabled={disabled}
                            >
                                <SelectTrigger id="endMode" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OPEN">Until further notice</SelectItem>
                                    <SelectItem value="SET">Set end time</SelectItem>
                                </SelectContent>
                            </Select>
                            {endMode === "SET" && (
                                <DateTimePicker
                                    id="endsAt"
                                    value={endsAt}
                                    onChange={setEndsAt}
                                    placeholder="Select end time"
                                    disabled={disabled}
                                    invalid={!!errors.endsAt}
                                />
                            )}
                            {errors.endsAt && <FieldError>{errors.endsAt}</FieldError>}
                        </Field>
                    </div>

                    <Field data-invalid={!!errors.maxPulldownMinutes}>
                        <FieldLabel htmlFor="maxPulldownMinutes">Pull-down allowance (minutes)</FieldLabel>
                        <Input
                            id="maxPulldownMinutes"
                            name="maxPulldownMinutes"
                            type="number"
                            min={0}
                            max={1440}
                            step={1}
                            inputMode="numeric"
                            defaultValue={60}
                            autoComplete="off"
                            aria-invalid={!!errors.maxPulldownMinutes}
                            disabled={disabled}
                        />
                        <FieldDescription>
                            Waktu tambahan setelah pause berakhir untuk menurunkan suhu. Alert tetap ditahan sampai
                            pembacaan pertama di bawah batas warning, atau sampai waktu ini habis. 0 = alert aktif lagi
                            tepat saat pause berakhir.
                        </FieldDescription>
                        {errors.maxPulldownMinutes && <FieldError>{errors.maxPulldownMinutes}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.note}>
                        <FieldLabel htmlFor="note">Note (optional)</FieldLabel>
                        <Textarea
                            id="note"
                            name="note"
                            rows={3}
                            maxLength={500}
                            aria-invalid={!!errors.note}
                            disabled={disabled}
                        />
                        {errors.note && <FieldError>{errors.note}</FieldError>}
                    </Field>
                </FieldGroup>

                {rootError && <FieldError>{rootError}</FieldError>}
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
                    Cancel
                </Button>
                <Button type="submit" disabled={disabled}>
                    {disabled && <Loader2 className="animate-spin" />}
                    {disabled ? "Saving..." : "Save"}
                </Button>
            </DialogFooter>
        </form>
    );
}
