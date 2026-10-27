import { Loader2 } from "lucide-react";

import type { NotificationRecipientWithSubscriptions } from "@workspace/shared";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { FieldError } from "@workspace/ui/components/field";

import { getNotificationErrorMessage } from "./errors";
import { useDeleteRecipient } from "./hooks";

type DeleteRecipientDialogProps = {
    /** null = closed */
    recipient: NotificationRecipientWithSubscriptions | null;
    onOpenChange: (open: boolean) => void;
    /** Called after the recipient was deleted and the list was refetched. The page closes the dialog and shows the toast. */
    onDeleted: (recipient: NotificationRecipientWithSubscriptions) => void;
};

export function DeleteRecipientDialog({ recipient, onOpenChange, onDeleted }: DeleteRecipientDialogProps) {
    return (
        <AlertDialog open={recipient !== null} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                {/* Mounted only while open, so the mutation state resets every time. */}
                {recipient && <DeleteRecipientContent recipient={recipient} onDeleted={onDeleted} />}
            </AlertDialogContent>
        </AlertDialog>
    );
}

function DeleteRecipientContent({
    recipient,
    onDeleted,
}: {
    recipient: NotificationRecipientWithSubscriptions;
    onDeleted: (recipient: NotificationRecipientWithSubscriptions) => void;
}) {
    const remove = useDeleteRecipient();

    return (
        <>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete recipient?</AlertDialogTitle>
                <AlertDialogDescription>
                    <span className="font-medium text-foreground">
                        {recipient.name} ({recipient.target})
                    </span>{" "}
                    akan dihapus beserta seluruh langganannya dan tidak akan menerima alert lagi. Aksi ini tidak dapat
                    dibatalkan.
                </AlertDialogDescription>
            </AlertDialogHeader>

            {remove.error && <FieldError>{getNotificationErrorMessage(remove.error)}</FieldError>}

            <AlertDialogFooter>
                <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={(event) => {
                        // Keep the dialog open until the request finishes so errors stay visible.
                        event.preventDefault();
                        remove.mutate(recipient.id, { onSuccess: () => onDeleted(recipient) });
                    }}
                >
                    {remove.isPending && <Loader2 className="animate-spin" />}
                    {remove.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </>
    );
}
