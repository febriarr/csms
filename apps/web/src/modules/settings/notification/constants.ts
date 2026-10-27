import type { SubscriptionScope } from "@workspace/validator";
import { humanizeEnum } from "@/lib/format";

export const SUBSCRIPTION_SCOPES = [
    "ALL",
    "DIVISION",
    "LOCATION",
    "COLD_STORAGE",
    "DEVICE",
] as const satisfies readonly SubscriptionScope[];

export const SCOPE_LABELS: Record<SubscriptionScope, string> = {
    ALL: "All areas",
    DIVISION: "Division",
    LOCATION: "Location",
    COLD_STORAGE: "Cold room",
    DEVICE: "Device",
};

const CHANNEL_LABELS: Record<string, string> = {
    WHATSAPP: "WhatsApp",
    EMAIL: "Email",
};

export const channelLabel = (channel: string) => CHANNEL_LABELS[channel] ?? humanizeEnum(channel);
