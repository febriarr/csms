/**
 * Turns a zod error into { field: message }. Issues without a path (e.g. the "no changes" refine on update
 * schemas) land under "_root". Typed structurally so the app doesn't need to import zod itself.
 */
export function toFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const issue of error.issues) {
        const field = issue.path.length > 0 ? String(issue.path[0]) : "_root";
        errors[field] ??= issue.message;
    }
    return errors;
}
