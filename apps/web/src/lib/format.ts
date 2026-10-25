/** numeric columns may arrive as strings from the database driver, hence the Number(). */
export function formatTemperature(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return "-";
    const number = Number(value);
    return Number.isNaN(number) ? "-" : `${number.toFixed(2)}°C`;
}

/** "PLANNED_PAUSE" -> "Planned pause" */
export function humanizeEnum(value: string): string {
    const text = value.replace(/[_-]+/g, " ").toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
}
