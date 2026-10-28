import { useEffect } from "react";

/**
 * After the last row of the last page is removed (deleted, acknowledged, ...) the current page no longer exists:
 * fall back to the new last page.
 */
export function useClampPage(page: number, totalPages: number | undefined, setPage: (page: number) => void) {
    useEffect(() => {
        if (totalPages && page > totalPages) setPage(totalPages);
    }, [page, totalPages, setPage]);
}
