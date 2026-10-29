import { cn } from "../lib/utils";
import * as React from "react";
import { createPortal } from "react-dom";

const tableContainerClassName = "relative w-full min-w-0 overflow-x-auto";

function Table({ className, ...props }: React.ComponentProps<"table">) {
    return (
        <div data-slot="table-container" className={tableContainerClassName}>
            <table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} />
        </div>
    );
}

interface TableHeaderProps extends React.ComponentProps<"thead"> {
    sticky?: boolean;
}

function TableHeader({ className, sticky = true, ...props }: TableHeaderProps) {
    const theadRef = React.useRef<HTMLTableSectionElement>(null);

    const cloneRef = React.useRef<HTMLDivElement>(null);

    const cloneInnerRef = React.useRef<HTMLDivElement>(null);

    const colgroupRef = React.useRef<HTMLTableColElement>(null);

    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    React.useEffect(() => {
        if (!mounted || !sticky) {
            return;
        }

        const thead = theadRef.current;
        const clone = cloneRef.current;
        const cloneInner = cloneInnerRef.current;
        const colgroup = colgroupRef.current;

        if (!thead || !clone || !cloneInner || !colgroup) {
            return;
        }

        const container = thead.closest<HTMLElement>("[data-slot='table-container']");

        if (!container) {
            return;
        }

        const table = thead.closest<HTMLTableElement>("table");

        if (!table) {
            return;
        }

        const getHeaderHeight = () => {
            const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-height").trim();

            if (raw.endsWith("rem")) {
                const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

                return parseFloat(raw) * rootFontSize;
            }

            return parseFloat(raw) || 0;
        };

        const syncColumnWidths = () => {
            const ths = Array.from(thead.querySelectorAll<HTMLTableCellElement>("th"));

            while (colgroup.children.length < ths.length) {
                colgroup.appendChild(document.createElement("col"));
            }

            while (colgroup.children.length > ths.length) {
                colgroup.removeChild(colgroup.lastChild!);
            }

            ths.forEach((th, index) => {
                const col = colgroup.children[index] as HTMLTableColElement;

                col.style.width = `${th.getBoundingClientRect().width}px`;
            });
        };

        const syncHorizontalPosition = () => {
            cloneInner.style.transform = `translate3d(-${container.scrollLeft}px, 0, 0)`;
        };

        const sync = () => {
            const headerHeight = getHeaderHeight();

            const containerRect = container.getBoundingClientRect();

            const theadRect = thead.getBoundingClientRect();

            const tableRect = table.getBoundingClientRect();

            const theadHeight = theadRect.height;
            const tableWidth = table.offsetWidth;

            const hasReachedStickyPosition = theadRect.top <= headerHeight;

            const isSticky = hasReachedStickyPosition && tableRect.bottom > headerHeight;

            clone.style.top = `${headerHeight}px`;
            clone.style.left = `${containerRect.left}px`;
            clone.style.width = `${container.clientWidth}px`;
            clone.style.height = `${theadHeight}px`;
            clone.style.overflow = "hidden";

            cloneInner.style.width = `${tableWidth}px`;
            cloneInner.style.height = `${theadHeight}px`;

            syncColumnWidths();
            syncHorizontalPosition();

            if (isSticky) {
                const pushUpAmount = Math.min(0, tableRect.bottom - (headerHeight + theadHeight));

                clone.style.transform = `translate3d(0, ${pushUpAmount}px, 0)`;

                clone.style.visibility = "visible";

                thead.style.visibility = "hidden";
            } else {
                clone.style.transform = "translate3d(0, 0, 0)";

                clone.style.visibility = "hidden";

                thead.style.visibility = "visible";
            }
        };

        let ticking = false;

        const scheduleSync = () => {
            if (ticking) {
                return;
            }

            ticking = true;

            requestAnimationFrame(() => {
                sync();
                ticking = false;
            });
        };

        const handleWindowScroll = () => {
            scheduleSync();
        };

        const handleContainerScroll = () => {
            syncHorizontalPosition();
        };

        const resizeObserver = new ResizeObserver(() => {
            scheduleSync();
        });

        resizeObserver.observe(container);
        resizeObserver.observe(table);
        resizeObserver.observe(thead);

        window.addEventListener("scroll", handleWindowScroll, { passive: true });

        window.addEventListener("resize", scheduleSync);

        container.addEventListener("scroll", handleContainerScroll, { passive: true });

        sync();

        return () => {
            window.removeEventListener("scroll", handleWindowScroll);

            window.removeEventListener("resize", scheduleSync);

            container.removeEventListener("scroll", handleContainerScroll);

            resizeObserver.disconnect();

            thead.style.visibility = "visible";
        };
    }, [mounted, sticky]);

    if (!sticky) {
        return (
            <thead ref={theadRef} data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />
        );
    }

    const clonePortal = mounted
        ? createPortal(
              <div
                  ref={cloneRef}
                  aria-hidden="true"
                  className="pointer-events-none fixed z-40 overflow-hidden bg-background"
                  style={{
                      visibility: "hidden",
                      contain: "paint",
                  }}
              >
                  <div ref={cloneInnerRef} className="absolute top-0 left-0 h-full">
                      <table
                          className="caption-bottom text-sm"
                          style={{
                              tableLayout: "fixed",
                              borderCollapse: "collapse",
                          }}
                      >
                          <colgroup ref={colgroupRef} />

                          <thead className={cn("[&_tr]:border-b", className)}>{props.children}</thead>
                      </table>
                  </div>
              </div>,
              document.body
          )
        : null;

    return (
        <>
            {clonePortal}

            <thead ref={theadRef} data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />
        </>
    );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
    return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
    return (
        <tfoot
            data-slot="table-footer"
            className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
            {...props}
        />
    );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
    return (
        <tr
            data-slot="table-row"
            className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)}
            {...props}
        />
    );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
    return (
        <th
            data-slot="table-head"
            className={cn(
                "h-12 bg-muted/60 px-3 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
                className
            )}
            {...props}
        />
    );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
    return (
        <td
            data-slot="table-cell"
            className={cn("p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
            {...props}
        />
    );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
    return (
        <caption data-slot="table-caption" className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
    );
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
