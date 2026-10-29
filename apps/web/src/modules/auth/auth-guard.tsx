import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation, type Location } from "react-router";

import { Button } from "@workspace/ui/components/button";

import { AuthShell } from "@/layouts/auth-layout";
import { useAuth } from "@/modules/auth/auth.context";
import { LoginSkeleton } from "@/modules/auth/auth.skeleton";

type LocationState = { from?: Location } | null;

/** Wrap every page that needs a signed-in user. */
export function RequireAuth() {
    const { status, error, refresh } = useAuth();
    const location = useLocation();

    if (status === "loading") {
        return (
            <div className="flex h-screen items-center justify-center" role="status" aria-label="Loading session">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-3 p-4 text-center">
                <p className="text-sm text-muted-foreground">{error?.message ?? "Could not verify your session."}</p>
                <Button variant="outline" onClick={() => void refresh()}>
                    Try again
                </Button>
            </div>
        );
    }

    if (status === "unauthenticated") {
        // Remember where the user was heading so login can send them back.
        return <Navigate to="/login" replace state={{ from: location } satisfies LocationState} />;
    }

    return <Outlet />;
}

/** Wrap pages only for signed-out users (login). Signed-in users are sent on to where they were heading. */
export function GuestOnly() {
    const { status } = useAuth();
    const location = useLocation();

    if (status === "loading") {
        return (
            <AuthShell>
                <LoginSkeleton />
            </AuthShell>
        );
    }

    if (status === "authenticated") {
        const from = (location.state as LocationState)?.from;
        const target = from ? `${from.pathname}${from.search}${from.hash}` : "/dashboard";
        return <Navigate to={target} replace />;
    }

    // "unauthenticated" and "error" both show the login form; a submit will surface the real problem.
    return <Outlet />;
}
