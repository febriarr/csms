import { DeviceWithPlace } from '@workspace/shared';

/**
 * A healthy device in a known place, for tests. Override only what a test is about. It lives next to the code it
 * builds so a change to the device row breaks the fixture, and with it every test, in one obvious place.
 */
export function aDevice(overrides: Partial<DeviceWithPlace> = {}): DeviceWithPlace {
    const at = new Date('2026-10-15T00:00:00.000Z');

    return {
        id: 'device-1',
        code: 'FRZ-01',
        name: 'Freezer 1',
        coldStorageId: 'cold-storage-1',
        pointLabel: 'Pintu',
        defrostThreshold: -20,
        warningThreshold: -15,
        criticalThreshold: -5,
        heartbeatIntervalSeconds: 30,
        firmwareVersion: null,
        state: 'NORMAL',
        stateChangedAt: at,
        lastSeenAt: at,
        lastTemperature: -22,
        lastRecordedAt: at,
        isActive: true,
        createdAt: at,
        updatedAt: at,
        deletedAt: null,
        deletedBy: null,
        coldStorageName: 'Chiller 1',
        locationId: 'location-1',
        locationName: 'Gudang A',
        divisionId: 'division-1',
        divisionName: 'Warehouse',
        ...overrides,
    };
}
