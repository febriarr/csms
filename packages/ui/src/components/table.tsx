import { cn } from "../lib/utils";
import * as React from "react";
import { createPortal } from "react-dom";

function Table({ className, ...props }: React.ComponentProps<"table">) {
    return (
        <div data-slot="table-container" className="relative w-full overflow-x-auto">
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
    const colgroupRef = React.useRef<HTMLTableColElement>(null);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    React.useEffect(() => {
        if (!mounted || !sticky) return;

        const thead = theadRef.current;
        const clone = cloneRef.current;
        const colgroup = colgroupRef.current;
        if (!thead || !clone || !colgroup) return;

        const container = thead.closest<HTMLElement>("[data-slot='table-container']");
        if (!container) return;

        const getHeaderHeight = () => {
            const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-height").trim();
            if (raw.endsWith("rem")) {
                return parseFloat(raw) * parseFloat(getComputedStyle(document.documentElement).fontSize);
            }
            return parseFloat(raw) || 0;
        };

        const table = thead.closest("table");

        const sync = () => {
            if (!table) return;

            const headerHeight = getHeaderHeight();
            const containerRect = container.getBoundingClientRect();
            const theadRect = thead.getBoundingClientRect();
            const tableRect = table.getBoundingClientRect();

            const hasReachedStickyPosition = theadRect.top <= headerHeight;

            const theadHeight = theadRect.height;

            const isSticky = hasReachedStickyPosition && tableRect.bottom > headerHeight;

            clone.style.top = `${headerHeight}px`;
            clone.style.left = `${containerRect.left}px`;
            clone.style.width = `${containerRect.width}px`;

            const cloneTable = clone.querySelector("table") as HTMLElement;
            cloneTable.style.width = `${table.offsetWidth}px`;

            const ths = Array.from(thead.querySelectorAll("th"));

            while (colgroup.children.length < ths.length) {
                colgroup.appendChild(document.createElement("col"));
            }

            while (colgroup.children.length > ths.length) {
                colgroup.removeChild(colgroup.lastChild!);
            }

            ths.forEach((th, index) => {
                const col = colgroup.children[index] as HTMLElement;
                col.style.width = `${th.getBoundingClientRect().width}px`;
            });

            cloneTable.style.transform = `translateX(-${container.scrollLeft}px)`;

            // Tambahkan efek dorong (push-up) saat bagian bawah tabel mulai melewati batas atas
            if (isSticky) {
                clone.style.visibility = "visible";
                thead.style.visibility = "hidden";

                // Hitung jika tabel hampir habis di bagian atas layar
                const pushUpAmount = Math.min(0, tableRect.bottom - (headerHeight + theadHeight));
                clone.style.transform = `translateX(-${container.scrollLeft}px) translateY(${pushUpAmount}px)`;
            } else {
                clone.style.visibility = "hidden";
                thead.style.visibility = "visible";
                clone.style.transform = `translateX(-${container.scrollLeft}px) translateY(0px)`;
            }
        };

        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    sync();
                    ticking = false;
                });
                ticking = true;
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            onScroll();
        });
        resizeObserver.observe(container);
        if (table) resizeObserver.observe(table);

        window.addEventListener("scroll", onScroll);
        container.addEventListener("scroll", sync);
        window.addEventListener("resize", onScroll);
        sync();

        return () => {
            window.removeEventListener("scroll", onScroll);
            container.removeEventListener("scroll", sync);
            window.removeEventListener("resize", onScroll);
            resizeObserver.disconnect();
        };
    }, [mounted, sticky]);

    // Jika sticky false, langsung render thead biasa tanpa portal
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
                  style={{ visibility: "hidden" }}
                  className="pointer-events-none fixed z-40 overflow-hidden bg-background"
              >
                  <table
                      className="caption-bottom text-sm"
                      style={{ tableLayout: "fixed", borderCollapse: "collapse" }}
                  >
                      <colgroup ref={colgroupRef} />
                      <thead className={cn("[&_tr]:border-b", className)}>{props.children}</thead>
                  </table>
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
            className={cn(
                "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
                className
            )}
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

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
