import AuthLayout, { AuthShell } from "@/layouts/auth-layout";
import LayoutDefault from "@/layouts/default";
import { LoginSkeleton } from "@/modules/auth/auth.skeleton";
import { createBrowserRouter, Navigate } from "react-router";

export const router = createBrowserRouter([
    {
        element: <LayoutDefault />,
        children: [
            {
                path: "/",
                element: <Navigate to={"/dashboard"} replace />,
            },
            {
                path: "/dashboard",
                lazy: () => import("@/App"),
            },
        ],
    },
    {
        element: <AuthLayout />,
        hydrateFallbackElement: (
            <AuthShell>
                <LoginSkeleton />
            </AuthShell>
        ),
        children: [{ path: "/login", lazy: () => import("@/modules/auth/page") }],
    },
]);
