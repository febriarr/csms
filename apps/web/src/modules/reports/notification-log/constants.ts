import type { NotificationStatus } from "@workspace/validator";

export const STATUS_META: Record<NotificationStatus, { label: string; hint: string }> = {
    PENDING: { label: "Pending", hint: "Waiting to be sent, or waiting for its next retry." },
    SUCCESS: { label: "Sent", hint: "Delivered to the channel." },
    FAILED: { label: "Failed", hint: "Gave up: every attempt failed, or it was too old to be worth sending." },
};

export const statusLabel = (status: string) => STATUS_META[status as NotificationStatus]?.label ?? status;
