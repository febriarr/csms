import { useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

const formatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

const pad = (value: number) => String(value).padStart(2, "0");
const toTimeValue = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

type DateTimePickerProps = {
    id?: string;
    value: Date | undefined;
    onChange: (value: Date | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    /** Days before this date cannot be picked. */
    minDate?: Date;
};

/**
 * Date (calendar) + time (HH:mm) in one popover, in the browser's time zone. The caller turns the Date into an ISO
 * string (`toISOString()`), which is what the API validates.
 */
export function DateTimePicker({
    id,
    value,
    onChange,
    placeholder = "Select date and time",
    disabled,
    invalid,
    minDate,
}: DateTimePickerProps) {
    const [open, setOpen] = useState(false);

    function pickDay(day: Date | undefined) {
        // clicking the selected day again passes undefined; clearing has its own button
        if (!day) return;

        // a new day keeps the time that was already chosen (or the current time for the first pick)
        const base = value ?? new Date();
        const next = new Date(day);
        next.setHours(base.getHours(), base.getMinutes(), 0, 0);
        onChange(next);
    }

    function pickTime(text: string) {
        const [hours, minutes] = text.split(":").map(Number);
        if (hours === undefined || minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) return;

        const next = new Date(value ?? new Date());
        next.setHours(hours, minutes, 0, 0);
        onChange(next);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    aria-invalid={invalid}
                    className={cn("w-full justify-start font-normal", !value && "text-muted-foreground")}
                >
                    <CalendarIcon />
                    {value ? formatter.format(value) : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={pickDay}
                    defaultMonth={value}
                    disabled={minDate ? { before: minDate } : undefined}
                    className="w-full"
                />

                <div className="flex items-center gap-2 border-t p-3">
                    <Input
                        type="time"
                        aria-label="Time"
                        value={value ? toTimeValue(value) : ""}
                        onChange={(event) => pickTime(event.target.value)}
                        className="w-32"
                    />
                    <div className="ml-auto flex gap-2">
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
                </div>
            </PopoverContent>
        </Popover>
    );
}
