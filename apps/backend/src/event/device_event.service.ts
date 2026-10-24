import { Injectable, MessageEvent } from '@nestjs/common';
import { interval, map, merge, Observable, Subject } from 'rxjs';
import { DEVICE_UPDATE_EVENT, type DeviceUpdateEvent } from '@workspace/shared';

/** Proxies close idle connections after about a minute; a comment-like ping keeps the stream open. */
export const KEEP_ALIVE_INTERVAL_MS = 25_000;

/**
 * In-process publish / subscribe for live device updates. Publishing never throws and never blocks: with no
 * subscriber the event is simply dropped. It is process-local, so with several API instances each one only
 * reaches its own clients (move to Redis pub/sub if the API is ever scaled out).
 */
@Injectable()
export class DeviceEventService {
    private readonly updates = new Subject<DeviceUpdateEvent>();

    /** Call after the database transaction has committed, never inside it. */
    publish(event: DeviceUpdateEvent): void {
        this.updates.next(event);
    }

    /** One stream per connected client; unsubscribing (client disconnect) cleans up the keep-alive timer too. */
    stream(): Observable<MessageEvent> {
        const updates$ = this.updates.pipe(map((event): MessageEvent => ({ type: DEVICE_UPDATE_EVENT, data: event })));
        const ping$ = interval(KEEP_ALIVE_INTERVAL_MS).pipe(map((): MessageEvent => ({ type: 'ping', data: '' })));

        return merge(updates$, ping$);
    }
}
