import type { SelectDevices } from '@/database/schema';
import { OFFLINE_AFTER_MISSED_HEARTBEATS } from './device.constant';
import { DeviceMonitoring, DeviceUpdateEvent } from '@workspace/shared';

export class DeviceUtils {
    private constructor() {}

    /**
     * True when the device has not been heard from for longer than its own heartbeat interval times
     * OFFLINE_AFTER_MISSED_HEARTBEATS. A device that never sent anything is not stale: there is no "last seen" to
     * measure from, and a brand-new device must not be reported offline before its first message.
     */
    static isStale(
        this: void,
        device: Pick<SelectDevices, 'lastSeenAt' | 'heartbeatIntervalSeconds'>,
        now: Date,
    ): boolean {
        if (device.lastSeenAt === null) return false;

        const allowedSilenceMs = device.heartbeatIntervalSeconds * OFFLINE_AFTER_MISSED_HEARTBEATS * 1000;

        return now.getTime() - device.lastSeenAt.getTime() > allowedSilenceMs;
    }

    /** The live-update payload for a device row. `paused` comes from the pause check, not from the row. */
    static toUpdateEvent(
        device: Pick<
            SelectDevices,
            | 'id'
            | 'code'
            | 'name'
            | 'coldStorageId'
            | 'state'
            | 'isActive'
            | 'lastTemperature'
            | 'lastSeenAt'
            | 'stateChangedAt'
        >,
        monitoring: DeviceMonitoring,
    ): DeviceUpdateEvent {
        return {
            id: device.id,
            code: device.code,
            name: device.name,
            coldStorageId: device.coldStorageId,
            state: device.state,
            isActive: device.isActive,
            lastTemperature: device.lastTemperature,
            lastSeenAt: device.lastSeenAt,
            stateChangedAt: device.stateChangedAt,
            monitoring,
        };
    }
}
