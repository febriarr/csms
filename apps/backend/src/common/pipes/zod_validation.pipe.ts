import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Validates a body / query / param with a zod schema from the validator package.
 *
 * On failure it lets the ZodError propagate untouched: AllExceptionsFilter (via mapException) turns it into the
 * standard 400 VALIDATION_FAILED response with per-field `errors`. On success it returns the PARSED value, so
 * coercions, defaults and transforms in the schema are applied before the handler runs.
 */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
    constructor(private readonly schema: T) {}

    transform(value: unknown): z.output<T> {
        return this.schema.parse(value);
    }
}
