import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";

import { DetailSections, type DetailSection } from "@/components/detail-sections";
import { formatDateTime } from "@/lib/format-date-time";

import { roleLabels } from "./constants";
import type { UserListItem } from "./user.type";

function getSections(user: UserListItem): DetailSection[] {
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
                            <DetailSections sections={getSections(user)} idPrefix="view-user" />
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
