import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

interface PageSkeletonProps {
    /** Number of skeleton rows. */
    rows?: number;
    /** Number of table columns, including actions. */
    columns?: number;
    /** Show the search and filter toolbar. */
    showToolbar?: boolean;
    /** Number of filter placeholders. */
    filters?: number;
    /** Show the header action button. */
    showAction?: boolean;
    /** Show the actions column. */
    showActions?: boolean;
}

export function PageSkeleton({
    rows = 5,
    columns = 4,
    showToolbar = true,
    filters = 1,
    showAction = true,
    showActions = true,
}: PageSkeletonProps) {
    const columnWidths = ["w-36", "w-28", "w-48", "w-20", "w-32", "w-24"];

    return (
        <div className="flex flex-col gap-4" aria-hidden="true">
            {/* Page Header */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-4 w-64 max-w-full" />
                </div>

                {showAction && <Skeleton className="h-9 w-32 shrink-0" />}
            </div>

            {/* Search & Filters */}
            {showToolbar && (
                <div className="flex max-w-sm flex-col gap-2 sm:flex-row">
                    <Skeleton className="h-9 w-full flex-1" />

                    {Array.from({ length: filters }).map((_, index) => (
                        <Skeleton key={index} className="h-9 w-full sm:w-36" />
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="wrapper-table">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {Array.from({ length: columns }).map((_, index) => (
                                <TableHead
                                    key={index}
                                    className={showActions && index === columns - 1 ? "w-28 text-right" : undefined}
                                >
                                    <Skeleton
                                        className={`h-4 ${columnWidths[index % columnWidths.length]} ${
                                            showActions && index === columns - 1 ? "ml-auto" : ""
                                        }`}
                                    />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {Array.from({ length: rows }).map((_, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {Array.from({ length: columns }).map((_, columnIndex) => {
                                    const isAction = showActions && columnIndex === columns - 1;

                                    return (
                                        <TableCell key={columnIndex}>
                                            {isAction ? (
                                                <Skeleton className="ml-auto h-8 w-20" />
                                            ) : (
                                                <Skeleton
                                                    className={`h-4 ${
                                                        columnWidths[(columnIndex + rowIndex) % columnWidths.length]
                                                    }`}
                                                />
                                            )}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
