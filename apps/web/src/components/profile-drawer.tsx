import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@workspace/ui/components/drawer";

import { useAuth } from "@/modules/auth/auth.context";

const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
};

export function getInitials(name?: string | null) {
    return (name ?? "")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

interface ProfileDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/** Read-only profile info. Name and password are changed through their own dialogs. */
export function ProfileDrawer({ open, onOpenChange }: ProfileDrawerProps) {
    const { user } = useAuth();

    if (!user) return null;

    const username = user.username ?? user.email;

    return (
        <Drawer open={open} onOpenChange={onOpenChange} direction="right">
            <DrawerContent className="sm:max-w-sm">
                <DrawerHeader className="text-left">
                    <DrawerTitle>Profile</DrawerTitle>
                    <DrawerDescription>Youre account information.</DrawerDescription>
                </DrawerHeader>

                <div className="flex flex-col gap-6 px-4 pb-6">
                    <div className="flex flex-col items-center gap-2">
                        <Avatar className="size-20 rounded-xl">
                            {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
                            <AvatarFallback className="rounded-xl text-xl">{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-base font-medium">{user.name}</span>
                    </div>

                    <dl className="grid gap-4 text-sm">
                        <InfoRow label="Name" value={user.name} />
                        <InfoRow label="Username" value={`@${username}`} />
                        <InfoRow label="Role" value={roleLabels[user.role] ?? user.role} />
                    </dl>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1 border-b pb-3 last:border-b-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="wrap-break-words font-medium">{value}</dd>
        </div>
    );
}
