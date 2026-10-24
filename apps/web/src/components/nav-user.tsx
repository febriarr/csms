import { ChevronsUpDown, Loader2, LogOut, Monitor, Moon, Sun, UserIcon } from "lucide-react";
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
import { useAuth } from "@/modules/auth/auth.context";
import { useLogout } from "@/modules/auth/hooks";

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
    const { user } = useAuth();
    const logout = useLogout();

    // Right after logout the session is cleared a moment before <RequireAuth> redirects to /login.
    if (!user) return null;

    const username = user.username ?? user.email;

    const handleLogout = (event: Event) => {
        // Keep the menu open while the request runs so the loading state and any error stay visible.
        event.preventDefault();
        if (logout.isPending) return;
        // On success the session cache is cleared and <RequireAuth> redirects to /login.
        logout.mutate();
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
                            <UserInfo name={user.name} username={username} />
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
                                <UserInfo name={user.name} username={username} />
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
                        <DropdownMenuItem variant="destructive" disabled={logout.isPending} onSelect={handleLogout}>
                            {logout.isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
                            {logout.isPending ? "Signing out..." : "Sign Out"}
                        </DropdownMenuItem>
                        {logout.error && (
                            <p role="alert" className="px-2 pb-1.5 text-xs text-destructive">
                                {logout.error.message}
                            </p>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

function UserAvatar({ name, image }: { name: string; image?: string | null }) {
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
