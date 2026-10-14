import { formatDateTime } from '@/common/utils/format_date_time';
import type { AlertReason, DevicesState } from '../database/schema';
import {
    NOTIFIABLE_STATES,
    TemperatureState,
    type AlertReasonContext,
    type NotifiableState,
    type PauseKind,
    type TemperatureThresholds,
} from './temperature.type';

/**
 * Pure temperature rules. Everything is static: call `TemperatureUtils.getTemperatureState(...)` directly,
 * there is nothing to instantiate. No method uses `this`, so any of them can be passed around as a plain
 * callback (e.g. `readings.map(r => TemperatureUtils.getTemperatureState(t, r))`).
 *
 * The class only classifies and describes. Whether a result may be APPLIED (planned pause, newest-reading
 * check, duplicates) is decided by the caller.
 */
export class TemperatureUtils {
    /** Not instantiable: this class is a namespace for static methods. */
    private constructor() {}

    /** Higher = worse. OFFLINE is a device state, not a temperature state, so it has no rank. */
    private static readonly SEVERITY: Record<TemperatureState, number> = {
        NORMAL: 0,
        DEFROST: 1,
        WARNING: 2,
        CRITICAL: 3,
    };

    private static readonly PAUSE_LABEL: Record<PauseKind, string> = {
        MAINTENANCE: 'maintenance',
        MACHINE_OFF: 'machine-off period',
    };

    /* - state rules */

    /**
     * Maps one reading to a temperature state. Boundaries (lower bound inclusive unless noted):
     *
     *   with defrost:     NORMAL  t <= defrost  |  DEFROST  defrost < t < warning  |  WARNING  warning <= t < critical  |  CRITICAL  t >= critical
     *   without defrost:  NORMAL  t < warning                                       |  WARNING  warning <= t < critical  |  CRITICAL  t >= critical
     *
     * Checks run from the worst state down, so overlapping thresholds resolve to the more severe state.
     * The ordering (defrost < warning < critical) is guaranteed by a CHECK constraint on `devices`.
     */
    static getTemperatureState(thresholds: TemperatureThresholds, temperature: number): TemperatureState {
        // Every comparison with NaN is false, which would silently report NORMAL for a broken reading.
        if (!Number.isFinite(temperature)) {
            throw new RangeError(`Temperature must be a finite number, received ${temperature}`);
        }

        const { defrostThreshold, warningThreshold, criticalThreshold } = thresholds;

        if (temperature >= criticalThreshold) return TemperatureState.CRITICAL;
        if (temperature >= warningThreshold) return TemperatureState.WARNING;
        if (defrostThreshold !== null && temperature > defrostThreshold) return TemperatureState.DEFROST;

        return TemperatureState.NORMAL;
    }

    static isTemperatureState(state: DevicesState): state is TemperatureState {
        return state !== 'OFFLINE';
    }

    static severityOf(state: TemperatureState): number {
        return TemperatureUtils.SEVERITY[state];
    }

    /** True when `to` is a worse temperature state than `from`. Anything involving OFFLINE is not an escalation. */
    static isEscalation(from: DevicesState, to: DevicesState): boolean {
        if (!TemperatureUtils.isTemperatureState(from) || !TemperatureUtils.isTemperatureState(to)) return false;

        return TemperatureUtils.severityOf(to) > TemperatureUtils.severityOf(from);
    }

    static shouldNotify(state: DevicesState): state is NotifiableState {
        return (NOTIFIABLE_STATES as readonly string[]).includes(state);
    }

    /*  alert reason */

    /**
     * Picks the reason code stored on an alert for the transition `fromState` → `toState`.
     * Only call it when the state actually changed.
     *
     *  - to OFFLINE                          → DEVICE_OFFLINE
     *  - from OFFLINE to NORMAL / DEFROST    → DEVICE_RECOVERED   (nothing needs attention except that it is back)
     *  - from OFFLINE to WARNING / CRITICAL  → the temperature reason. A device that comes back *already critical*
     *                                           must not be reported as merely "resumed sending data": the
     *                                           temperature is what people have to act on. buildAlertReason adds
     *                                           the "was offline" note to the text.
     *  - anything else                       → the reason for the state we moved into
     */
    static getAlertReason(fromState: DevicesState, toState: DevicesState): AlertReason {
        if (toState === 'OFFLINE') return 'DEVICE_OFFLINE';

        if (fromState === 'OFFLINE' && !TemperatureUtils.shouldNotify(toState)) return 'DEVICE_RECOVERED';

        switch (toState) {
            case 'NORMAL':
                return 'TEMPERATURE_RECOVERED';
            case 'DEFROST':
                return 'DEFROST_DETECTED';
            case 'WARNING':
                return 'WARNING_TEMPERATURE';
            case 'CRITICAL':
                return 'CRITICAL_TEMPERATURE';
            default: {
                // Compile-time exhaustiveness: adding a state to the enum makes this line fail to type-check.
                const unhandled: never = toState;
                throw new Error(`Unhandled device state: ${String(unhandled)}`);
            }
        }
    }

    /** Human-readable text stored on the alert and sent in notifications. */
    static buildAlertReason(reasonCode: AlertReason, context: AlertReasonContext): string {
        const { device, temperature, fromState } = context;

        const label =
            temperature === undefined ? 'Temperature' : `Temperature ${TemperatureUtils.degrees(temperature)}`;

        switch (reasonCode) {
            case 'DEFROST_DETECTED': {
                // A device without a defrost threshold never enters DEFROST; stay total instead of printing "null°C".
                const range =
                    device.defrostThreshold === null
                        ? ''
                        : ` (${TemperatureUtils.degrees(device.defrostThreshold)} to ${TemperatureUtils.degrees(device.warningThreshold)})`;
                const from = TemperatureUtils.fellFrom(fromState, 'DEFROST');

                return from
                    ? `${label} fell from ${from} into the defrost range${range}.`
                    : `${label} entered defrost range${range}.`;
            }

            case 'WARNING_TEMPERATURE': {
                const range = `${TemperatureUtils.degrees(device.warningThreshold)} to ${TemperatureUtils.degrees(device.criticalThreshold)}`;

                return TemperatureUtils.withNotes(
                    TemperatureUtils.fellFrom(fromState, 'WARNING')
                        ? `${label} dropped below the critical threshold but is still in the warning range (${range}).`
                        : `${label} exceeded warning threshold (${range}).`,
                    context,
                );
            }

            case 'CRITICAL_TEMPERATURE':
                return TemperatureUtils.withNotes(
                    `${label} exceeded critical threshold (above ${TemperatureUtils.degrees(device.criticalThreshold)}).`,
                    context,
                );

            case 'TEMPERATURE_RECOVERED': {
                // Normal ends at the defrost threshold when there is one, otherwise just below warning (the spiral).
                const normalRange =
                    device.defrostThreshold === null
                        ? `below ${TemperatureUtils.degrees(device.warningThreshold)}`
                        : `up to ${TemperatureUtils.degrees(device.defrostThreshold)}`;

                return `${label} returned to normal range (${normalRange}).`;
            }

            case 'DEVICE_OFFLINE':
                return `Device stopped sending data. Last seen at ${formatDateTime(device.lastSeenAt)}.`;

            case 'DEVICE_RECOVERED':
                return 'Device resumed sending data.';

            default: {
                const unhandled: never = reasonCode;
                throw new Error(`Unhandled alert reason: ${String(unhandled)}`);
            }
        }
    }

    /*  helpers */

    // "-0" and float noise (e.g. 4.100000001) would otherwise leak into WhatsApp messages.
    private static degrees(value: number): string {
        return `${Number(value.toFixed(2))}°C`;
    }

    /** The worse state we just came down from (CRITICAL → WARNING, WARNING → DEFROST), otherwise null. */
    private static fellFrom(fromState: DevicesState | undefined, to: TemperatureState): TemperatureState | null {
        if (!fromState || !TemperatureUtils.isTemperatureState(fromState)) return null;

        return TemperatureUtils.severityOf(fromState) > TemperatureUtils.severityOf(to) ? fromState : null;
    }

    /** Extra sentences for the two situations that change what the reader should do. */
    private static withNotes(text: string, context: AlertReasonContext): string {
        const notes: string[] = [];

        if (context.fromState === 'OFFLINE') {
            notes.push('Device resumed sending data after being offline.');
        }

        if (context.pause) {
            notes.push(
                `Temperature is still outside the normal range after the ${TemperatureUtils.PAUSE_LABEL[context.pause.kind]} ended at ` +
                    `${formatDateTime(context.pause.endedAt)} and the allowed pull-down time has passed.`,
            );
        }

        return [text, ...notes].join(' ');
    }
}
