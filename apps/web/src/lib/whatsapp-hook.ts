import { queryOptions, useQuery } from "@tanstack/react-query";
import { getWhatsappStatus } from "./whatsapp.api";

export const whatsappKeys = {
    status: ["whatsapp", "status"] as const,
};

export const whatsappStatusQueryOptions = queryOptions({
    queryKey: whatsappKeys.status,
    queryFn: ({ signal }) => getWhatsappStatus(signal),
});

/** Once connected there is no QR to keep fresh, so polling slows down (it still notices a later disconnect). */
const CONNECTED_POLL_MS = 15_000;

/**
 * `pollMs` is how often the status is refreshed while NOT connected. The pairing QR rotates about every 20 seconds,
 * so the dialog polls fast; the toolbar button only needs a slow check for its status dot.
 */
export function useWhatsappStatus({ pollMs }: { pollMs: number }) {
    return useQuery({
        ...whatsappStatusQueryOptions,
        refetchInterval: (query) => (query.state.data?.connected ? Math.max(pollMs, CONNECTED_POLL_MS) : pollMs),
    });
}
