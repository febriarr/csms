import { useState } from "react";
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

import { channelLabel } from "./constants";
import { getErrorMessage } from "@/lib/get-error-message";
import { useReplaceSubscriptions } from "./hooks";
import { getDraftsError, toDrafts, toPayload } from "./subscription-draft";
import { SubscriptionEditor } from "./subscription-editor";

type SubscriptionDialogProps = {
    /** null = closed */
    recipient: NotificationRecipientWithSubscriptions | null;
    onOpenChange: (open: boolean) => void;
    /** Called after the list was saved and refetched. The page closes the dialog and shows the toast. */
    onSaved: (recipient: NotificationRecipientWithSubscriptions) => void;
};

export function SubscriptionDialog({ recipient, onOpenChange, onSaved }: SubscriptionDialogProps) {
    return (
        <Dialog open={recipient !== null} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-none flex-col overflow-hidden md:max-w-2xl">
                {/* Mounted only while open, so the draft list and mutation state reset every time. */}
                {recipient && (
                    <SubscriptionForm recipient={recipient} onCancel={() => onOpenChange(false)} onSaved={onSaved} />
                )}
            </DialogContent>
        </Dialog>
    );
}

function SubscriptionForm({
    recipient,
    onCancel,
    onSaved,
}: {
    recipient: NotificationRecipientWithSubscriptions;
    onCancel: () => void;
    onSaved: (recipient: NotificationRecipientWithSubscriptions) => void;
}) {
    const save = useReplaceSubscriptions();
    const [drafts, setDrafts] = useState(() => toDrafts(recipient.subscriptions));
    const [clientError, setClientError] = useState<string | null>(null);

    const error = clientError ?? (save.error ? getErrorMessage(save.error) : undefined);

    function handleSave() {
        if (save.isPending) return;

        const draftError = getDraftsError(drafts);
        if (draftError) return setClientError(draftError);
        setClientError(null);

        save.mutate(
            { id: recipient.id, input: { subscriptions: toPayload(drafts) } },
            { onSuccess: (saved) => onSaved(saved) }
        );
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>Subscriptions</DialogTitle>
                <DialogDescription>
                    Alert dari area mana yang diterima{" "}
                    <span className="font-medium text-foreground">{recipient.name}</span> (
                    {channelLabel(recipient.channel)}). Tombol Save mengganti seluruh daftar saat ini.
                </DialogDescription>
            </DialogHeader>

            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                <SubscriptionEditor value={drafts} onChange={setDrafts} disabled={save.isPending} error={error} />
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={save.isPending}>
                    Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={save.isPending}>
                    {save.isPending && <Loader2 className="animate-spin" />}
                    {save.isPending ? "Saving..." : "Save"}
                </Button>
            </DialogFooter>
        </>
    );
}
