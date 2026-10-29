import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiSuccessResponse, WithMetadata } from '@workspace/shared';
import { map, Observable } from 'rxjs';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip_transform.decorator';

function hasMetadata<T>(value: unknown): value is WithMetadata<T> {
    return value !== null && typeof value === 'object' && 'data' in value && 'metadata' in value;
}

@Injectable()
export class TransformInterceptor<T = unknown> implements NestInterceptor<T, ApiSuccessResponse<T> | T> {
    constructor(private readonly reflector: Reflector) {}
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T> | T> {
        const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (skip) {
            return next.handle();
        }

        return next.handle().pipe(
            map((data): ApiSuccessResponse<T> => {
                if (hasMetadata<T>(data)) {
                    return { success: true, data: data.data, metadata: data.metadata };
                }
                return { success: true, data: (data ?? null) as T };
            }),
        );
    }
}
