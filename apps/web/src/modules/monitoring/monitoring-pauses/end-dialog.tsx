import { useState, type SyntheticEvent } from "react";
import { Loader2 } from "lucide-react";

import type { MonitoringPauseView } from "@workspace/shared";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { endPauseSchema } from "@workspace/validator";

import { toFieldErrors } from "@/lib/form-errors";

import { pauseTargetName } from "./constants";
import { DateTimePicker } from "./date-time-picker";
import { getServerFieldErrors } from "./errors";
import { getErrorMessage } from "@/lib/get-error-message";
import { useEndPause } from "./hooks";

type EndPauseDialogProps = {
    /** null = closed */
    pause: MonitoringPauseView | null;
    onOpenChange: (open: boolean) => void;
    /** Called after the pause was ended and the list was refetched. The page closes the dialog and shows the toast. */
    onEnded: (pause: MonitoringPauseView) => void;
};

export function EndPauseDialog({ pause, onOpenChange, onEnded }: EndPauseDialogProps) {
    return (
        <Dialog open={pause !== null} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-none flex-col overflow-hidden md:max-w-md">
                {/* Mounted only while open, so the form and its mutation state reset every time. */}
                {pause && <EndPauseForm pause={pause} onCancel={() => onOpenChange(false)} onEnded={onEnded} />}
            </DialogContent>
        </Dialog>
    );
}

function EndPauseForm({
    pause,
    onCancel,
    onEnded,
}: {
    pause: MonitoringPauseView;
    onCancel: () => void;
    onEnded: (pause: MonitoringPauseView) => void;
}) {
    const end = useEndPause();
    const [endsAt, setEndsAt] = useState<Date | undefined>();
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const serverError = end.error;
    const errors = { ...getServerFieldErrors(serverError), ...clientErrors };

    const hasFieldError = Object.keys(errors).some((field) => field !== "_root");
    const rootError = errors._root ?? (serverError && !hasFieldError ? getErrorMessage(serverError) : undefined);

    function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (end.isPending) return;

        const form = new FormData(event.currentTarget);
        const note = String(form.get("note") ?? "").trim();

        // the server checks this too (it owns the stored row); this just answers without a round trip
        if (endsAt && endsAt.getTime() <= new Date(pause.startsAt).getTime()) {
            return setClientErrors({ endsAt: "Waktu selesai harus setelah waktu mulai." });
        }

        const parsed = endPauseSchema.safeParse({
            endsAt: endsAt?.toISOString(), // empty = end now (the server's default)
            note: note && note !== (pause.note ?? "") ? note : undefined, // only send a note that changed
        });
        if (!parsed.success) return setClientErrors(toFieldErrors(parsed.error));
        setClientErrors({});

        end.mutate({ id: pause.id, input: parsed.data }, { onSuccess: () => onEnded(pause) });
    }

    const disabled = end.isPending;

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
            <DialogHeader>
                <DialogTitle>End pause?</DialogTitle>
                <DialogDescription>
                    Pause untuk <span className="font-medium text-foreground">{pauseTargetName(pause)}</span> akan
                    diakhiri.
                    {pause.maxPulldownMinutes > 0 &&
                        ` Alert tetap ditahan sampai suhu turun di bawah batas warning, maksimal ${pause.maxPulldownMinutes} menit setelah waktu selesai.`}
                </DialogDescription>
            </DialogHeader>

            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                <FieldGroup>
                    <Field data-invalid={!!errors.endsAt}>
                        <FieldLabel htmlFor="endsAt">End time (optional)</FieldLabel>
                        <DateTimePicker
                            id="endsAt"
                            value={endsAt}
                            onChange={setEndsAt}
                            minDate={new Date(pause.startsAt)}
                            placeholder="Now"
                            disabled={disabled}
                            invalid={!!errors.endsAt}
                        />
                        <FieldDescription>Kosongkan untuk mengakhiri sekarang.</FieldDescription>
                        {errors.endsAt && <FieldError>{errors.endsAt}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.note}>
                        <FieldLabel htmlFor="note">Note (optional)</FieldLabel>
                        <Textarea
                            id="note"
                            name="note"
                            rows={3}
                            maxLength={500}
                            defaultValue={pause.note ?? ""}
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
                    {disabled ? "Ending..." : "End pause"}
                </Button>
            </DialogFooter>
        </form>
    );
}
