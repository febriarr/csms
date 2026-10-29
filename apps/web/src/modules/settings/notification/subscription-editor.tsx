import { Plus, Trash2 } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { FieldDescription, FieldError } from "@workspace/ui/components/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import type { SubscriptionScope } from "@workspace/validator";

import { useColdStorages } from "@/modules/settings/master-data/cold-room/hooks";
import { useDevices } from "@/modules/settings/master-data/device/hooks";
import { useDivisions } from "@/modules/settings/master-data/division/hooks";
import { useLocations } from "@/modules/settings/master-data/location/hooks";

import { SCOPE_LABELS, SUBSCRIPTION_SCOPES } from "./constants";
import { newDraft, type DraftSubscription } from "./subscription-draft";

type Option = { id: string; label: string };

type SubscriptionEditorProps = {
    value: DraftSubscription[];
    onChange: (value: DraftSubscription[]) => void;
    disabled?: boolean;
    error?: string;
};

/**
 * Controlled editor for ONE recipient's subscription list. Used by the "Add recipient" form (initial list) and by
 * the "Subscriptions" dialog (replace list). Each row = scope + (target of that scope).
 */
export function SubscriptionEditor({ value, onChange, disabled, error }: SubscriptionEditorProps) {
    const divisions = useDivisions();
    const locations = useLocations();
    const coldStorages = useColdStorages();
    const devices = useDevices();

    const options: Record<Exclude<SubscriptionScope, "ALL">, Option[]> = {
        DIVISION: divisions.data?.map((item) => ({ id: item.id, label: item.name })) ?? [],
        LOCATION: locations.data?.map((item) => ({ id: item.id, label: item.name })) ?? [],
        COLD_STORAGE:
            coldStorages.data?.map((item) => ({ id: item.id, label: `${item.name} · ${item.location}` })) ?? [],
        DEVICE: devices.data?.map((item) => ({ id: item.id, label: `${item.name} (${item.code})` })) ?? [],
    };

    const update = (key: string, patch: Partial<DraftSubscription>) =>
        onChange(value.map((item) => (item.key === key ? { ...item, ...patch } : item)));

    const hasAll = value.some((item) => item.scope === "ALL");

    return (
        <div className="flex flex-col gap-3">
            {value.length === 0 && (
                <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    Belum ada langganan. PIC ini tidak akan menerima alert apa pun.
                </p>
            )}

            {value.map((item) => (
                <div key={item.key} className="flex flex-col gap-2 sm:flex-row">
                    <Select
                        value={item.scope}
                        onValueChange={(scope) => update(item.key, { scope: scope as SubscriptionScope, targetId: "" })}
                        disabled={disabled}
                    >
                        <SelectTrigger className="w-full sm:w-40" aria-label="Scope">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SUBSCRIPTION_SCOPES.map((scope) => (
                                <SelectItem key={scope} value={scope}>
                                    {SCOPE_LABELS[scope]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={item.targetId}
                        onValueChange={(targetId) => update(item.key, { targetId })}
                        disabled={disabled || item.scope === "ALL"}
                    >
                        <SelectTrigger className="w-full sm:flex-1" aria-label="Target">
                            <SelectValue
                                placeholder={
                                    item.scope === "ALL"
                                        ? "Semua divisi, lokasi, cold room, dan device"
                                        : `Select ${SCOPE_LABELS[item.scope].toLowerCase()}`
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {item.scope !== "ALL" &&
                                options[item.scope].map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove subscription"
                        disabled={disabled}
                        onClick={() => onChange(value.filter((row) => row.key !== item.key))}
                    >
                        <Trash2 />
                    </Button>
                </div>
            ))}

            <div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onChange([...value, newDraft()])}
                >
                    <Plus />
                    Add subscription
                </Button>
            </div>

            <FieldDescription>
                Device otomatis tercakup jika divisi, lokasi, atau cold room induknya dilanggani, termasuk device baru.
                {hasAll && value.length > 1 && ' Langganan "All areas" sudah mencakup semuanya.'}
            </FieldDescription>

            {error && <FieldError>{error}</FieldError>}
        </div>
    );
}
