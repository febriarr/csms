import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router";

type Labels = Record<string, string>;

const labels = new Map<string, string>();
const listeners = new Set<() => void>();
let snapshot: Labels = {};

function emit() {
    snapshot = Object.fromEntries(labels);
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Dibaca oleh komponen breadcrumb */
export function useBreadcrumbLabels(): Labels {
    return useSyncExternalStore(
        subscribe,
        () => snapshot,
        () => snapshot
    );
}

/**
 * Dipakai di halaman detail untuk mengisi nama segmen ber-ID.
 * - `label` undefined (masih loading) → breadcrumb menampilkan skeleton.
 * - `path` opsional: isi kalau halaman ini mengisi segmen induknya,
 *   misal halaman /device/123/edit mengisi label untuk /device/123.
 */
export function useBreadcrumbLabel(label: string | undefined, path?: string) {
    const { pathname } = useLocation();
    const target = path ?? pathname;

    useEffect(() => {
        if (!label) return;
        labels.set(target, label);
        emit();

        return () => {
            labels.delete(target);
            emit();
        };
    }, [target, label]);
}
