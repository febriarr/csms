/**
 * Escapes the characters that have a meaning inside a LIKE / ILIKE pattern, so text typed by a user is matched
 * literally ("50%" must not match everything). PostgreSQL's default escape character is the backslash.
 */
export function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
}

/** A case-insensitive "contains" pattern for ILIKE. */
export function containsPattern(value: string): string {
    return `%${escapeLike(value)}%`;
}
