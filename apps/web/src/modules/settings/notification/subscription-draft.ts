import type { NotificationSubscriptionItem } from "@workspace/shared";
import type { CreateSubscriptionInput, SubscriptionScope } from "@workspace/validator";

/**
 * Editing model of one subscription row. The API wants "exactly the id that matches the scope"; in the UI that
 * is a single `targetId` whose meaning depends on `scope`. `key` is only for React lists.
 */
export type DraftSubscription = { key: string; scope: SubscriptionScope; targetId: string };

const TARGET_FIELD = {
    DIVISION: "divisionId",
    LOCATION: "locationId",
    COLD_STORAGE: "coldStorageId",
    DEVICE: "deviceId",
} as const;

let counter = 0;

export function newDraft(scope: SubscriptionScope = "DIVISION"): DraftSubscription {
    return { key: `draft-${++counter}`, scope, targetId: "" };
}

/** Exactly one of the four ids is set on a stored subscription (none for ALL). */
export function toDrafts(items: NotificationSubscriptionItem[]): DraftSubscription[] {
    return items.map((item) => ({
        key: item.id,
        scope: item.scope,
        targetId: item.divisionId ?? item.locationId ?? item.coldStorageId ?? item.deviceId ?? "",
    }));
}

export function toPayload(drafts: DraftSubscription[]): CreateSubscriptionInput[] {
    return drafts.map((draft) =>
        draft.scope === "ALL"
            ? { scope: "ALL" }
            : ({ scope: draft.scope, [TARGET_FIELD[draft.scope]]: draft.targetId } as CreateSubscriptionInput)
    );
}

/** Quick client-side check before sending; the backend/validator stay the source of truth. */
export function getDraftsError(drafts: DraftSubscription[]): string | null {
    if (drafts.some((draft) => draft.scope !== "ALL" && !draft.targetId)) {
        return "Pilih target untuk setiap langganan.";
    }

    const seen = new Set<string>();
    for (const draft of drafts) {
        const key = draft.scope === "ALL" ? "ALL" : `${draft.scope}:${draft.targetId}`;
        if (seen.has(key)) return "Ada langganan yang duplikat.";
        seen.add(key);
    }

    return null;
}
