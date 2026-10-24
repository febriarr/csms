import type { LucideIcon } from "lucide-react";
import { Activity, ChartNoAxesCombined, LayoutDashboard, Settings } from "lucide-react";

export interface NavItem {
    title: string;
    path: string;
    icon?: LucideIcon;
    /** true = aktif hanya jika path persis sama (untuk Overview) */
    exact?: boolean;
    /** Jika ada, item ini hanya menjadi tombol buka/tutup, bukan link */
    children?: NavItem[];
}

export const navLinks: NavItem[] = [
    { title: "Overview", path: "/dashboard", icon: LayoutDashboard, exact: true },
    {
        title: "Monitoring",
        path: "/dashboard/monitoring",
        icon: Activity,
        children: [
            { title: "Live", path: "/dashboard/monitoring/live" },
            { title: "Alerts", path: "/dashboard/monitoring/alerts" },
            { title: "Monitoring Pauses", path: "/dashboard/monitoring/monitoring-pauses" },
        ],
    },
    {
        title: "Reports",
        path: "/dashboard/reports",
        icon: ChartNoAxesCombined,
        children: [
            { title: "Temperature History", path: "/dashboard/reports/temperature-history" },
            { title: "Device Diagnostic", path: "/dashboard/reports/device-diagnostic" },
            { title: "Notification Log", path: "/dashboard/reports/notification-log" },
        ],
    },
    {
        title: "Settings",
        path: "/dashboard/settings",
        icon: Settings,
        children: [
            {
                title: "Master Data",
                path: "/dashboard/settings/master-data",
                children: [
                    { title: "Division", path: "/dashboard/settings/master-data/division" },
                    { title: "Location", path: "/dashboard/settings/master-data/location" },
                    { title: "Cold Room", path: "/dashboard/settings/master-data/cold-room" },
                    { title: "Device", path: "/dashboard/settings/master-data/device" },
                ],
            },
            {
                title: "Notifications",
                path: "/dashboard/settings/notifications",
                children: [
                    {
                        title: "Notification Recipient",
                        path: "/dashboard/settings/notifications/notification-recipient",
                    },
                    {
                        title: "Notification Subscription",
                        path: "/dashboard/settings/notifications/notification-subscription",
                    },
                ],
            },
            { title: "Users", path: "/dashboard/settings/users" },
        ],
    },
];

/** Halaman pertama yang bisa dibuka dari sebuah item: turun lewat anak pertama sampai ketemu item tanpa anak. */
export function getFirstLeafPath(item: NavItem): string {
    const first = item.children?.[0];
    return first ? getFirstLeafPath(first) : item.path;
}

/**
 * Item yang hanya parent (punya children) tidak punya halaman sendiri. Daftar ini dipakai router untuk
 * me-redirect path parent ke halaman anak pertamanya, supaya crumb parent di breadcrumb bisa diklik.
 */
export function getParentRedirects(items: NavItem[] = navLinks): { path: string; to: string }[] {
    return items.flatMap((item) =>
        item.children?.length
            ? [{ path: item.path, to: getFirstLeafPath(item) }, ...getParentRedirects(item.children)]
            : []
    );
}
