import { NotificationUtils } from './notification.utils';

describe('NotificationUtils.buildAlertMessage', () => {
    const base = {
        deviceName: 'Freezer 1',
        deviceCode: 'FRZ-01',
        placeLabel: 'Gudang A / Chiller 1 (Pintu)',
        temperature: -3,
        reason: 'Temperature -3°C exceeded critical threshold (above -5°C).',
        at: new Date('2026-10-14T20:00:00.000Z'),
    };

    it('should lay a critical alert out one fact per line, with the place', () => {
        expect(NotificationUtils.buildAlertMessage({ ...base, severity: 'CRITICAL' })).toBe(
            [
                '🚨 *CRITICAL*',
                'Device: *Freezer 1*',
                'Code: *FRZ-01*',
                'Lokasi: Gudang A / Chiller 1 (Pintu)',
                'Temperature: *-3°C*',
                'Reason: Temperature -3°C exceeded critical threshold (above -5°C).',
                'Timestamp: 15-OCT-2026 03:00:00',
            ].join('\n'),
        );
    });

    it('should use a different emoji for a warning', () => {
        expect(NotificationUtils.buildAlertMessage({ ...base, severity: 'WARNING' }).startsWith('⚠️ *WARNING*')).toBe(
            true,
        );
    });
});

describe('NotificationUtils.buildOfflineMessage', () => {
    it('should say when the device was last seen and what it last read', () => {
        const message = NotificationUtils.buildOfflineMessage({
            deviceName: 'Freezer 1',
            deviceCode: 'FRZ-01',
            placeLabel: 'Gudang A / Chiller 1',
            lastSeenAt: new Date('2026-10-14T20:00:00.000Z'),
            lastTemperature: -12,
            detectedAt: new Date('2026-10-14T20:03:00.000Z'),
        });

        expect(message).toContain('🔌 *OFFLINE*');
        expect(message).toContain('Last seen: 15-OCT-2026 03:00:00');
        expect(message).toContain('Last reading: -12°C');
        expect(message).toContain('Detected: 15-OCT-2026 03:03:00');
    });

    it('should leave the last reading out when there is none', () => {
        const message = NotificationUtils.buildOfflineMessage({
            deviceName: 'x',
            deviceCode: 'x',
            placeLabel: 'x',
            lastSeenAt: null,
            lastTemperature: null,
            detectedAt: new Date('2026-10-14T20:03:00.000Z'),
        });

        expect(message.includes('Last reading')).toBe(false);
        expect(message).toContain('Last seen: -');
    });
});

describe('NotificationUtils.placeLabel', () => {
    it('should add the point only when the device has one', () => {
        expect(
            NotificationUtils.placeLabel({
                locationName: 'Gudang A',
                coldStorageName: 'Chiller 1',
                pointLabel: 'Pintu',
            }),
        ).toBe('Gudang A / Chiller 1 (Pintu)');
        expect(
            NotificationUtils.placeLabel({ locationName: 'Gudang A', coldStorageName: 'Chiller 1', pointLabel: null }),
        ).toBe('Gudang A / Chiller 1');
    });
});
