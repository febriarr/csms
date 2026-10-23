import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ApiSuccessResponse, WithMetadata } from '@workspace/shared';
import { map, Observable } from 'rxjs';

function hasMetadata<T>(value: unknown): value is WithMetadata<T> {
    return value !== null && typeof value === 'object' && 'data' in value && 'metadata' in value;
}

@Injectable()
export class TransformInterceptor<T = unknown> implements NestInterceptor<T, ApiSuccessResponse<T>> {
    intercept(_: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
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
