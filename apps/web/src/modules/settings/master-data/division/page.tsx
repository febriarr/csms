import { useState, type FormEvent } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { ErrorCode, type Division, type ErrorResponse } from "@workspace/shared";
import { createDivisionSchema, updateDivisionSchema } from "@workspace/validator";
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
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

import { getFieldError } from "@/lib/api-error";
import { toFieldErrors } from "@/lib/form-errors";

import { useCreateDivision, useDeleteDivision, useDivisions, useUpdateDivision } from "./hooks";

/** Maps backend error codes to messages; falls back to whatever the backend said. */
function getErrorMessage(error: ErrorResponse): string {
    switch (error.code) {
        case ErrorCode.DIVISION_NAME_TAKEN:
            return "Nama divisi sudah digunakan.";
        case ErrorCode.RESOURCE_IN_USE:
            return "Divisi masih dipakai dan tidak bisa dihapus.";
        case ErrorCode.ENTITY_NOT_FOUND:
        case ErrorCode.NOT_FOUND:
            return "Divisi tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.FORBIDDEN:
            return "Anda tidak memiliki akses untuk aksi ini.";
        default:
            return error.message;
    }
}

type DialogState = { mode: "create" } | { mode: "edit"; division: Division } | null;

export function Component() {
    const divisions = useDivisions();
    const [dialog, setDialog] = useState<DialogState>(null);
    const [deleting, setDeleting] = useState<Division | null>(null);

    return (
        <>
            <title>Division</title>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="font-heading text-xl font-semibold">Divisions</h1>
                        <p className="text-sm text-muted-foreground">Manage the list of divisions.</p>
                    </div>
                    <Button onClick={() => setDialog({ mode: "create" })}>
                        <Plus />
                        Add Division
                    </Button>
                </div>

                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">No</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="w-28 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {divisions.isPending &&
                                Array.from({ length: 3 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Skeleton className="h-4 w-6" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-48" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="ml-auto h-8 w-20" />
                                        </TableCell>
                                    </TableRow>
                                ))}

                            {divisions.isError && (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-8 text-center">
                                        <p className="mb-3 text-sm text-muted-foreground">{divisions.error.message}</p>
                                        <Button variant="outline" size="sm" onClick={() => void divisions.refetch()}>
                                            Retry
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )}

                            {divisions.isSuccess && divisions.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                                        Belum ada divisi.
                                    </TableCell>
                                </TableRow>
                            )}

                            {divisions.isSuccess &&
                                divisions.data.map((division, index) => (
                                    <TableRow key={division.id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell className="font-medium">{division.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Edit ${division.name}`}
                                                onClick={() => setDialog({ mode: "edit", division })}
                                            >
                                                <Pencil />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Delete ${division.name}`}
                                                onClick={() => setDeleting(division)}
                                            >
                                                <Trash2 className="text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </div>

                <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
                    <DialogContent>
                        {/* Mounted only while open, so the form and its mutation state reset every time. */}
                        {dialog && (
                            <DivisionForm
                                division={dialog.mode === "edit" ? dialog.division : null}
                                onDone={() => setDialog(null)}
                            />
                        )}
                    </DialogContent>
                </Dialog>

                <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
                    <AlertDialogContent>
                        {deleting && <DeleteDivisionContent division={deleting} onDone={() => setDeleting(null)} />}
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </>
    );
}

function DivisionForm({ division, onDone }: { division: Division | null; onDone: () => void }) {
    const create = useCreateDivision();
    const update = useUpdateDivision();
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const mutation = division ? update : create;
    const serverError = mutation.error;

    const nameError =
        clientErrors.name ??
        getFieldError(serverError, "name") ??
        (serverError?.code === ErrorCode.DIVISION_NAME_TAKEN ? getErrorMessage(serverError) : undefined);
    const rootError = clientErrors._root ?? (serverError && !nameError ? getErrorMessage(serverError) : undefined);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (mutation.isPending) return;

        const raw = { name: String(new FormData(event.currentTarget).get("name") ?? "") };

        if (division) {
            const parsed = updateDivisionSchema.safeParse(raw);
            if (!parsed.success) return setClientErrors(toFieldErrors(parsed.error));
            setClientErrors({});
            if (parsed.data.name === division.name) return onDone(); // nothing changed
            update.mutate({ id: division.id, input: parsed.data }, { onSuccess: onDone });
        } else {
            const parsed = createDivisionSchema.safeParse(raw);
            if (!parsed.success) return setClientErrors(toFieldErrors(parsed.error));
            setClientErrors({});
            create.mutate(parsed.data, { onSuccess: onDone });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
                <DialogTitle>{division ? "Edit Division" : "Add Division"}</DialogTitle>
                <DialogDescription>
                    {division ? "Update the division name." : "Enter the name of the new division."}
                </DialogDescription>
            </DialogHeader>

            <FieldGroup>
                <Field data-invalid={!!nameError}>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                        id="name"
                        name="name"
                        autoFocus
                        autoComplete="off"
                        defaultValue={division?.name ?? ""}
                        disabled={mutation.isPending}
                        aria-invalid={!!nameError}
                    />
                    {nameError && <FieldError>{nameError}</FieldError>}
                </Field>
            </FieldGroup>

            {rootError && <FieldError>{rootError}</FieldError>}

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onDone} disabled={mutation.isPending}>
                    Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending && <Loader2 className="animate-spin" />}
                    {mutation.isPending ? "Saving..." : "Save"}
                </Button>
            </DialogFooter>
        </form>
    );
}

function DeleteDivisionContent({ division, onDone }: { division: Division; onDone: () => void }) {
    const remove = useDeleteDivision();

    return (
        <>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete division?</AlertDialogTitle>
                <AlertDialogDescription>
                    <span className="font-medium text-foreground">{division.name}</span> will be permanently deleted.
                    This action cannot be undone.
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
                        remove.mutate(division.id, { onSuccess: onDone });
                    }}
                >
                    {remove.isPending && <Loader2 className="animate-spin" />}
                    {remove.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </>
    );
}
