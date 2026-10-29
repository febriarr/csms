import { useMemo, useState, type SyntheticEvent } from "react";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { ErrorCode, type ErrorResponse, type Location } from "@workspace/shared";
import { createLocationSchema, updateLocationSchema } from "@workspace/validator";
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";

import { getFieldError } from "@/lib/api-error";
import { toFieldErrors } from "@/lib/form-errors";
import { useDebounced } from "@/lib/use-debounced";
import { useDivisions } from "@/modules/settings/master-data/division/hooks";

import { useCreateLocation, useDeleteLocation, useLocations, useUpdateLocation } from "./hooks";

const ALL_DIVISIONS = "all";

/** Maps backend error codes to messages; falls back to whatever the backend said. */
function getErrorMessage(error: ErrorResponse): string {
    switch (error.code) {
        case ErrorCode.LOCATION_NAME_TAKEN:
            return "Nama lokasi sudah digunakan.";
        case ErrorCode.REFERENCE_NOT_FOUND:
            return "Divisi yang dipilih tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.RESOURCE_IN_USE:
            return "Lokasi masih dipakai dan tidak bisa dihapus.";
        case ErrorCode.ENTITY_NOT_FOUND:
        case ErrorCode.NOT_FOUND:
            return "Lokasi tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.FORBIDDEN:
            return "Anda tidak memiliki akses untuk aksi ini.";
        default:
            return error.message;
    }
}

type DialogState = { mode: "create" } | { mode: "edit"; location: Location } | null;

export function Component() {
    const [search, setSearch] = useState("");
    const [divisionFilter, setDivisionFilter] = useState(ALL_DIVISIONS);
    const [dialog, setDialog] = useState<DialogState>(null);
    const [deleting, setDeleting] = useState<Location | null>(null);

    const debouncedSearch = useDebounced(search.trim());
    const query = useMemo(
        () => ({
            search: debouncedSearch || undefined,
            divisionId: divisionFilter === ALL_DIVISIONS ? undefined : divisionFilter,
        }),
        [debouncedSearch, divisionFilter]
    );

    const locations = useLocations(query);
    const divisions = useDivisions();
    const divisionNames = useMemo(
        () => new Map<string, string>(divisions.data?.map((division) => [division.id, division.name] as const)),
        [divisions.data]
    );

    const isFiltered = query.search !== undefined || query.divisionId !== undefined;

    return (
        <>
            <title>Location</title>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="font-heading text-xl font-semibold">Locations</h1>
                        <p className="text-sm text-muted-foreground">Manage the locations in each division.</p>
                    </div>
                    <Button onClick={() => setDialog({ mode: "create" })}>
                        <Plus />
                        Add Location
                    </Button>
                </div>

                <div className="flex max-w-sm flex-col gap-2 sm:flex-row">
                    <InputGroup className="flex-1">
                        <InputGroupInput
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search locations..."
                            aria-label="Search locations"
                        />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>
                    <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                        <SelectTrigger aria-label="Filter by division">
                            <SelectValue placeholder="All divisions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_DIVISIONS}>All divisions</SelectItem>
                            {divisions.data?.map((division) => (
                                <SelectItem key={division.id} value={division.id}>
                                    {division.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="wrapper-table">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Division</TableHead>
                                <TableHead className="hidden md:table-cell">Description</TableHead>
                                <TableHead className="w-28 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {locations.isPending &&
                                Array.from({ length: 3 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Skeleton className="h-4 w-40" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-28" />
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Skeleton className="h-4 w-56" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="ml-auto h-8 w-20" />
                                        </TableCell>
                                    </TableRow>
                                ))}

                            {locations.isError && (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center">
                                        <p className="mb-3 text-sm text-muted-foreground">{locations.error.message}</p>
                                        <Button variant="outline" size="sm" onClick={() => void locations.refetch()}>
                                            Retry
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )}

                            {locations.isSuccess && locations.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                                        {isFiltered
                                            ? "Tidak ada lokasi yang cocok dengan filter."
                                            : "Belum ada lokasi."}
                                    </TableCell>
                                </TableRow>
                            )}

                            {locations.isSuccess &&
                                locations.data.map((location) => (
                                    <TableRow key={location.id}>
                                        <TableCell className="font-medium">{location.name}</TableCell>
                                        <TableCell>
                                            {divisionNames.get(location.divisionId) ??
                                                (divisions.isPending ? <Skeleton className="h-4 w-24" /> : "-")}
                                        </TableCell>
                                        <TableCell className="hidden max-w-sm truncate text-muted-foreground md:table-cell">
                                            {location.description ?? "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Edit ${location.name}`}
                                                onClick={() => setDialog({ mode: "edit", location })}
                                            >
                                                <Pencil />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Delete ${location.name}`}
                                                onClick={() => setDeleting(location)}
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
                            <LocationForm
                                location={dialog.mode === "edit" ? dialog.location : null}
                                defaultDivisionId={divisionFilter === ALL_DIVISIONS ? "" : divisionFilter}
                                onDone={() => setDialog(null)}
                            />
                        )}
                    </DialogContent>
                </Dialog>

                <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
                    <AlertDialogContent>
                        {deleting && <DeleteLocationContent location={deleting} onDone={() => setDeleting(null)} />}
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </>
    );
}

function LocationForm({
    location,
    defaultDivisionId,
    onDone,
}: {
    location: Location | null;
    /** Pre-selects the division currently used as the list filter (create only). */
    defaultDivisionId: string;
    onDone: () => void;
}) {
    const create = useCreateLocation();
    const update = useUpdateLocation();
    const divisions = useDivisions();

    const [divisionId, setDivisionId] = useState(location?.divisionId ?? defaultDivisionId);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const mutation = location ? update : create;
    const serverError = mutation.error;

    const nameError =
        clientErrors.name ??
        getFieldError(serverError, "name") ??
        (serverError?.code === ErrorCode.LOCATION_NAME_TAKEN ? getErrorMessage(serverError) : undefined);
    const divisionError =
        clientErrors.divisionId ??
        getFieldError(serverError, "divisionId") ??
        (serverError?.code === ErrorCode.REFERENCE_NOT_FOUND ? getErrorMessage(serverError) : undefined);
    const descriptionError = clientErrors.description ?? getFieldError(serverError, "description");
    const rootError =
        clientErrors._root ??
        (serverError && !nameError && !divisionError && !descriptionError ? getErrorMessage(serverError) : undefined);

    function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (mutation.isPending) return;

        const form = new FormData(event.currentTarget);
        const raw = {
            divisionId,
            name: String(form.get("name") ?? ""),
            description: String(form.get("description") ?? ""),
        };

        if (location) {
            const parsed = updateLocationSchema.safeParse(raw);
            if (!parsed.success) return setClientErrors(toFieldErrors(parsed.error));
            setClientErrors({});

            const data = parsed.data;
            const unchanged =
                data.divisionId === location.divisionId &&
                data.name === location.name &&
                (data.description ?? null) === location.description;
            if (unchanged) return onDone();

            update.mutate({ id: location.id, input: data }, { onSuccess: onDone });
        } else {
            const parsed = createLocationSchema.safeParse(raw);
            if (!parsed.success) return setClientErrors(toFieldErrors(parsed.error));
            setClientErrors({});
            create.mutate(parsed.data, { onSuccess: onDone });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
                <DialogTitle>{location ? "Edit Location" : "Add Location"}</DialogTitle>
                <DialogDescription>
                    {location ? "Update the location details." : "Enter the details of the new location."}
                </DialogDescription>
            </DialogHeader>

            <FieldGroup>
                <Field data-invalid={!!divisionError}>
                    <FieldLabel htmlFor="divisionId">Division</FieldLabel>
                    <Select value={divisionId} onValueChange={setDivisionId} disabled={mutation.isPending}>
                        <SelectTrigger id="divisionId" className="w-full" aria-invalid={!!divisionError}>
                            <SelectValue
                                placeholder={divisions.isPending ? "Loading divisions..." : "Select a division"}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {divisions.data?.map((division) => (
                                <SelectItem key={division.id} value={division.id}>
                                    {division.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {divisions.isError && (
                        <FieldError>Daftar divisi gagal dimuat: {divisions.error.message}</FieldError>
                    )}
                    {divisionError && <FieldError>{divisionError}</FieldError>}
                </Field>

                <Field data-invalid={!!nameError}>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                        id="name"
                        name="name"
                        autoComplete="off"
                        defaultValue={location?.name ?? ""}
                        disabled={mutation.isPending}
                        aria-invalid={!!nameError}
                    />
                    {nameError && <FieldError>{nameError}</FieldError>}
                </Field>

                <Field data-invalid={!!descriptionError}>
                    <FieldLabel htmlFor="description">Description (optional)</FieldLabel>
                    <Textarea
                        id="description"
                        name="description"
                        rows={3}
                        defaultValue={location?.description ?? ""}
                        disabled={mutation.isPending}
                        aria-invalid={!!descriptionError}
                    />
                    {descriptionError && <FieldError>{descriptionError}</FieldError>}
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

function DeleteLocationContent({ location, onDone }: { location: Location; onDone: () => void }) {
    const remove = useDeleteLocation();

    return (
        <>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete location?</AlertDialogTitle>
                <AlertDialogDescription>
                    <span className="font-medium text-foreground">{location.name}</span> will be permanently deleted.
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
                        remove.mutate(location.id, { onSuccess: onDone });
                    }}
                >
                    {remove.isPending && <Loader2 className="animate-spin" />}
                    {remove.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </>
    );
}
