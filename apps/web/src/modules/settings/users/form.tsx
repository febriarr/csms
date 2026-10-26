import { useState, type ComponentProps, type SyntheticEvent } from "react";
import { Loader2 } from "lucide-react";

import type { UserRole } from "@workspace/shared";
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
import { createUserInput, updateRoleInput, updateUserInput, userRoles } from "@workspace/validator";

import { toFieldErrors } from "@/lib/form-errors";

import { roleLabels } from "./constants";
import { getServerFieldErrors, getUserErrorMessage } from "./errors";
import { useCreateUser, useUpdateUser } from "./hooks";
import type { UserChanges } from "./user.api";
import type { UserListItem } from "./user.type";

export type UserFormResult = "created" | "updated";

/* dialog wrapper */

type UserFormDialogProps = {
    open: boolean;
    /** null = create */
    user: UserListItem | null;
    onOpenChange: (open: boolean) => void;
    /** Called after the user was saved and the list was refetched. The page closes the dialog and shows the toast. */
    onSuccess: (result: UserFormResult, name: string) => void;
};

export function UserFormDialog({ open, user, onOpenChange, onSuccess }: UserFormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-none flex-col overflow-hidden md:max-w-md">
                {/* Mounted only while open, so the form and its mutation state reset every time. */}
                {open && <UserForm user={user} onCancel={() => onOpenChange(false)} onSuccess={onSuccess} />}
            </DialogContent>
        </Dialog>
    );
}

/* helpers */

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

type UserFormProps = {
    user: UserListItem | null;
    onCancel: () => void;
    onSuccess: (result: UserFormResult, name: string) => void;
};

function UserForm({ user, onCancel, onSuccess }: UserFormProps) {
    const create = useCreateUser();
    const update = useUpdateUser();

    const [role, setRole] = useState<UserRole>(user?.role ?? "admin");
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const mutation = user ? update : create;
    const serverError = mutation.error;
    const serverFields = getServerFieldErrors(serverError);
    const errors = { ...serverFields, ...clientErrors };

    const hasFieldError = Object.keys(errors).some((field) => field !== "_root");
    const rootError = errors._root ?? (serverError && !hasFieldError ? getUserErrorMessage(serverError) : undefined);

    function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (mutation.isPending) return;

        const form = new FormData(event.currentTarget);
        const text = (key: string) => String(form.get(key) ?? "");

        if (user) {
            // Edit: only the role and the (optional) new password can change. Send just what changed.
            const password = text("password");
            const changes: UserChanges = {};
            const found: Record<string, string> = {};

            if (role !== user.role) {
                const parsed = updateRoleInput.safeParse({ role });
                if (parsed.success) changes.role = parsed.data.role;
                else Object.assign(found, toFieldErrors(parsed.error));
            }

            if (password) {
                const parsed = updateUserInput.safeParse({ password });
                if (parsed.success) changes.password = parsed.data.password;
                else Object.assign(found, toFieldErrors(parsed.error));
            }

            if (Object.keys(found).length > 0) return setClientErrors(found);
            setClientErrors({});

            if (!changes.role && !changes.password) return onCancel(); // nothing changed

            update.mutate({ id: user.id, changes }, { onSuccess: () => onSuccess("updated", user.name) });
        } else {
            const parsed = createUserInput.safeParse({
                name: text("name"),
                username: text("username"),
                password: text("password"),
                role,
            });
            if (!parsed.success) return setClientErrors(toFieldErrors(parsed.error));
            setClientErrors({});

            create.mutate(parsed.data, { onSuccess: (saved) => onSuccess("created", saved.name) });
        }
    }

    const disabled = mutation.isPending;

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
            <DialogHeader>
                <DialogTitle>{user ? "Edit User" : "Add User"}</DialogTitle>
                <DialogDescription>
                    {user
                        ? "Change the role or set a new password. Name and username cannot be changed here."
                        : "Enter the details of the new user. They sign in with the username."}
                </DialogDescription>
            </DialogHeader>

            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                <FieldGroup>
                    <TextField
                        label="Name"
                        name="name"
                        defaultValue={user?.name ?? ""}
                        error={errors.name}
                        disabled={!!user || disabled}
                    />
                    <TextField
                        label="Username"
                        name="username"
                        defaultValue={user ? user.displayUsername || user.username : ""}
                        error={errors.username}
                        disabled={!!user || disabled}
                    />

                    <Field data-invalid={!!errors.role}>
                        <FieldLabel htmlFor="role">Role</FieldLabel>
                        <Select value={role} onValueChange={(value) => setRole(value as UserRole)} disabled={disabled}>
                            <SelectTrigger id="role" className="w-full" aria-invalid={!!errors.role}>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {userRoles.map((value) => (
                                    <SelectItem key={value} value={value}>
                                        {roleLabels[value]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.role && <FieldError>{errors.role}</FieldError>}
                    </Field>

                    <TextField
                        label={user ? "New Password (optional)" : "Password"}
                        description={
                            user
                                ? "Leave empty to keep the current password. A new password signs the user out from every device."
                                : undefined
                        }
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        error={errors.password}
                        disabled={disabled}
                    />
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
