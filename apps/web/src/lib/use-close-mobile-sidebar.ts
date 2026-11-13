import { useSidebar } from "@workspace/ui/components/sidebar";

export function useCloseMobileSidebar() {
    const { isMobile, setOpenMobile } = useSidebar();

    return () => {
        if (isMobile) setOpenMobile(false);
    };
}
