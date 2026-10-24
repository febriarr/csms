import type { MessageEvent } from '@nestjs/common';
import { DeviceEventService } from './device_event.service';
import type { DeviceUpdateEvent } from '@workspace/shared';

const update: DeviceUpdateEvent = {
    id: 'device-1',
    code: 'FRZ-01',
    name: 'Freezer 1',
    coldStorageId: 'cold-storage-1',
    state: 'WARNING',
    isActive: true,
    lastTemperature: -12,
    lastSeenAt: null,
    stateChangedAt: new Date('2026-10-15T00:00:00.000Z'),
    paused: false,
};

describe('DeviceEventService', () => {
    it('should deliver a published update to every subscriber as a device-update event', () => {
        const service = new DeviceEventService();
        const first: MessageEvent[] = [];
        const second: MessageEvent[] = [];

        const a = service.stream().subscribe((message) => first.push(message));
        const b = service.stream().subscribe((message) => second.push(message));

        service.publish(update);

        expect(first).toEqual([{ type: 'device-update', data: update }]);
        expect(second.length).toBe(1);

        a.unsubscribe();
        b.unsubscribe();
    });

    it('should stop delivering to a client that disconnected', () => {
        const service = new DeviceEventService();
        const received: MessageEvent[] = [];

        const subscription = service.stream().subscribe((message) => received.push(message));
        subscription.unsubscribe();
        service.publish(update);

        expect(received.length).toBe(0);
    });

    it('should not fail when nobody is listening', () => {
        expect(() => new DeviceEventService().publish(update)).not.toThrow();
    });
});
