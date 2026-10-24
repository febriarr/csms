import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@workspace/ui/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client.tsx";
import { RouterProvider } from "react-router";
import { router } from "./routes/router.tsx";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { AuthProvider } from "@/modules/auth/auth-provider";

console.log(
    "%c[CSMS]%c [Cold Storage Monitoring System]\n%c[version]%c [2.0.0]\n%c[Report Issue]%c https://github.com/febriarr/csms",
    "color: #2563eb; font-weight: bold;",
    "color: inherit;",
    "color: inherit; font-weight: bold;",
    "color: inherit;",
    "color: inherit; font-weight: bold;",
    "color: inherit; text-decoration: underline;"
);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <AuthProvider>
                        <RouterProvider router={router} />
                    </AuthProvider>
                </TooltipProvider>
            </QueryClientProvider>
        </ThemeProvider>
    </StrictMode>
);
