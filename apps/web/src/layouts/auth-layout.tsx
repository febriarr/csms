import { Outlet } from "react-router";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
    return (
        <div className="typeset typeset-apps bg-secondary dark:bg-background">
            <div className="container mx-auto flex h-screen items-center justify-center p-4">{children}</div>
        </div>
    );
}

export default function AuthLayout() {
    return (
        <AuthShell>
            <Outlet />
        </AuthShell>
    );
}
