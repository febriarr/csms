import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import { formatDateTime } from "@/lib/format-date-time";

import { roleLabels } from "./constants";
import type { UserListItem } from "./user.type";

type Entry = [label: string, value: string];
type Section = { title: string; entries: Entry[] };

function getSections(user: UserListItem): Section[] {
    return [
        {
            title: "General",
            entries: [
                ["ID", user.id],
                ["Name", user.name],
                ["Username", `@${user.displayUsername || user.username}`],
                ["Role", roleLabels[user.role] ?? user.role],
                ["Status", user.banned ? "Banned" : "Active"],
            ],
        },
        {
            title: "Record",
            entries: [["Created at", formatDateTime(user.createdAt)]],
        },
    ];
}

type UserViewDialogProps = {
    /** null = closed */
    user: UserListItem | null;
    onOpenChange: (open: boolean) => void;
};

export function UserViewDialog({ user, onOpenChange }: UserViewDialogProps) {
    return (
        <Dialog open={user !== null} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-none flex-col overflow-hidden md:max-w-xl">
                {user && (
                    <>
                        <DialogHeader>
                            <DialogTitle>User Details</DialogTitle>
                            <DialogDescription>Read-only details of {user.name}.</DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-6 overflow-y-auto">
                            {getSections(user).map((section) => (
                                <section key={section.title} className="flex flex-col gap-3">
                                    <h3 className="text-sm font-medium">{section.title}</h3>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {section.entries.map(([label, value]) => {
                                            const id = `view-user-${label.toLowerCase().replace(/\W+/g, "-")}`;
                                            return (
                                                <Field key={label}>
                                                    <FieldLabel htmlFor={id}>{label}</FieldLabel>
                                                    <Input id={id} value={value} disabled />
                                                </Field>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
