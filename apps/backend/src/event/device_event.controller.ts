import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { DeviceEventService } from './device_event.service';

@Controller('events')
export class DeviceEventController {
    constructor(private readonly events: DeviceEventService) {}

    /**
     * Server-sent events for the live status page. Authenticated like every other route; a browser EventSource
     * must be created with `withCredentials: true` when the web app lives on another origin.
     */
    @Sse('device-status')
    stream(): Observable<MessageEvent> {
        return this.events.stream();
    }
}
