import { Loader2 } from "lucide-react";

import type { MonitoringPauseView } from "@workspace/shared";
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

import { pauseTargetName } from "./constants";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDeletePause } from "./hooks";

type DeletePauseDialogProps = {
    /** null = closed */
    pause: MonitoringPauseView | null;
    onOpenChange: (open: boolean) => void;
    /** Called after the pause was deleted and the list was refetched. The page closes the dialog and shows the toast. */
    onDeleted: (pause: MonitoringPauseView) => void;
};

export function DeletePauseDialog({ pause, onOpenChange, onDeleted }: DeletePauseDialogProps) {
    return (
        <AlertDialog open={pause !== null} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                {/* Mounted only while open, so the mutation state resets every time. */}
                {pause && <DeletePauseContent pause={pause} onDeleted={onDeleted} />}
            </AlertDialogContent>
        </AlertDialog>
    );
}

function consequence(pause: MonitoringPauseView): string {
    switch (pause.timeline) {
        case "SCHEDULED":
            return "Jadwal pause ini akan dibatalkan.";
        case "ACTIVE":
            return "Pause sedang berjalan: alert akan aktif kembali seketika dan riwayatnya hilang. Gunakan End pause jika riwayat perlu disimpan.";
        case "ENDED":
            return "Riwayat pause ini akan dihapus permanen.";
    }
}

function DeletePauseContent({
    pause,
    onDeleted,
}: {
    pause: MonitoringPauseView;
    onDeleted: (pause: MonitoringPauseView) => void;
}) {
    const remove = useDeletePause();
    const isSchedule = pause.timeline === "SCHEDULED";

    return (
        <>
            <AlertDialogHeader>
                <AlertDialogTitle>{isSchedule ? "Cancel scheduled pause?" : "Delete pause?"}</AlertDialogTitle>
                <AlertDialogDescription>
                    <span className="font-medium text-foreground">{pauseTargetName(pause)}</span>. {consequence(pause)}{" "}
                    Aksi ini tidak dapat dibatalkan.
                </AlertDialogDescription>
            </AlertDialogHeader>

            {remove.error && <FieldError>{getErrorMessage(remove.error)}</FieldError>}

            <AlertDialogFooter>
                <AlertDialogCancel disabled={remove.isPending}>Back</AlertDialogCancel>
                <AlertDialogAction
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={(event) => {
                        // Keep the dialog open until the request finishes so errors stay visible.
                        event.preventDefault();
                        remove.mutate(pause.id, { onSuccess: () => onDeleted(pause) });
                    }}
                >
                    {remove.isPending && <Loader2 className="animate-spin" />}
                    {remove.isPending ? "Deleting..." : isSchedule ? "Cancel schedule" : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </>
    );
}
