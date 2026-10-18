import LayoutDefault from "@/layouts/default";
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
    {
        element: <LayoutDefault />,
        children: [
            {
                path: "/",
                lazy: () => import("@/App"),
            },
        ],
    },
]);
