import { z } from "zod";
import { idSchema } from "./common";

/**
 * One subscription = "this recipient gets alerts from <scope>".
 * Only the id that belongs to the scope is kept: unknown keys are stripped, so a form that still carries a
 * stale `locationId` after the user switched to DIVISION cannot violate the database CHECK
 * (exactly the matching foreign key is set, the others are null).
 */
export const createSubscriptionSchema = z.discriminatedUnion("scope", [
    z.object({ scope: z.literal("ALL") }),
    z.object({ scope: z.literal("DIVISION"), divisionId: idSchema }),
    z.object({ scope: z.literal("LOCATION"), locationId: idSchema }),
    z.object({ scope: z.literal("COLD_STORAGE"), coldStorageId: idSchema }),
    z.object({ scope: z.literal("DEVICE"), deviceId: idSchema }),
]);

type Subscription = z.infer<typeof createSubscriptionSchema>;

function subscriptionKey(subscription: Subscription): string {
    switch (subscription.scope) {
        case "ALL":
            return "ALL";
        case "DIVISION":
            return `DIVISION:${subscription.divisionId}`;
        case "LOCATION":
            return `LOCATION:${subscription.locationId}`;
        case "COLD_STORAGE":
            return `COLD_STORAGE:${subscription.coldStorageId}`;
        case "DEVICE":
            return `DEVICE:${subscription.deviceId}`;
    }
}

/**
 * A complete list of subscriptions for ONE recipient. Shared by "create recipient" (initial list) and
 * "replace subscriptions" (the Save action). Duplicates are rejected here instead of failing on the
 * unique constraint.
 */
export const subscriptionListSchema = z
    .array(createSubscriptionSchema)
    .max(100, "Maksimal 100 langganan")
    .superRefine((items, ctx) => {
        const seen = new Set<string>();

        items.forEach((item, index) => {
            const key = subscriptionKey(item);

            if (seen.has(key)) {
                ctx.addIssue({ code: "custom", path: [index], message: "Langganan duplikat" });
            }

            seen.add(key);
        });
    });

/**
 * "Save" action of the subscription screen: the complete list replaces what the recipient has now
 * (an empty list = unsubscribe from everything).
 */
export const replaceSubscriptionsSchema = z.object({
    subscriptions: subscriptionListSchema,
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type ReplaceSubscriptionsInput = z.infer<typeof replaceSubscriptionsSchema>;
