import { useState, type ComponentProps, type SyntheticEvent } from "react";
import { Loader2 } from "lucide-react";

import type { DeviceView } from "@workspace/shared";
import { createDeviceSchema, updateDeviceSchema, type UpdateDeviceInput } from "@workspace/validator";
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

import { toFieldErrors } from "@/lib/form-errors";
import { useColdStorages } from "@/modules/settings/master-data/cold-room/hooks";

import { getDeviceErrorMessage, getServerFieldErrors } from "./errors";
import { useCreateDevice, useUpdateDevice } from "./hooks";
import { ThresholdRuleAlert } from "./threshold-rule-alert";

export type DeviceFormResult = "created" | "updated";

/* dialog wrapper */

type DeviceFormDialogProps = {
    open: boolean;
    /** null = create */
    device: DeviceView | null;
    /** Pre-selects the cold room currently used as the list filter (create only). */
    defaultColdStorageId: string;
    onOpenChange: (open: boolean) => void;
    /** Called after the device was saved and the list was refetched. The page closes the dialog and shows the toast. */
    onSuccess: (result: DeviceFormResult, device: DeviceView) => void;
};

export function DeviceFormDialog({
    open,
    device,
    defaultColdStorageId,
    onOpenChange,
    onSuccess,
}: DeviceFormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-none flex-col overflow-hidden md:max-w-xl">
                {/* Mounted only while open, so the form and its mutation state reset every time. */}
                {open && (
                    <DeviceForm
                        device={device}
                        defaultColdStorageId={defaultColdStorageId}
                        onCancel={() => onOpenChange(false)}
                        onSuccess={onSuccess}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

/* helpers */

const same = (a: unknown, b: unknown) => {
    const x = a ?? null;
    const y = b ?? null;
    if (x === null || y === null) return x === y;
    // numeric(5,2) columns may come back as strings
    return typeof x === "number" || typeof y === "number" ? Number(x) === Number(y) : x === y;
};

/** PATCH only what changed. A blank optional text field means "clear it" (sent as null). */
function getChanges(device: DeviceView, data: UpdateDeviceInput, raw: Record<string, string>): UpdateDeviceInput {
    const changes: Record<string, unknown> = {};

    // `code` is not here on purpose: it cannot be edited (the update schema has no such field)
    for (const key of [
        "name",
        "coldStorageId",
        "warningThreshold",
        "criticalThreshold",
        "heartbeatIntervalSeconds",
    ] as const) {
        if (data[key] !== undefined && !same(data[key], device[key])) changes[key] = data[key];
    }

    // null removes the defrost state
    if (!same(data.defrostThreshold, device.defrostThreshold)) changes.defrostThreshold = data.defrostThreshold ?? null;

    for (const key of ["pointLabel", "firmwareVersion"] as const) {
        const next = raw[key]?.trim() ? (data[key] ?? null) : null;
        if (!same(next, device[key])) changes[key] = next;
    }

    return changes as UpdateDeviceInput;
}

type TextFieldProps = ComponentProps<typeof Input> & {
    label: string;
    name: string;
    error?: string;
    description?: string;
};

function TextField({ label, name, error, description, ...props }: TextFieldProps) {
    return (
        <Field data-invalid={!!error}>
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
            <Input id={name} name={name} autoComplete="off" aria-invalid={!!error} {...props} />
            {description && <FieldDescription>{description}</FieldDescription>}
            {error && <FieldError>{error}</FieldError>}
        </Field>
    );
}

/* form */

type DeviceFormProps = {
    device: DeviceView | null;
    defaultColdStorageId: string;
    onCancel: () => void;
    onSuccess: (result: DeviceFormResult, device: DeviceView) => void;
};

function DeviceForm({ device, defaultColdStorageId, onCancel, onSuccess }: DeviceFormProps) {
    const create = useCreateDevice();
    const update = useUpdateDevice();
    const coldStorages = useColdStorages();

    const [coldStorageId, setColdStorageId] = useState(device?.coldStorageId ?? defaultColdStorageId);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const mutation = device ? update : create;
    const serverError = mutation.error;
    const serverFields = getServerFieldErrors(serverError);
    const errors = { ...serverFields, ...clientErrors };

    const hasFieldError = Object.keys(errors).some((field) => field !== "_root");
    const rootError = errors._root ?? (serverError && !hasFieldError ? getDeviceErrorMessage(serverError) : undefined);

    function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (mutation.isPending) return;

        const form = new FormData(event.currentTarget);
        const text = (key: string) => String(form.get(key) ?? "");
        const raw = {
            code: text("code"),
            name: text("name"),
            coldStorageId,
            pointLabel: text("pointLabel"),
            firmwareVersion: text("firmwareVersion"),
            defrostThreshold: text("defrostThreshold"),
            warningThreshold: text("warningThreshold"),
            criticalThreshold: text("criticalThreshold"),
            heartbeatIntervalSeconds: text("heartbeatIntervalSeconds"),
        };

        if (device) {
            // Validate the full form (so threshold order is checked), then send only the difference.
            const parsed = updateDeviceSchema.safeParse(raw);
            if (!parsed.success) return setClientErrors(toFieldErrors(parsed.error));
            setClientErrors({});

            const changes = getChanges(device, parsed.data, raw);
            if (Object.keys(changes).length === 0) return onCancel(); // nothing changed

            update.mutate({ id: device.id, input: changes }, { onSuccess: (saved) => onSuccess("updated", saved) });
        } else {
            const parsed = createDeviceSchema.safeParse(raw);
            if (!parsed.success) return setClientErrors(toFieldErrors(parsed.error));
            setClientErrors({});

            create.mutate(parsed.data, { onSuccess: (saved) => onSuccess("created", saved) });
        }
    }

    const disabled = mutation.isPending;

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
            <DialogHeader>
                <DialogTitle>{device ? "Edit Device" : "Add Device"}</DialogTitle>
                <DialogDescription>
                    {device ? "Update the device details." : "Enter the details of the new device."}
                </DialogDescription>
            </DialogHeader>

            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            label="Code"
                            name="code"
                            defaultValue={device?.code ?? ""}
                            error={errors.code}
                            disabled={!!device}
                        />
                        <TextField
                            label="Name"
                            name="name"
                            defaultValue={device?.name ?? ""}
                            error={errors.name}
                            disabled={disabled}
                        />
                    </div>

                    <Field data-invalid={!!errors.coldStorageId}>
                        <FieldLabel htmlFor="coldStorageId">Cold Room</FieldLabel>
                        <Select value={coldStorageId} onValueChange={setColdStorageId} disabled={disabled}>
                            <SelectTrigger id="coldStorageId" className="w-full" aria-invalid={!!errors.coldStorageId}>
                                <SelectValue
                                    placeholder={
                                        coldStorages.isPending ? "Loading cold rooms..." : "Select a cold room"
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {coldStorages.data?.map((coldStorage) => (
                                    <SelectItem key={coldStorage.id} value={coldStorage.id}>
                                        {`${coldStorage.name} · ${coldStorage.location}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {coldStorages.isError && (
                            <FieldError>Daftar cold room gagal dimuat: {coldStorages.error.message}</FieldError>
                        )}
                        {errors.coldStorageId && <FieldError>{errors.coldStorageId}</FieldError>}
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            label="Point (optional)"
                            description="Recommended for identifying the device's physical location."
                            name="pointLabel"
                            defaultValue={device?.pointLabel ?? ""}
                            error={errors.pointLabel}
                            disabled={disabled}
                        />
                        <TextField
                            label="Firmware Version (optional)"

                            name="firmwareVersion"
                            defaultValue={device?.firmwareVersion ?? ""}
                            error={errors.firmwareVersion}
                            disabled={disabled}
                        />
                    </div>

                    <ThresholdRuleAlert />

                    <div className="grid gap-4 sm:grid-cols-3">
                        <TextField
                            label="Defrost Threshold (°C)"
                            name="defrostThreshold"
                            type="number"
                            step="any"
                            inputMode="decimal"
                            placeholder="Optional"
                            defaultValue={device?.defrostThreshold ?? ""}
                            error={errors.defrostThreshold}
                            disabled={disabled}
                        />
                        <TextField
                            label="Warning Threshold (°C)"
                            name="warningThreshold"
                            type="number"
                            step="any"
                            inputMode="decimal"
                            defaultValue={device?.warningThreshold ?? ""}
                            error={errors.warningThreshold}
                            disabled={disabled}
                        />
                        <TextField
                            label="Critical Threshold (°C)"
                            name="criticalThreshold"
                            type="number"
                            step="any"
                            inputMode="decimal"
                            defaultValue={device?.criticalThreshold ?? ""}
                            error={errors.criticalThreshold}
                            disabled={disabled}
                        />
                    </div>

                    <TextField
                        label="Heartbeat Interval (seconds)"
                        description="This value does not change the device's reporting interval. If you modify the default value, make sure the device is configured with the same interval."
                        name="heartbeatIntervalSeconds"
                        type="number"
                        step={1}
                        inputMode="numeric"
                        defaultValue={device?.heartbeatIntervalSeconds ?? 30}
                        error={errors.heartbeatIntervalSeconds}
                        disabled={disabled}
                    />
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
