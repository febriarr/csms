import { formatDateTime } from '@/common/utils/format_date_time';
import type {
    ReportAlertEvent,
    ReportEvent,
    ReportPauseEvent,
    TemperatureReading,
    TemperatureReportRow,
    TemperatureReportSummary,
} from '@workspace/shared';
import { READING_EVALUATIONS, TEMPERATURE_STATES } from '@workspace/validator';
import { TemperatureUtils } from './temperature.utils';

/** What a report needs to explain a reading: the alerts and pauses of the period, indexed for lookup. */
export type ReportContext = {
    /** Alerts by the exact moment of the reading that raised them (epoch ms). */
    alertsByTime: Map<number, ReportAlertEvent[]>;
    pausesById: Map<string, ReportPauseEvent>;
};

/**
 * Pure rules of the temperature report: which note goes with a reading, how events are ordered, how the summary is
 * counted. Static like TemperatureUtils, so every method can be tested (and reused by the hourly report) without
 * a database.
 */
export class ReportUtils {
    /** Not instantiable: this class is a namespace for static methods. */
    private constructor() {}

    static createContext(this: void, alerts: ReportAlertEvent[], pauses: ReportPauseEvent[]): ReportContext {
        const alertsByTime = new Map<number, ReportAlertEvent[]>();

        for (const alert of alerts) {
            const key = alert.at.getTime();

            alertsByTime.set(key, [...(alertsByTime.get(key) ?? []), alert]);
        }

        return { alertsByTime, pausesById: new Map(pauses.map((pause) => [pause.id, pause])) };
    }

    /**
     * The note of one reading, or null when there is nothing to explain. In order of importance:
     *
     *  1. an alert was raised by this reading: its own text (the same text WhatsApp sent)
     *  2. the alert logic did not look at it: say why (pause, pull-down, monitoring off, late arrival)
     *  3. it is WARNING or CRITICAL and nothing changed: say that this is a continuation, so a reader does not look
     *     for an alert that was already raised earlier
     */
    static buildNote(this: void, reading: TemperatureReading, context: ReportContext): string | null {
        const alerts = context.alertsByTime.get(reading.recordedAt.getTime());

        if (alerts && alerts.length > 0) {
            return alerts.map((alert) => alert.reason ?? `State changed to ${alert.toState}.`).join(' ');
        }

        switch (reading.evaluation) {
            case 'PAUSED':
            case 'PULLING_DOWN':
                return ReportUtils.pauseNote(reading, context);

            case 'DEVICE_INACTIVE':
                return 'Alerts suppressed: monitoring is switched off for this device.';

            case 'LATE_ARRIVAL':
                return 'Late arrival: stored as history only, no alert evaluated.';

            case 'EVALUATED':
                return reading.state === 'WARNING' || reading.state === 'CRITICAL'
                    ? `Still ${reading.state}: no state change, so no new alert.`
                    : null;

            default: {
                // Compile-time exhaustiveness: adding an evaluation makes this line fail to type-check.
                const unhandled: never = reading.evaluation;
                throw new Error(`Unhandled reading evaluation: ${String(unhandled)}`);
            }
        }
    }

    static toRow(this: void, reading: TemperatureReading, context: ReportContext): TemperatureReportRow {
        return {
            recordedAt: reading.recordedAt,
            temperature: reading.temperature,
            receivedAt: reading.receivedAt,
            state: reading.state,
            evaluation: reading.evaluation,
            note: ReportUtils.buildNote(reading, context),
        };
    }

    /** Alerts and pauses of the period as one chronological list. Same moment: the pause first, it explains the rest. */
    static mergeEvents(this: void, alerts: ReportAlertEvent[], pauses: ReportPauseEvent[]): ReportEvent[] {
        const rank = (event: ReportEvent): number => (event.type === 'PAUSE' ? 0 : 1);

        return [...pauses, ...alerts].sort((a, b) => a.at.getTime() - b.at.getTime() || rank(a) - rank(b));
    }

    /** Counts per state and per evaluation. Every key is present, also with 0, so a table never has holes. */
    static summarize(
        this: void,
        counts: { state: TemperatureReading['state']; evaluation: TemperatureReading['evaluation']; total: number }[],
    ): TemperatureReportSummary {
        const byState = Object.fromEntries(TEMPERATURE_STATES.map((state) => [state, 0])) as Record<
            (typeof TEMPERATURE_STATES)[number],
            number
        >;
        const byEvaluation = Object.fromEntries(READING_EVALUATIONS.map((evaluation) => [evaluation, 0])) as Record<
            (typeof READING_EVALUATIONS)[number],
            number
        >;
        let total = 0;

        for (const row of counts) {
            byState[row.state] += row.total;
            byEvaluation[row.evaluation] += row.total;
            total += row.total;
        }

        return { total, byState, byEvaluation };
    }

    /** One line for the Events sheet and the timeline: what happened, in words. */
    static describeEvent(this: void, event: ReportEvent): string {
        if (event.type === 'ALERT') {
            return event.reason ?? `State changed from ${event.fromState} to ${event.toState}.`;
        }

        const label = TemperatureUtils.pauseLabel(event.kind);
        const target = event.scope === 'COLD_STORAGE' ? 'whole cold storage' : 'this device';
        const until = event.endsAt ? `until ${formatDateTime(event.endsAt)}` : 'until further notice';
        const pullDown =
            event.maxPulldownMinutes > 0 ? `, then up to ${event.maxPulldownMinutes} min pull-down allowance` : '';

        return `Planned ${label} on ${target}, ${until}${pullDown}. Alerts are suppressed.`;
    }

    private static pauseNote(reading: TemperatureReading, context: ReportContext): string {
        const pause = reading.pauseId ? context.pausesById.get(reading.pauseId) : undefined;

        // the pause row is always there in practice (it is restricted from deletion), but stay total
        if (!pause) {
            return reading.evaluation === 'PAUSED'
                ? 'Alerts suppressed: planned pause.'
                : 'Alerts suppressed: pull-down after a planned pause.';
        }

        const label = TemperatureUtils.pauseLabel(pause.kind);

        if (reading.evaluation === 'PAUSED') {
            return pause.endsAt
                ? `Alerts suppressed: ${label} from ${formatDateTime(pause.at)} to ${formatDateTime(pause.endsAt)}.`
                : `Alerts suppressed: ${label} since ${formatDateTime(pause.at)}, until further notice.`;
        }

        const ended = pause.endsAt ? ` that ended at ${formatDateTime(pause.endsAt)}` : '';

        return `Alerts suppressed: pulling down after the ${label}${ended} (up to ${pause.maxPulldownMinutes} min allowed).`;
    }
}
