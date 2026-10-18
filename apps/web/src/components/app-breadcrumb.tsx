import { ChevronLeft } from "lucide-react";
import { Fragment } from "react";
import { Link, useLocation } from "react-router";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { navLinks, type NavItem } from "./nav-links";
import { useBreadcrumbLabels } from "@/lib/breadcrumb-store";

/* indeks navLinks: path → judul & apakah punya anak */

const navIndex = new Map<string, { title: string; hasChildren: boolean }>();

(function index(items: NavItem[]) {
    for (const item of items) {
        navIndex.set(item.path, { title: item.title, hasChildren: !!item.children?.length });
        if (item.children) index(item.children);
    }
})(navLinks);

/** Judul untuk segmen yang tidak ada di navLinks (halaman aksi, dsb.) */
const extraTitles: Record<string, string> = {
    new: "Tambah",
    edit: "Ubah",
    profile: "Profil",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isIdSegment = (s: string) => UUID.test(s) || /^\d+$/.test(s);

const humanize = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/*  membangun daftar crumb  */

interface Crumb {
    path: string;
    /** null = segmen ID yang namanya belum diisi (tampilkan skeleton) */
    label: string | null;
    linkable: boolean;
}

function buildCrumbs(pathname: string, labels: Record<string, string>): Crumb[] {
    const segments = pathname.split("/").filter(Boolean);

    return segments.map((segment, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const nav = navIndex.get(path);

        if (labels[path]) return { path, label: labels[path], linkable: true };
        if (path === "/dashboard") return { path, label: "Dashboard", linkable: true };
        // parent yang punya anak = hanya teks, karena halamannya belum tentu ada
        if (nav) return { path, label: nav.title, linkable: !nav.hasChildren };
        if (isIdSegment(segment)) return { path, label: null, linkable: true };
        return { path, label: extraTitles[segment] ?? humanize(segment), linkable: true };
    });
}

export function AppBreadcrumb() {
    const { pathname } = useLocation();
    const labels = useBreadcrumbLabels();
    const crumbs = buildCrumbs(pathname, labels);

    if (crumbs.length === 0) return null;

    const current = crumbs[crumbs.length - 1];
    const backTarget = [...crumbs.slice(0, -1)].reverse().find((c) => c.linkable);

    return (
        <>
            {/* Mobile: tombol kembali + segmen terakhir */}
            <div className="flex min-w-0 items-center gap-1 md:hidden">
                {backTarget && (
                    <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
                        <Link
                            to={backTarget.path}
                            aria-label={`Kembali ke ${backTarget.label ?? "halaman sebelumnya"}`}
                        >
                            <ChevronLeft />
                        </Link>
                    </Button>
                )}
                <span className="truncate text-sm font-medium" aria-current="page">
                    {current.label ?? <Skeleton className="h-4 w-24" />}
                </span>
            </div>

            {/* Desktop: breadcrumb penuh */}
            <Breadcrumb className="hidden min-w-0 md:block">
                <BreadcrumbList className="flex-nowrap">
                    {crumbs.map((crumb, i) => {
                        const isLast = i === crumbs.length - 1;

                        return (
                            <Fragment key={crumb.path}>
                                <BreadcrumbItem className="min-w-0">
                                    {crumb.label === null ? (
                                        <Skeleton className="h-4 w-24" />
                                    ) : isLast ? (
                                        <BreadcrumbPage className="max-w-48 truncate">{crumb.label}</BreadcrumbPage>
                                    ) : crumb.linkable ? (
                                        <BreadcrumbLink asChild>
                                            <Link to={crumb.path} className="truncate">
                                                {crumb.label}
                                            </Link>
                                        </BreadcrumbLink>
                                    ) : (
                                        <span className="truncate text-muted-foreground">{crumb.label}</span>
                                    )}
                                </BreadcrumbItem>
                                {!isLast && <BreadcrumbSeparator />}
                            </Fragment>
                        );
                    })}
                </BreadcrumbList>
            </Breadcrumb>
        </>
    );
}
