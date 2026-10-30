import { formatDateTime } from '@/common/utils/format_date_time';
import type {
    ReportAlertEvent,
    ReportEvent,
    ReportPauseEvent,
    TemperatureHourlyRow,
    TemperatureReading,
    TemperatureReportRow,
    TemperatureReportSummary,
} from '@workspace/shared';
import { READING_EVALUATIONS, TEMPERATURE_STATES } from '@workspace/validator';
import type { HourlyAggregate } from './temperature.type';
import { TemperatureUtils } from './temperature.utils';

/** What a report needs to explain a reading: the alerts and pauses of the period, indexed for lookup. */
export type ReportContext = {
    /** Alerts by the exact moment of the reading that raised them (epoch ms). */
    alertsByTime: Map<number, ReportAlertEvent[]>;
    pausesById: Map<string, ReportPauseEvent>;
};

const HOUR_MS = 3_600_000;

/** Below this share of the expected readings, an hour gets a "low coverage" note. */
export const LOW_COVERAGE_PERCENT = 80;

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

    /**
     * The hourly report: one row per hour from the start of the period up to now (or its end, whichever is first).
     * Hours the database has no summary for are filled in as "no readings" rows, so a silent device shows up as a
     * gap with its reason instead of as a missing line.
     *
     * Hours are matched by epoch milliseconds. The plant time zone has whole-hour offsets (WIB is UTC+7), so a
     * period starts exactly on an hour boundary and the database buckets (`date_trunc` in that zone) fall on the same
     * boundaries as `HOUR_MS` steps. A zone with a half-hour offset would need real calendar math here.
     */
    static buildHourly(
        this: void,
        input: {
            aggregates: HourlyAggregate[];
            alerts: ReportAlertEvent[];
            range: { from: Date; to: Date };
            heartbeatSeconds: number;
            now: Date;
        },
    ): TemperatureHourlyRow[] {
        const { aggregates, alerts, range, heartbeatSeconds, now } = input;

        const byHour = new Map(aggregates.map((aggregate) => [aggregate.hour.getTime(), aggregate]));
        const alertsByHour = new Map<number, ReportAlertEvent[]>();

        for (const alert of alerts) {
            const key = Math.floor(alert.at.getTime() / HOUR_MS) * HOUR_MS;

            alertsByHour.set(key, [...(alertsByHour.get(key) ?? []), alert]);
        }

        const rows: TemperatureHourlyRow[] = [];
        const until = Math.min(range.to.getTime(), now.getTime());

        for (let start = range.from.getTime(); start < until; start += HOUR_MS) {
            const aggregate = byHour.get(start);
            const hourAlerts = alertsByHour.get(start) ?? [];

            // an hour still going has only had part of its readings so far
            const inProgress = start + HOUR_MS > now.getTime();
            const elapsedSeconds = Math.min(HOUR_MS, now.getTime() - start) / 1000;
            const expectedReadings = heartbeatSeconds > 0 ? Math.round(elapsedSeconds / heartbeatSeconds) : 0;
            const readings = aggregate?.readings ?? 0;
            const coverage =
                expectedReadings > 0 ? Math.min(100, Math.round((readings / expectedReadings) * 100)) : null;

            const notEvaluated = aggregate
                ? aggregate.pausedCount + aggregate.pullingDownCount + aggregate.inactiveCount + aggregate.lateCount
                : 0;

            rows.push({
                hour: new Date(start),
                readings,
                expectedReadings,
                coverage,
                minTemperature: aggregate?.min ?? null,
                avgTemperature: aggregate?.avg ?? null,
                maxTemperature: aggregate?.max ?? null,
                worstState: aggregate?.worstState ?? null,
                warningCount: aggregate?.warningCount ?? 0,
                criticalCount: aggregate?.criticalCount ?? 0,
                notEvaluated,
                inProgress,
                note: ReportUtils.hourNote({
                    aggregate,
                    hourAlerts,
                    coverage,
                    expectedReadings,
                    notEvaluated,
                    inProgress,
                }),
            });
        }

        return rows;
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

    /** "10:12" of a moment, in the plant time zone. */
    private static clock(date: Date): string {
        // formatDateTime gives "15-OCT-2026 10:12:30": the clock starts after the date and its space
        return formatDateTime(date).slice(12, 17);
    }

    /**
     * What explains an hour, in order: it is not over, no data came, alerts were raised, alerts were not looked at,
     * an excursion went on without a state change, or data came in thinly. Null when there is nothing to explain.
     */
    private static hourNote(context: {
        aggregate: HourlyAggregate | undefined;
        hourAlerts: ReportAlertEvent[];
        coverage: number | null;
        expectedReadings: number;
        notEvaluated: number;
        inProgress: boolean;
    }): string | null {
        const { aggregate, hourAlerts, coverage, expectedReadings, notEvaluated, inProgress } = context;
        const notes: string[] = [];

        if (inProgress) notes.push('Hour in progress: numbers may still change.');

        if (!aggregate) {
            notes.push('No readings received.');
        }

        if (hourAlerts.length > 0) {
            const items = hourAlerts.map((alert) => `${alert.toState} at ${ReportUtils.clock(alert.at)}`);

            notes.push(`${hourAlerts.length} alert${hourAlerts.length > 1 ? 's' : ''}: ${items.join(', ')}.`);
        }

        if (aggregate && notEvaluated > 0) {
            const causes = [
                aggregate.pausedCount > 0 && `planned pause ${aggregate.pausedCount}`,
                aggregate.pullingDownCount > 0 && `pull-down ${aggregate.pullingDownCount}`,
                aggregate.inactiveCount > 0 && `monitoring off ${aggregate.inactiveCount}`,
                aggregate.lateCount > 0 && `late arrival ${aggregate.lateCount}`,
            ].filter(Boolean);

            notes.push(
                `Alerts not evaluated for ${notEvaluated} of ${aggregate.readings} readings (${causes.join(', ')}).`,
            );
        }

        if (aggregate && aggregate.evaluatedExcursions > 0 && hourAlerts.length === 0) {
            notes.push('WARNING/CRITICAL continued without a state change, so no new alert.');
        }

        if (aggregate && !inProgress && coverage !== null && coverage < LOW_COVERAGE_PERCENT) {
            notes.push(
                `Low coverage: ${aggregate.readings} of about ${expectedReadings} expected readings (device offline or reporting late).`,
            );
        }

        return notes.length > 0 ? notes.join(' ') : null;
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
