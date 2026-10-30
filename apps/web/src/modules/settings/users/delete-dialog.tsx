import { Loader2 } from "lucide-react";

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

import { getErrorMessage } from "@/lib/get-error-message";
import { useDeleteUser } from "./hooks";
import type { UserListItem } from "./user.type";

type DeleteUserDialogProps = {
    /** null = closed */
    user: UserListItem | null;
    onOpenChange: (open: boolean) => void;
    /** Called after the user was deleted and the list was refetched. The page closes the dialog and shows the toast. */
    onDeleted: (user: UserListItem) => void;
};

export function DeleteUserDialog({ user, onOpenChange, onDeleted }: DeleteUserDialogProps) {
    return (
        <AlertDialog open={user !== null} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                {/* Mounted only while open, so the mutation state resets every time. */}
                {user && <DeleteUserContent user={user} onDeleted={onDeleted} />}
            </AlertDialogContent>
        </AlertDialog>
    );
}

function DeleteUserContent({ user, onDeleted }: { user: UserListItem; onDeleted: (user: UserListItem) => void }) {
    const remove = useDeleteUser();

    return (
        <>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete user?</AlertDialogTitle>
                <AlertDialogDescription>
                    <span className="font-medium text-foreground">
                        {user.name} (@{user.displayUsername || user.username})
                    </span>{" "}
                    will be deleted and signed out from every device. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>

            {remove.error && <FieldError>{getErrorMessage(remove.error)}</FieldError>}

            <AlertDialogFooter>
                <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={(event) => {
                        // Keep the dialog open until the request finishes so errors stay visible.
                        event.preventDefault();
                        remove.mutate(user.id, { onSuccess: () => onDeleted(user) });
                    }}
                >
                    {remove.isPending && <Loader2 className="animate-spin" />}
                    {remove.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </>
    );
}
