import { Navbar } from "@/components/navbar";
import { Outlet } from "react-router";

export default function LayoutDefault() {
    return (
        <>
            <div className="typeset typeset-apps">
                <Navbar />
                <main className="bg-secondary pt-12 dark:bg-background">
                    <Outlet />
                </main>
            </div>
        </>
    );
}
