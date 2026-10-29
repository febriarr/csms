import { useEffect, useRef } from "react";

/** The closest ancestor that actually scrolls (a layout container), or null when the window scrolls. */
function getScrollParent(element: HTMLElement | null): HTMLElement | null {
    let node = element?.parentElement ?? null;

    while (node) {
        const { overflowY } = getComputedStyle(node);
        if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
        node = node.parentElement;
    }

    return null;
}

/** Scrolls to the very top whenever `key` changes. Does nothing on mount (also under StrictMode). */
export function useScrollToTop<T extends HTMLElement>(key: unknown) {
    const ref = useRef<T>(null);
    const previous = useRef(key);

    useEffect(() => {
        if (Object.is(previous.current, key)) return;
        previous.current = key;

        (getScrollParent(ref.current) ?? window).scrollTo({ top: 0, behavior: "smooth" });
    }, [key]);

    return ref;
}
