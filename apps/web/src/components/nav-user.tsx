import { ChevronsUpDown, LogOut, Monitor, Moon, Sun, UserIcon } from "lucide-react";
import { Link } from "react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@workspace/ui/components/sidebar";

import { useTheme } from "@/components/theme-provider";

// TODO: ganti dengan session Better Auth (authClient.useSession())
const dummyUser = {
    name: "Super Admin",
    username: "superadmin",
    role: "super_admin",
    image: "",
};

function getInitials(name: string) {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export function NavUser() {
    const { isMobile } = useSidebar();
    const { theme, setTheme } = useTheme();
    const user = dummyUser;

    const handleLogout = () => {
        // TODO: await authClient.signOut(); lalu navigate("/login")
        console.log("logout");
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            tooltip={user.name}
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <UserAvatar name={user.name} image={user.image} />
                            <UserInfo name={user.name} username={user.username} />
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        className="min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={8}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <UserAvatar name={user.name} image={user.image} />
                                <UserInfo name={user.name} username={user.username} />
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link to="/dashboard/profile">
                                    <UserIcon />
                                    Profile
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    {theme === "dark" ? <Moon /> : theme === "light" ? <Sun /> : <Monitor />}
                                    Theme
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuRadioGroup
                                        value={theme}
                                        onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
                                    >
                                        <DropdownMenuRadioItem value="light" onSelect={(e) => e.preventDefault()}>
                                            <Sun />
                                            Light
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="dark" onSelect={(e) => e.preventDefault()}>
                                            <Moon />
                                            Dark
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="system" onSelect={(e) => e.preventDefault()}>
                                            <Monitor />
                                            System
                                        </DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                    <DropdownMenuSeparator />
                                    <div className="px-2 py-1.5 font-mono text-xs text-muted-foreground">
                                        Press <kbd className="rounded bg-muted px-1">d</kbd> to toggle dark mode.
                                    </div>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                            <LogOut />
                            Sign Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

function UserAvatar({ name, image }: { name: string; image?: string }) {
    return (
        <Avatar className="size-8 rounded-lg">
            {image ? <AvatarImage src={image} alt={name} /> : null}
            <AvatarFallback className="rounded-lg">{getInitials(name)}</AvatarFallback>
        </Avatar>
    );
}

function UserInfo({ name, username }: { name: string; username: string }) {
    return (
        <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">@{username}</span>
        </div>
    );
}
