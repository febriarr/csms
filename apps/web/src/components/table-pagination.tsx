import type { MouseEvent } from "react";

import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@workspace/ui/components/pagination";
import { cn } from "@workspace/ui/lib/utils";

type TablePaginationProps = {
    metadata: { page: number; totalPages: number; totalItems: number } | undefined;
    /** What is counted, e.g. "user" -> "Halaman 1 dari 3 · 25 user". */
    itemLabel: string;
    onPageChange: (page: number) => void;
};

const ELLIPSIS = "ellipsis" as const;

/** 1 … 4 [5] 6 … 10: first, last, and the current page with one neighbour on each side. */
function getPages(current: number, total: number): (number | typeof ELLIPSIS)[] {
    const pages = new Set([1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

    const result: (number | typeof ELLIPSIS)[] = [];
    sorted.forEach((page, index) => {
        const previous = sorted[index - 1];
        if (previous !== undefined && page - previous > 1) {
            // a single missing page is shown as the page itself, an ellipsis would hide nothing
            result.push(page - previous === 2 ? page - 1 : ELLIPSIS);
        }
        result.push(page);
    });

    return result;
}

/** Page navigation for a table paginated by the backend. Renders nothing when there is a single page. */
export function TablePagination({ metadata, itemLabel, onPageChange }: TablePaginationProps) {
    if (!metadata || metadata.totalPages <= 1) return null;

    const { page, totalPages, totalItems } = metadata;

    // the links are anchors without a real URL: the page lives in state, not in the address bar
    const goTo = (target: number) => (event: MouseEvent) => {
        event.preventDefault();
        if (target >= 1 && target <= totalPages && target !== page) onPageChange(target);
    };

    return (
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages} · {totalItems} {itemLabel}
            </p>

            <Pagination className="mx-0 w-auto">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            aria-disabled={page <= 1}
                            tabIndex={page <= 1 ? -1 : undefined}
                            className={cn(page <= 1 && "pointer-events-none opacity-50")}
                            onClick={goTo(page - 1)}
                        />
                    </PaginationItem>

                    {getPages(page, totalPages).map((item, index) =>
                        item === ELLIPSIS ? (
                            <PaginationItem key={`ellipsis-${index}`}>
                                <PaginationEllipsis />
                            </PaginationItem>
                        ) : (
                            <PaginationItem key={item}>
                                <PaginationLink href="#" isActive={item === page} onClick={goTo(item)}>
                                    {item}
                                </PaginationLink>
                            </PaginationItem>
                        )
                    )}

                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            aria-disabled={page >= totalPages}
                            tabIndex={page >= totalPages ? -1 : undefined}
                            className={cn(page >= totalPages && "pointer-events-none opacity-50")}
                            onClick={goTo(page + 1)}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}
