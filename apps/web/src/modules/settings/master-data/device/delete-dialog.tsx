import { Loader2 } from "lucide-react";

import type { DeviceView } from "@workspace/shared";
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

import { getDeviceErrorMessage } from "./errors";
import { useDeleteDevice } from "./hooks";

type DeleteDeviceDialogProps = {
    /** null = closed */
    device: DeviceView | null;
    onOpenChange: (open: boolean) => void;
    /** Called after the device was deleted and the list was refetched. The page closes the dialog and shows the toast. */
    onDeleted: (device: DeviceView) => void;
};

export function DeleteDeviceDialog({ device, onOpenChange, onDeleted }: DeleteDeviceDialogProps) {
    return (
        <AlertDialog open={device !== null} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                {/* Mounted only while open, so the mutation state resets every time. */}
                {device && <DeleteDeviceContent device={device} onDeleted={onDeleted} />}
            </AlertDialogContent>
        </AlertDialog>
    );
}

function DeleteDeviceContent({ device, onDeleted }: { device: DeviceView; onDeleted: (device: DeviceView) => void }) {
    const remove = useDeleteDevice();

    return (
        <>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete device?</AlertDialogTitle>
                <AlertDialogDescription>
                    <span className="font-medium text-foreground">
                        {device.name} ({device.code})
                    </span>{" "}
                    will be deleted. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>

            {remove.error && <FieldError>{getDeviceErrorMessage(remove.error)}</FieldError>}

            <AlertDialogFooter>
                <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={(event) => {
                        // Keep the dialog open until the request finishes so errors stay visible.
                        event.preventDefault();
                        remove.mutate(device.id, { onSuccess: () => onDeleted(device) });
                    }}
                >
                    {remove.isPending && <Loader2 className="animate-spin" />}
                    {remove.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </>
    );
}
