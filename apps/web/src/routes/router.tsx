import { GuestOnly, RequireAuth } from "@/modules/auth/auth-guard";
import { getParentRedirects } from "@/components/nav-links";
import AuthLayout, { AuthShell } from "@/layouts/auth-layout";
import LayoutDefault from "@/layouts/default";
import { LoginSkeleton } from "@/modules/auth/auth.skeleton";
import { createBrowserRouter, Navigate } from "react-router";

export const router = createBrowserRouter([
    {
        // Everything inside needs a signed-in user.
        element: <RequireAuth />,
        children: [
            {
                element: <LayoutDefault />,
                // Paths are absolute and identical to navLinks, so sidebar links, breadcrumbs and routes always match.
                children: [
                    { path: "/", element: <Navigate to="/dashboard" replace /> },
                    { path: "/dashboard", lazy: () => import("@/modules/overview/page") },

                    // Monitoring
                    {
                        path: "/dashboard/monitoring/live",
                        lazy: () => import("@/modules/monitoring/live/page"),
                    },
                    {
                        path: "/dashboard/monitoring/alerts",
                        lazy: () => import("@/modules/monitoring/alert/page"),
                    },
                    {
                        path: "/dashboard/monitoring/monitoring-pauses",
                        lazy: () => import("@/modules/monitoring/monitoring-pauses/page"),
                    },

                    // Reports
                    {
                        path: "/dashboard/reports/temperature-history",
                        lazy: () => import("@/modules/reports/temperature-history/page"),
                    },
                    {
                        path: "/dashboard/reports/device-diagnostic",
                        lazy: () => import("@/modules/reports/device-diagnostic/page"),
                    },
                    {
                        path: "/dashboard/reports/notification-log",
                        lazy: () => import("@/modules/reports/notification-log/page"),
                    },

                    // Settings
                    {
                        path: "/dashboard/settings/master-data/division",
                        lazy: () => import("@/modules/settings/master-data/division/page"),
                    },
                    {
                        path: "/dashboard/settings/master-data/location",
                        lazy: () => import("@/modules/settings/master-data/location/page"),
                    },
                    {
                        path: "/dashboard/settings/master-data/cold-room",
                        lazy: () => import("@/modules/settings/master-data/cold-room/page"),
                    },
                    {
                        path: "/dashboard/settings/master-data/device",
                        lazy: () => import("@/modules/settings/master-data/device/page"),
                    },

                    {
                        path: "/dashboard/settings/users",
                        lazy: () => import("@/modules/settings/users/page"),
                    },
                    {
                        path: "/dashboard/settings/notifications",
                        lazy: () => import("@/modules/settings/notification/page"),
                    },

                    // Parent menus (Settings, Master Data, ...) have no page of their own: send them to their
                    // first child so their breadcrumb link doesn't land on a 404.
                    ...getParentRedirects().map(({ path, to }) => ({
                        path,
                        element: <Navigate to={to} replace />,
                    })),
                ],
            },
        ],
    },
    {
        // Signed-in users are redirected away from the login page.
        element: <GuestOnly />,
        children: [
            {
                element: <AuthLayout />,
                hydrateFallbackElement: (
                    <AuthShell>
                        <LoginSkeleton />
                    </AuthShell>
                ),
                children: [{ path: "/login", lazy: () => import("@/modules/auth/page") }],
            },
        ],
    },
]);
