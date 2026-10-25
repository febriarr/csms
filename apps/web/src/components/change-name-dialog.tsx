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
import { updateProfileInput } from "@workspace/validator";

import { useUpdateProfile } from "@/modules/auth/hooks";

interface ChangeNameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentName: string;
}

export function ChangeNameDialog({ open, onOpenChange, currentName }: ChangeNameDialogProps) {
    const [name, setName] = useState(currentName);
    const [validationError, setValidationError] = useState<string | null>(null);
    const updateProfile = useUpdateProfile();

    // Start from the current name each time the dialog opens.
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setName(currentName);
            setValidationError(null);
            updateProfile.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, currentName]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (updateProfile.isPending) return;

        const parsed = updateProfileInput.safeParse({ name });
        if (!parsed.success) {
            setValidationError(parsed.error.issues[0]?.message ?? "Input tidak valid");
            return;
        }

        setValidationError(null);
        updateProfile.mutate(parsed.data, { onSuccess: () => onOpenChange(false) });
    };

    const error = validationError ?? updateProfile.error?.message;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>Change Name</DialogTitle>
                        <DialogDescription>
                            This name appears on the dashboard. The username does not change.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label htmlFor="change-name">Name</Label>
                        <Input
                            id="change-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                            autoFocus
                            aria-invalid={!!error}
                        />
                        {error && (
                            <p role="alert" className="text-xs text-destructive">
                                {error}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateProfile.isPending}>
                            {updateProfile.isPending && <Loader2 className="animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
