import type { ReactNode } from "react";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { TableCell, TableRow } from "@workspace/ui/components/table";

/** The part of a TanStack Query result this component needs, so any `useQuery` result fits. */
type QueryState = {
    isPending: boolean;
    isError: boolean;
    isSuccess: boolean;
    error: { message: string } | null;
    refetch: () => unknown;
};

type TableStatusRowsProps = {
    query: QueryState;
    columnCount: number;
    /** The query succeeded but there is nothing to show. */
    isEmpty: boolean;
    emptyMessage: string;
    /** Placeholder rows while loading (default 4). */
    skeletonRows?: number;
    /** Own placeholder rows, for a table whose cells need different widths. Replaces the default skeleton. */
    skeleton?: ReactNode;
};

/**
 * The three non-data states of a table body: loading (skeleton rows), error (message + Retry) and empty.
 * Put it inside <TableBody>, before the rows.
 */
export function TableStatusRows({
    query,
    columnCount,
    isEmpty,
    emptyMessage,
    skeletonRows = 4,
    skeleton,
}: TableStatusRowsProps) {
    return (
        <>
            {query.isPending &&
                (skeleton ??
                    Array.from({ length: skeletonRows }).map((_, row) => (
                        <TableRow key={row}>
                            {Array.from({ length: columnCount }).map((__, cell) => (
                                <TableCell key={cell}>
                                    <Skeleton className="h-4 w-full min-w-12" />
                                </TableCell>
                            ))}
                        </TableRow>
                    )))}

            {query.isError && (
                <TableRow>
                    <TableCell colSpan={columnCount} className="py-8 text-center">
                        <p className="mb-3 text-sm text-muted-foreground">{query.error?.message}</p>
                        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                            Retry
                        </Button>
                    </TableCell>
                </TableRow>
            )}

            {query.isSuccess && isEmpty && (
                <TableRow>
                    <TableCell colSpan={columnCount} className="py-8 text-center text-sm text-muted-foreground">
                        {emptyMessage}
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}
