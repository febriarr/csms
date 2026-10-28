import { Outlet } from "react-router";

import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar";

import { AppSidebar } from "@/components/app-sidebar";
import HeaderDashboard from "@/components/header";

export default function LayoutDefault() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-w-0">
                <HeaderDashboard />
                <div className="mt-(--header-height) min-h-screen flex-1 p-4 pb-24">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
