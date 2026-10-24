import { formatDateTime } from '@/common/utils/format_date_time';
import type { AlertMessageInput, OfflineMessageInput } from './notification.type';

/**
 * Texts of the messages people receive. Pure functions, so the wording is covered by unit tests and the senders
 * stay free of it. The layout is the one the plant already knows from the previous system (bold labels, one line
 * each), with the place added: a cold storage name means more to the person walking there than a device code.
 */
export class NotificationUtils {
    private constructor() {}

    static buildAlertMessage(this: void, input: AlertMessageInput): string {
        const emoji = input.severity === 'CRITICAL' ? '🚨' : '⚠️';

        return [
            `${emoji} *${input.severity}*`,
            `Device: *${input.deviceName}*`,
            `Code: *${input.deviceCode}*`,
            `Lokasi: ${input.placeLabel}`,
            `Temperature: *${input.temperature}°C*`,
            `Reason: ${input.reason}`,
            `Timestamp: ${formatDateTime(input.at)}`,
        ].join('\n');
    }

    static buildOfflineMessage(this: void, input: OfflineMessageInput): string {
        const lastReading = input.lastTemperature === null ? null : `Last reading: ${input.lastTemperature}°C`;

        return [
            '🔌 *OFFLINE*',
            `Device: *${input.deviceName}*`,
            `Code: *${input.deviceCode}*`,
            `Lokasi: ${input.placeLabel}`,
            `Last seen: ${formatDateTime(input.lastSeenAt)}`,
            ...(lastReading ? [lastReading] : []),
            `Detected: ${formatDateTime(input.detectedAt)}`,
        ].join('\n');
    }

    /** "Gudang A / Chiller 1 (Pintu)", or without the point when the device has none. */
    static placeLabel(
        this: void,
        place: { locationName: string; coldStorageName: string; pointLabel: string | null },
    ): string {
        const base = `${place.locationName} / ${place.coldStorageName}`;

        return place.pointLabel ? `${base} (${place.pointLabel})` : base;
    }
}
