import { useState, type ComponentProps, type SyntheticEvent } from "react";
import { Loader2 } from "lucide-react";

import type { NotificationRecipientWithSubscriptions } from "@workspace/shared";
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
import {
    createNotificationRecipientSchema,
    NOTIFICATION_CHANNELS,
    updateNotificationRecipientSchema,
    type NotificationChannel,
    type UpdateNotificationRecipientInput,
} from "@workspace/validator";

import { toFieldErrors } from "@/lib/form-errors";
import { useDivisions } from "@/modules/settings/master-data/division/hooks";

import { channelLabel } from "./constants";
import { getNotificationErrorMessage, getServerFieldErrors } from "./errors";
import { useCreateRecipient, useUpdateRecipient } from "./hooks";
import { getDraftsError, toPayload, type DraftSubscription } from "./subscription-draft";
import { SubscriptionEditor } from "./subscription-editor";

export type RecipientFormResult = "created" | "updated";

const NONE = "none";

/* dialog wrapper */

type RecipientFormDialogProps = {
    open: boolean;
    /** null = create */
    recipient: NotificationRecipientWithSubscriptions | null;
    onOpenChange: (open: boolean) => void;
    /** Called after the recipient was saved and the list was refetched. The page closes the dialog and shows the toast. */
    onSuccess: (result: RecipientFormResult, recipient: NotificationRecipientWithSubscriptions) => void;
};

export function RecipientFormDialog({ open, recipient, onOpenChange, onSuccess }: RecipientFormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={`flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-none flex-col overflow-hidden ${
                    recipient ? "md:max-w-xl" : "md:max-w-2xl"
                }`}
            >
                {/* Mounted only while open, so the form and its mutation state reset every time. */}
                {open && (
                    <RecipientForm recipient={recipient} onCancel={() => onOpenChange(false)} onSuccess={onSuccess} />
                )}
            </DialogContent>
        </Dialog>
    );
}

/* helpers */

const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

/** PATCH only what changed. Subscriptions are never part of an update (they have their own dialog). */
function getChanges(
    recipient: NotificationRecipientWithSubscriptions,
    data: UpdateNotificationRecipientInput
): UpdateNotificationRecipientInput {
    const changes: Record<string, unknown> = {};

    for (const key of ["name", "channel", "target", "divisionId", "isActive"] as const) {
        if (data[key] !== undefined && !same(data[key], recipient[key])) changes[key] = data[key];
    }

    return changes as UpdateNotificationRecipientInput;
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

type RecipientFormProps = {
    recipient: NotificationRecipientWithSubscriptions | null;
    onCancel: () => void;
    onSuccess: (result: RecipientFormResult, recipient: NotificationRecipientWithSubscriptions) => void;
};

function RecipientForm({ recipient, onCancel, onSuccess }: RecipientFormProps) {
    const create = useCreateRecipient();
    const update = useUpdateRecipient();
    const divisions = useDivisions();

    const [channel, setChannel] = useState<NotificationChannel>(recipient?.channel ?? NOTIFICATION_CHANNELS[0]);
    const [divisionId, setDivisionId] = useState(recipient?.divisionId ?? NONE);
    const [isActive, setIsActive] = useState(recipient?.isActive ?? true);
    const [drafts, setDrafts] = useState<DraftSubscription[]>([]);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const mutation = recipient ? update : create;
    const serverError = mutation.error;
    const errors = { ...getServerFieldErrors(serverError), ...clientErrors };

    const hasFieldError = Object.keys(errors).some((field) => field !== "_root");
    const rootError =
        errors._root ?? (serverError && !hasFieldError ? getNotificationErrorMessage(serverError) : undefined);

    function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (mutation.isPending) return;

        const form = new FormData(event.currentTarget);
        const text = (key: string) => String(form.get(key) ?? "");
        const raw = {
            name: text("name"),
            channel,
            target: text("target").trim(),
            divisionId: divisionId === NONE ? null : divisionId,
        };

        if (recipient) {
            // Validate the full form (so the target is checked against the channel), then send only the difference.
            const parsed = updateNotificationRecipientSchema.safeParse({ ...raw, isActive });
            if (!parsed.success) return setClientErrors(toFieldErrors(parsed.error));
            setClientErrors({});

            const changes = getChanges(recipient, parsed.data);
            if (Object.keys(changes).length === 0) return onCancel(); // nothing changed

            update.mutate({ id: recipient.id, input: changes }, { onSuccess: (saved) => onSuccess("updated", saved) });
        } else {
            const parsed = createNotificationRecipientSchema.safeParse({
                ...raw,
                subscriptions: toPayload(drafts),
            });
            const found = parsed.success ? {} : toFieldErrors(parsed.error);
            const draftError = getDraftsError(drafts);
            if (draftError) found.subscriptions = draftError;

            if (!parsed.success || draftError) return setClientErrors(found);
            setClientErrors({});

            create.mutate(parsed.data, { onSuccess: (saved) => onSuccess("created", saved) });
        }
    }

    const disabled = mutation.isPending;

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
            <DialogHeader>
                <DialogTitle>{recipient ? "Edit Recipient" : "Add Recipient"}</DialogTitle>
                <DialogDescription>
                    {recipient
                        ? "Update the recipient details. Subscriptions are managed separately."
                        : "Enter the details of the new recipient and, optionally, the areas they receive alerts from."}
                </DialogDescription>
            </DialogHeader>

            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            label="Name"
                            name="name"
                            defaultValue={recipient?.name ?? ""}
                            error={errors.name}
                            disabled={disabled}
                        />

                        <Field data-invalid={!!errors.divisionId}>
                            <FieldLabel htmlFor="divisionId">Division (optional)</FieldLabel>
                            <Select value={divisionId} onValueChange={setDivisionId} disabled={disabled}>
                                <SelectTrigger id="divisionId" className="w-full" aria-invalid={!!errors.divisionId}>
                                    <SelectValue
                                        placeholder={divisions.isPending ? "Loading divisions..." : "No division"}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE}>No division</SelectItem>
                                    {divisions.data?.map((division) => (
                                        <SelectItem key={division.id} value={division.id}>
                                            {division.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldDescription>
                                Hanya informasi organisasi, tidak menentukan alert yang diterima.
                            </FieldDescription>
                            {errors.divisionId && <FieldError>{errors.divisionId}</FieldError>}
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                        <Field data-invalid={!!errors.channel}>
                            <FieldLabel htmlFor="channel">Channel</FieldLabel>
                            <Select
                                value={channel}
                                onValueChange={(value) => setChannel(value as NotificationChannel)}
                                disabled={disabled}
                            >
                                <SelectTrigger id="channel" className="w-full" aria-invalid={!!errors.channel}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {NOTIFICATION_CHANNELS.map((item) => (
                                        <SelectItem key={item} value={item}>
                                            {channelLabel(item)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.channel && <FieldError>{errors.channel}</FieldError>}
                        </Field>

                        <TextField
                            label={channel === "EMAIL" ? "Email" : "WhatsApp Number"}
                            name="target"
                            placeholder={channel === "EMAIL" ? "nama@perusahaan.com" : "628123456789"}
                            description={
                                channel === "EMAIL"
                                    ? "Disimpan dalam huruf kecil."
                                    : "Format internasional tanpa tanda +, diawali 62."
                            }
                            defaultValue={recipient?.target ?? ""}
                            error={errors.target}
                            disabled={disabled}
                        />
                    </div>

                    {recipient && (
                        <Field>
                            <FieldLabel htmlFor="status">Status</FieldLabel>
                            <Select
                                value={isActive ? "active" : "inactive"}
                                onValueChange={(value) => setIsActive(value === "active")}
                                disabled={disabled}
                            >
                                <SelectTrigger id="status" className="w-full sm:w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            <FieldDescription>Penerima nonaktif tidak dikirimi alert.</FieldDescription>
                        </Field>
                    )}

                    {!recipient && (
                        <Field>
                            <FieldLabel>Subscriptions (optional)</FieldLabel>
                            <SubscriptionEditor
                                value={drafts}
                                onChange={setDrafts}
                                disabled={disabled}
                                error={errors.subscriptions}
                            />
                        </Field>
                    )}
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
