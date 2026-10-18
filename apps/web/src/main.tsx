import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@workspace/ui/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client.tsx";
import { RouterProvider } from "react-router";
import { router } from "./routes/router.tsx";
import { TooltipProvider } from "@workspace/ui/components/tooltip";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <RouterProvider router={router} />
                </TooltipProvider>
            </QueryClientProvider>
        </ThemeProvider>
    </StrictMode>
);
