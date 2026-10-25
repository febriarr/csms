import { useMemo, useState, type FormEvent } from "react";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { ErrorCode, type ColdStorage, type ErrorResponse, type ListColdStorage } from "@workspace/shared";
import { createColdStorageSchema, updateColdStorageSchema } from "@workspace/validator";
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
import { useLocations } from "@/modules/settings/master-data/location/hooks";

import { useColdStorages, useCreateColdStorage, useDeleteColdStorage, useUpdateColdStorage } from "./hooks";

const ALL = "all";

/** Maps backend error codes to (Indonesian) messages; falls back to whatever the backend said. */
function getErrorMessage(error: ErrorResponse): string {
    switch (error.code) {
        case ErrorCode.COLD_STORAGE_NAME_TAKEN:
            return "Nama cold room sudah digunakan.";
        case ErrorCode.REFERENCE_NOT_FOUND:
            return "Lokasi yang dipilih tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.RESOURCE_IN_USE:
            return "Cold room masih dipakai dan tidak bisa dihapus.";
        case ErrorCode.ENTITY_NOT_FOUND:
        case ErrorCode.NOT_FOUND:
            return "Cold room tidak ditemukan. Mungkin sudah dihapus.";
        case ErrorCode.FORBIDDEN:
            return "Anda tidak memiliki akses untuk aksi ini.";
        default:
            return error.message;
    }
}

type DialogState = { mode: "create" } | { mode: "edit"; coldStorage: ListColdStorage } | null;

export function Component() {
    const [search, setSearch] = useState("");
    const [divisionFilter, setDivisionFilter] = useState(ALL);
    const [locationFilter, setLocationFilter] = useState(ALL);
    const [dialog, setDialog] = useState<DialogState>(null);
    const [deleting, setDeleting] = useState<ListColdStorage | null>(null);

    const debouncedSearch = useDebounced(search.trim());
    const query = useMemo(
        () => ({
            search: debouncedSearch || undefined,
            divisionId: divisionFilter === ALL ? undefined : divisionFilter,
            locationId: locationFilter === ALL ? undefined : locationFilter,
        }),
        [debouncedSearch, divisionFilter, locationFilter]
    );

    const coldStorages = useColdStorages(query);
    const divisions = useDivisions();
    // Location filter options depend on the selected division.
    const filterLocations = useLocations({ divisionId: divisionFilter === ALL ? undefined : divisionFilter });

    const isFiltered = Object.values(query).some((value) => value !== undefined);

    return (
        <>
            <title>Cold Room</title>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="font-heading text-xl font-semibold">Cold Rooms</h1>
                        <p className="text-sm text-muted-foreground">Manage the cold rooms at each location.</p>
                    </div>
                    <Button onClick={() => setDialog({ mode: "create" })}>
                        <Plus />
                        Add Cold Room
                    </Button>
                </div>

                <div className="flex flex-col gap-2 lg:flex-row">
                    <InputGroup className="flex-1">
                        <InputGroupInput
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search cold rooms..."
                            aria-label="Search cold rooms"
                        />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>
                    <Select
                        value={divisionFilter}
                        onValueChange={(value) => {
                            setDivisionFilter(value);
                            setLocationFilter(ALL); // the old location may not belong to the new division
                        }}
                    >
                        <SelectTrigger className="w-full lg:w-52" aria-label="Filter by division">
                            <SelectValue placeholder="All divisions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All divisions</SelectItem>
                            {divisions.data?.map((division) => (
                                <SelectItem key={division.id} value={division.id}>
                                    {division.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                        <SelectTrigger className="w-full lg:w-52" aria-label="Filter by location">
                            <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All locations</SelectItem>
                            {filterLocations.data?.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                    {location.name}
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
                                <TableHead>Location</TableHead>
                                <TableHead className="hidden md:table-cell">Description</TableHead>
                                <TableHead className="w-28 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {coldStorages.isPending &&
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

                            {coldStorages.isError && (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center">
                                        <p className="mb-3 text-sm text-muted-foreground">
                                            {coldStorages.error.message}
                                        </p>
                                        <Button variant="outline" size="sm" onClick={() => void coldStorages.refetch()}>
                                            Retry
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )}

                            {coldStorages.isSuccess && coldStorages.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                                        {isFiltered
                                            ? "Tidak ada cold room yang cocok dengan filter."
                                            : "Belum ada cold room."}
                                    </TableCell>
                                </TableRow>
                            )}

                            {coldStorages.isSuccess &&
                                coldStorages.data.map((coldStorage) => (
                                    <TableRow key={coldStorage.id}>
                                        <TableCell className="font-medium">{coldStorage.name}</TableCell>
                                        <TableCell>{coldStorage.location}</TableCell>
                                        <TableCell className="hidden max-w-sm truncate text-muted-foreground md:table-cell">
                                            {coldStorage.description ?? "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Edit ${coldStorage.name}`}
                                                onClick={() => setDialog({ mode: "edit", coldStorage })}
                                            >
                                                <Pencil />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Delete ${coldStorage.name}`}
                                                onClick={() => setDeleting(coldStorage)}
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
                            <ColdStorageForm
                                coldStorage={dialog.mode === "edit" ? dialog.coldStorage : null}
                                defaultLocationId={locationFilter === ALL ? "" : locationFilter}
                                onDone={() => setDialog(null)}
                            />
                        )}
                    </DialogContent>
                </Dialog>

                <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
                    <AlertDialogContent>
                        {deleting && (
                            <DeleteColdStorageContent coldStorage={deleting} onDone={() => setDeleting(null)} />
                        )}
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </>
    );
}

function ColdStorageForm({
    coldStorage,
    defaultLocationId,
    onDone,
}: {
    coldStorage: ColdStorage | null;
    /** Pre-selects the location currently used as the list filter (create only). */
    defaultLocationId: string;
    onDone: () => void;
}) {
    const create = useCreateColdStorage();
    const update = useUpdateColdStorage();
    const locations = useLocations();
    const divisions = useDivisions();

    const [locationId, setLocationId] = useState(coldStorage?.locationId ?? defaultLocationId);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const divisionNames = useMemo(
        () => new Map<string, string>(divisions.data?.map((division) => [division.id, division.name] as const)),
        [divisions.data]
    );

    const mutation = coldStorage ? update : create;
    const serverError = mutation.error;

    const nameError =
        clientErrors.name ??
        getFieldError(serverError, "name") ??
        (serverError?.code === ErrorCode.COLD_STORAGE_NAME_TAKEN ? getErrorMessage(serverError) : undefined);
    const locationError =
        clientErrors.locationId ??
        getFieldError(serverError, "locationId") ??
        (serverError?.code === ErrorCode.REFERENCE_NOT_FOUND ? getErrorMessage(serverError) : undefined);
    const descriptionError = clientErrors.description ?? getFieldError(serverError, "description");
    const rootError =
        clientErrors._root ??
        (serverError && !nameError && !locationError && !descriptionError ? getErrorMessage(serverError) : undefined);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (mutation.isPending) return;

        const form = new FormData(event.currentTarget);
        const raw = {
            locationId,
            name: String(form.get("name") ?? ""),
            description: String(form.get("description") ?? ""),
        };

        if (coldStorage) {
            const parsed = updateColdStorageSchema.safeParse(raw);
            if (!parsed.success) return setClientErrors(toFieldErrors(parsed.error));
            setClientErrors({});

            const data = parsed.data;
            const unchanged =
                data.locationId === coldStorage.locationId &&
                data.name === coldStorage.name &&
                (data.description ?? null) === coldStorage.description;
            if (unchanged) return onDone();

            update.mutate({ id: coldStorage.id, input: data }, { onSuccess: onDone });
        } else {
            const parsed = createColdStorageSchema.safeParse(raw);
            if (!parsed.success) return setClientErrors(toFieldErrors(parsed.error));
            setClientErrors({});
            create.mutate(parsed.data, { onSuccess: onDone });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
                <DialogTitle>{coldStorage ? "Edit Cold Room" : "Add Cold Room"}</DialogTitle>
                <DialogDescription>
                    {coldStorage ? "Update the cold room details." : "Enter the details of the new cold room."}
                </DialogDescription>
            </DialogHeader>

            <FieldGroup>
                <Field data-invalid={!!locationError}>
                    <FieldLabel htmlFor="locationId">Location</FieldLabel>
                    <Select value={locationId} onValueChange={setLocationId} disabled={mutation.isPending}>
                        <SelectTrigger id="locationId" className="w-full" aria-invalid={!!locationError}>
                            <SelectValue
                                placeholder={locations.isPending ? "Loading locations..." : "Select a location"}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {locations.data?.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                    {location.name}
                                    {divisionNames.has(location.divisionId) && (
                                        <span className="text-muted-foreground">
                                            {" "}
                                            · {divisionNames.get(location.divisionId)}
                                        </span>
                                    )}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {locations.isError && (
                        <FieldError>Daftar lokasi gagal dimuat: {locations.error.message}</FieldError>
                    )}
                    {locationError && <FieldError>{locationError}</FieldError>}
                </Field>

                <Field data-invalid={!!nameError}>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                        id="name"
                        name="name"
                        autoComplete="off"
                        defaultValue={coldStorage?.name ?? ""}
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
                        defaultValue={coldStorage?.description ?? ""}
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

function DeleteColdStorageContent({ coldStorage, onDone }: { coldStorage: ColdStorage; onDone: () => void }) {
    const remove = useDeleteColdStorage();

    return (
        <>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete cold room?</AlertDialogTitle>
                <AlertDialogDescription>
                    <span className="font-medium text-foreground">{coldStorage.name}</span> will be permanently deleted.
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
                        remove.mutate(coldStorage.id, { onSuccess: onDone });
                    }}
                >
                    {remove.isPending && <Loader2 className="animate-spin" />}
                    {remove.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </>
    );
}
