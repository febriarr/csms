import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import { BellRing, Mail, MenuIcon, MessageCircle, Pencil, Trash2 } from "lucide-react";

import type { NotificationRecipientWithSubscriptions, NotificationSubscriptionItem } from "@workspace/shared";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { channelLabel, SCOPE_LABELS } from "./constants";

export type RecipientAction = "edit" | "subscriptions" | "delete";

/** No optional table features are needed here (no column visibility, sorting, or pagination yet). */
export const recipientTableFeatures = tableFeatures({});

const WARNING_STYLE = "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
const MAX_VISIBLE_SUBSCRIPTIONS = 2;

const columnHelper = createColumnHelper<typeof recipientTableFeatures, NotificationRecipientWithSubscriptions>();

function Muted({ children }: { children: React.ReactNode }) {
    return <span className="text-muted-foreground">{children}</span>;
}

function subscriptionLabel(subscription: NotificationSubscriptionItem) {
    return subscription.scope === "ALL"
        ? SCOPE_LABELS.ALL
        : `${SCOPE_LABELS[subscription.scope]}: ${subscription.targetName ?? "-"}`;
}

/**
 * Compact summary of what a recipient gets alerts from. The whole summary is a button that opens the
 * subscriptions dialog. "No subscription" is highlighted: that PIC would never receive any alert.
 */
function SubscriptionSummary({
    recipient,
    onManage,
}: {
    recipient: NotificationRecipientWithSubscriptions;
    onManage: () => void;
}) {
    const { subscriptions } = recipient;
    const shown = subscriptions.slice(0, MAX_VISIBLE_SUBSCRIPTIONS);
    const rest = subscriptions.length - shown.length;

    return (
        <button
            type="button"
            onClick={onManage}
            aria-label={`Manage subscriptions of ${recipient.name}`}
            className="flex max-w-80 flex-wrap gap-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            {subscriptions.length === 0 ? (
                <Badge variant="outline" className={WARNING_STYLE}>
                    No subscription
                </Badge>
            ) : (
                <>
                    {shown.map((subscription) => (
                        <Badge key={subscription.id} variant="secondary">
                            {subscriptionLabel(subscription)}
                        </Badge>
                    ))}
                    {rest > 0 && <Badge variant="outline">+{rest} more</Badge>}
                </>
            )}
        </button>
    );
}

export function getRecipientColumns(
    onAction: (action: RecipientAction, recipient: NotificationRecipientWithSubscriptions) => void
) {
    return columnHelper.columns([
        columnHelper.display({
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${row.original.name}`}>
                            <MenuIcon />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onSelect={() => onAction("subscriptions", row.original)}>
                            <BellRing />
                            Subscriptions
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onAction("edit", row.original)}>
                            <Pencil />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => onAction("delete", row.original)}>
                            <Trash2 />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        }),
        columnHelper.accessor("name", {
            header: "Name",
            cell: (info) => <span className="font-medium">{info.getValue()}</span>,
        }),
        columnHelper.accessor("channel", {
            header: "Channel",
            cell: (info) => {
                const Icon = info.getValue() === "EMAIL" ? Mail : MessageCircle;
                return (
                    <Badge variant="outline">
                        <Icon />
                        {channelLabel(info.getValue())}
                    </Badge>
                );
            },
        }),
        columnHelper.accessor("target", {
            header: "Target",
            cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
        }),
        columnHelper.accessor("division", {
            header: "Division",
            cell: (info) => <Muted>{info.getValue() ?? "-"}</Muted>,
        }),
        columnHelper.display({
            id: "subscriptions",
            header: "Receives alerts from",
            cell: ({ row }) => (
                <SubscriptionSummary
                    recipient={row.original}
                    onManage={() => onAction("subscriptions", row.original)}
                />
            ),
        }),
        columnHelper.accessor("isActive", {
            header: "Status",
            cell: (info) => (
                <Badge variant={info.getValue() ? "success" : "destructive"}>
                    {info.getValue() ? "Active" : "Inactive"}
                </Badge>
            ),
        }),
    ]);
}
