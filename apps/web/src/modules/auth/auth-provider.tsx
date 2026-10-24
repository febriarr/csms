import { useEffect, useMemo, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { setUnauthorizedHandler } from "@/lib/http-client";

import { AuthContext, type AuthContextValue, type AuthStatus } from "./auth.context";
import { clearSession, useSession } from "./hooks";

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const { data, error, isPending, isError, refetch } = useSession();

    // Any API call that answers 401 means the session is gone: drop it and the guards redirect to /login.
    useEffect(() => setUnauthorizedHandler(() => clearSession(queryClient)), [queryClient]);

    const value = useMemo<AuthContextValue>(() => {
        // Cached user wins, so a failed background refetch doesn't kick a signed-in user out.
        let status: AuthStatus;
        if (data) status = "authenticated";
        else if (isPending) status = "loading";
        else if (isError) status = "error";
        else status = "unauthenticated";

        return {
            status,
            user: data ?? null,
            error: status === "error" ? error : null,
            isAuthenticated: status === "authenticated",
            refresh: () => refetch(),
        };
    }, [data, error, isPending, isError, refetch]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
