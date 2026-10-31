import { Link } from "react-router";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@workspace/ui/components/sidebar";

import logoWhite from "@/assets/logo-white.svg";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "./nav-user";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to="/dashboard">
                                <div className="flex aspect-square size-8 items-center justify-center">
                                    <img src={logoWhite} alt="" className="size-full object-contain" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">CSMS</span>
                                    <span className="truncate text-xs">Cold Storage Monitoring System</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
