import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link, matchPath, useLocation } from "react-router";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from "@workspace/ui/components/sidebar";

import { navLinks, type NavItem } from "./nav-links";

/** untuk halaman detail, misal /device/123 tetap menandai /device */
function isPathActive(pathname: string, path: string, exact = false) {
    return matchPath({ path, end: exact }, pathname) !== null;
}

/** Item ini atau salah satu turunannya sedang aktif */
function isBranchActive(pathname: string, item: NavItem): boolean {
    if (item.children) return item.children.some((c) => isBranchActive(pathname, c));
    return isPathActive(pathname, item.path, item.exact);
}

function useAutoOpen(branchActive: boolean) {
    const [open, setOpen] = useState(branchActive);
    const [prevActive, setPrevActive] = useState(branchActive);

    if (branchActive !== prevActive) {
        setPrevActive(branchActive);
        if (branchActive) setOpen(true);
    }

    return [open, setOpen] as const;
}

export function NavMain() {
    const { pathname } = useLocation();

    return (
        <SidebarGroup>
            <SidebarMenu>
                {navLinks.map((item) =>
                    item.children ? (
                        <NavParent key={item.path} item={item} pathname={pathname} />
                    ) : (
                        <NavLeaf key={item.path} item={item} pathname={pathname} />
                    )
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}

/** Level 1 tanpa anak: link biasa */
function NavLeaf({ item, pathname }: { item: NavItem; pathname: string }) {
    const active = isPathActive(pathname, item.path, item.exact);

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                <Link to={item.path} aria-current={active ? "page" : undefined}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

/** Level 1 dengan anak: trigger buka/tutup (atau dropdown saat sidebar jadi ikon) */
function NavParent({ item, pathname }: { item: NavItem; pathname: string }) {
    const { state, isMobile } = useSidebar();
    const children = item.children ?? [];
    const branchActive = isBranchActive(pathname, item);

    const [open, setOpen] = useAutoOpen(branchActive);

    const isIconMode = state === "collapsed" && !isMobile;

    if (isIconMode) {
        return (
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton isActive={branchActive} tooltip={item.title}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="min-w-48">
                        <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {children.map((child) => (
                            <DropdownEntry key={child.path} item={child} pathname={pathname} />
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        );
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible" asChild>
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} className={branchActive ? "font-medium" : undefined}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub className="mr-0 pr-0">
                        {children.map((child) => (
                            <SubItem key={child.path} item={child} pathname={pathname} />
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}

/** Level 2 dan 3 (rekursif): link, atau sub-parent yang bisa dibuka/tutup */
function SubItem({ item, pathname }: { item: NavItem; pathname: string }) {
    const branchActive = isBranchActive(pathname, item);
    const [open, setOpen] = useAutoOpen(branchActive);

    if (!item.children) {
        const active = isPathActive(pathname, item.path, item.exact);
        return (
            <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild isActive={active}>
                    <Link to={item.path} aria-current={active ? "page" : undefined}>
                        <span>{item.title}</span>
                    </Link>
                </SidebarMenuSubButton>
            </SidebarMenuSubItem>
        );
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="group/subcollapsible" asChild>
            <SidebarMenuSubItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuSubButton asChild className={branchActive ? "font-medium" : undefined}>
                        <button type="button" className="w-full cursor-pointer">
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/subcollapsible:rotate-90" />
                        </button>
                    </SidebarMenuSubButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub className="mr-0 pr-0">
                        {item.children.map((child) => (
                            <SubItem key={child.path} item={child} pathname={pathname} />
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuSubItem>
        </Collapsible>
    );
}

/** Isi dropdown saat sidebar menciut: link, atau sub-menu untuk level 3 */
function DropdownEntry({ item, pathname }: { item: NavItem; pathname: string }) {
    if (item.children) {
        const branchActive = isBranchActive(pathname, item);
        return (
            <DropdownMenuSub>
                <DropdownMenuSubTrigger className={branchActive ? "bg-accent font-medium" : undefined}>
                    {item.title}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-48">
                    {item.children.map((child) => (
                        <DropdownEntry key={child.path} item={child} pathname={pathname} />
                    ))}
                </DropdownMenuSubContent>
            </DropdownMenuSub>
        );
    }

    const active = isPathActive(pathname, item.path, item.exact);
    return (
        <DropdownMenuItem asChild className={active ? "bg-accent font-medium" : undefined}>
            <Link to={item.path} aria-current={active ? "page" : undefined}>
                {item.title}
            </Link>
        </DropdownMenuItem>
    );
}
