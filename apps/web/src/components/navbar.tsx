import { Button } from "@workspace/ui/components/button";
import { Box } from "lucide-react";
import { Link } from "react-router";

export function Navbar() {
    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b bg-background">
            <nav aria-label="Main navigation" className="flex h-12 items-center px-4 md:px-6 lg:px-8">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Link
                        to="/"
                        aria-label="Cold Storage Monitoring System — Home"
                        className="flex min-w-0 items-center gap-2 no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <Box aria-hidden="true" className="size-4 shrink-0" />

                        <span className="min-w-0 truncate font-heading font-medium">
                            Cold Storage Monitoring System
                        </span>
                    </Link>
                </div>

                <div className="ml-4 flex shrink-0 items-center gap-2">
                    <Button variant="outline" size={"lg"}>
                        Report
                    </Button>

                    <Button size={"lg"}>Login</Button>
                </div>
            </nav>
        </header>
    );
}
