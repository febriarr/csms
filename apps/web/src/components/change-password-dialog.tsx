import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { changePasswordInput } from "@workspace/validator";

import { useChangePassword } from "@/modules/auth/hooks";

interface ChangePasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const emptyForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
    const [form, setForm] = useState(emptyForm);
    const [validationError, setValidationError] = useState<string | null>(null);
    const changePassword = useChangePassword();

    // Never keep passwords around between openings.
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setForm(emptyForm);
            setValidationError(null);
            changePassword.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const setField = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (changePassword.isPending) return;

        const parsed = changePasswordInput.safeParse({
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
        });
        if (!parsed.success) {
            setValidationError(parsed.error.issues[0]?.message ?? "Input tidak valid");
            return;
        }
        if (form.newPassword !== form.confirmPassword) {
            setValidationError("Konfirmasi password tidak sama");
            return;
        }

        setValidationError(null);
        changePassword.mutate(parsed.data, { onSuccess: () => onOpenChange(false) });
    };

    const error = validationError ?? changePassword.error?.message;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                            Once the password is changed, other devices will be automatically logged out. This device
                            will remain logged in.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                            id="current-password"
                            type="password"
                            value={form.currentPassword}
                            onChange={setField("currentPassword")}
                            autoComplete="current-password"
                            autoFocus
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={form.newPassword}
                            onChange={setField("newPassword")}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={form.confirmPassword}
                            onChange={setField("confirmPassword")}
                            autoComplete="new-password"
                        />
                    </div>

                    {error && (
                        <p role="alert" className="text-xs text-destructive">
                            {error}
                        </p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={changePassword.isPending}>
                            {changePassword.isPending && <Loader2 className="animate-spin" />}
                            Change Password
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
