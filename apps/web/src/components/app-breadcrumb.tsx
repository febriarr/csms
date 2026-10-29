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

/* indeks navLinks: path → judul */

const navTitles = new Map<string, string>();

(function index(items: NavItem[]) {
    for (const item of items) {
        navTitles.set(item.path, item.title);
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
}

/**
 * Semua crumb kecuali yang terakhir adalah link. Path parent di navLinks (Settings, Master Data, ...) tidak punya
 * halaman sendiri, jadi router me-redirect-nya ke halaman anak pertama (lihat getParentRedirects).
 */
function buildCrumbs(pathname: string, labels: Record<string, string>): Crumb[] {
    const segments = pathname.split("/").filter(Boolean);

    return segments.map((segment, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");

        if (labels[path]) return { path, label: labels[path] };
        if (path === "/dashboard") return { path, label: "Dashboard" };

        const title = navTitles.get(path);
        if (title) return { path, label: title };

        if (isIdSegment(segment)) return { path, label: null };
        return { path, label: extraTitles[segment] ?? humanize(segment) };
    });
}

export function AppBreadcrumb() {
    const { pathname } = useLocation();
    const labels = useBreadcrumbLabels();
    const crumbs = buildCrumbs(pathname, labels);

    if (crumbs.length === 0) return null;

    const current = crumbs[crumbs.length - 1]!;
    const backTarget = crumbs.length > 1 ? crumbs[crumbs.length - 2] : undefined;

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
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link to={crumb.path} className="truncate">
                                                {crumb.label}
                                            </Link>
                                        </BreadcrumbLink>
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
