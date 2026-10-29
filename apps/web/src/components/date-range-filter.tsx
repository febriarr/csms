import { useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

/** Same shape as react-day-picker's DateRange, so it goes straight into <Calendar mode="range">. */
export type DayRange = { from: Date | undefined; to?: Date };

const pad = (value: number) => String(value).padStart(2, "0");

/** "2026-10-28": the calendar day as the API expects it. Built from the local parts, never from toISOString(). */
export function toDayString(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const formatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

const PRESETS = [
    { label: "Today", days: 0 },
    { label: "Last 7 days", days: 6 },
    { label: "Last 30 days", days: 29 },
] as const;

function presetRange(days: number): DayRange {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - days);

    return { from, to };
}

function describe(value: DayRange | undefined): string | null {
    if (!value?.from) return null;
    if (!value.to) return `${formatter.format(value.from)} - ...`;

    return `${formatter.format(value.from)} - ${formatter.format(value.to)}`;
}

type DateRangeFilterProps = {
    value: DayRange | undefined;
    onChange: (value: DayRange | undefined) => void;
    /** Shown while nothing is picked. */
    placeholder?: string;
    className?: string;
};

/**
 * A range of calendar days. While only the first day is picked the filter is not applied yet: the API takes both
 * `from` and `to` or neither.
 */
export function DateRangeFilter({ value, onChange, placeholder = "All dates", className }: DateRangeFilterProps) {
    const [open, setOpen] = useState(false);
    const text = describe(value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    aria-label="Filter by date"
                    className={cn("justify-start font-normal", !text && "text-muted-foreground", className)}
                >
                    <CalendarIcon />
                    {text ?? placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex flex-wrap gap-2 border-b p-3">
                    {PRESETS.map((preset) => (
                        <Button
                            key={preset.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                onChange(presetRange(preset.days));
                                setOpen(false);
                            }}
                        >
                            {preset.label}
                        </Button>
                    ))}
                </div>

                <Calendar
                    mode="range"
                    selected={value}
                    onSelect={onChange}
                    defaultMonth={value?.from}
                    className="w-auto"
                />

                <div className="flex justify-end gap-2 border-t p-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            onChange(undefined);
                            setOpen(false);
                        }}
                    >
                        Clear
                    </Button>
                    <Button type="button" size="sm" onClick={() => setOpen(false)}>
                        Done
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
