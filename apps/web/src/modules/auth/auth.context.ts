import { createContext, useContext } from "react";

import type { ErrorResponse, User } from "@workspace/shared";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

export type AuthContextValue = {
    status: AuthStatus;
    user: User | null;
    /** Set when status is "error" (the session could not be checked, e.g. the server is down). */
    error: ErrorResponse | null;
    isAuthenticated: boolean;
    /** Re-checks the session with the server. */
    refresh: () => Promise<unknown>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
    return context;
}

/** For code that only renders when signed in (inside <RequireAuth>), so the user is never null. */
export function useAuthUser(): User {
    const { user } = useAuth();
    if (!user) throw new Error("useAuthUser must be used inside <RequireAuth>.");
    return user;
}
