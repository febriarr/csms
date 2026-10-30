import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger, useSidebar } from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";

import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Button } from "@workspace/ui/components/button";
import { CircleQuestionMark } from "lucide-react";
import { useAuth } from "@/modules/auth/auth.context";
import { WhatsappDialog, WhatsappStatusButton } from "./whatsapp-dialog";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";

export default function HeaderDashboard() {
    const { state } = useSidebar();
    const { user } = useAuth();
    const [whatsappOpen, setWhatsappOpen] = useState(false);

    const isSuperAdmin = user?.role === "super_admin";

    return (
        <header
            className={cn(
                "fixed top-0 z-50 flex h-(--header-height) w-full items-center justify-between gap-2 border-b bg-background px-4",
                "transition-[width] duration-200 ease-linear",
                state === "expanded"
                    ? "md:w-[calc(100%-var(--sidebar-width))]"
                    : "md:w-[calc(100%-var(--sidebar-width-icon))]"
            )}
        >
            <div className="flex min-w-0 items-center gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <SidebarTrigger className="shrink-0" />
                    </TooltipTrigger>

                    <TooltipContent className="flex items-center gap-2">
                        <span>Collapse sidebar</span>
                        <kbd className="rounded border border-background/20 bg-background/10 px-1.5 py-0.5 text-[10px] font-medium text-background">
                            ⌘ B
                        </kbd>
                    </TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="data-[orientation=vertical]:h-6" />
                <AppBreadcrumb />
            </div>

            <div className="flex shrink-0 items-center gap-1">
                {/* Mounted only for super_admin, so other roles never call GET /whatsapp/status (403). */}
                {isSuperAdmin && (
                    <>
                        <WhatsappStatusButton onClick={() => setWhatsappOpen(true)} />
                        <WhatsappDialog open={whatsappOpen} onOpenChange={setWhatsappOpen} />
                    </>
                )}

                <Button size={"icon-sm"} variant={"ghost"}>
                    <CircleQuestionMark size={8} className="shrink-0" />
                </Button>
            </div>
        </header>
    );
}
