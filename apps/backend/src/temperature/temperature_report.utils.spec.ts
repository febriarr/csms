import type { ReportAlertEvent, ReportPauseEvent, TemperatureReading } from '@workspace/shared';
import type { HourlyAggregate } from './temperature.type';
import { ReportUtils } from './temperature_report.utils';

const T0 = new Date('2026-10-15T03:00:00.000Z'); // 10:00:00 WIB

const reading = (overrides: Partial<TemperatureReading> = {}): TemperatureReading => ({
    recordedAt: T0,
    temperature: -22,
    receivedAt: new Date(T0.getTime() + 1000),
    state: 'NORMAL',
    evaluation: 'EVALUATED',
    pauseId: null,
    ...overrides,
});

const alert = (overrides: Partial<ReportAlertEvent> = {}): ReportAlertEvent => ({
    type: 'ALERT',
    at: T0,
    fromState: 'NORMAL',
    toState: 'WARNING',
    reasonCode: 'WARNING_TEMPERATURE',
    reason: 'Temperature -12°C exceeded warning threshold (-15°C to -5°C).',
    temperature: -12,
    ...overrides,
});

const pause = (overrides: Partial<ReportPauseEvent> = {}): ReportPauseEvent => ({
    type: 'PAUSE',
    id: 'p1',
    at: new Date('2026-10-15T01:00:00.000Z'),
    kind: 'MACHINE_OFF',
    scope: 'DEVICE',
    endsAt: new Date('2026-10-15T05:00:00.000Z'),
    maxPulldownMinutes: 30,
    note: null,
    ...overrides,
});

const context = (alerts: ReportAlertEvent[] = [], pauses: ReportPauseEvent[] = []) =>
    ReportUtils.createContext(alerts, pauses);

describe('ReportUtils.buildNote', () => {
    it('should be empty for a normal reading nobody needed to look at', () => {
        expect(ReportUtils.buildNote(reading(), context())).toBeNull();
    });

    it('should use the alert text when the reading raised an alert', () => {
        const note = ReportUtils.buildNote(reading({ state: 'WARNING' }), context([alert()]));

        expect(note).toBe('Temperature -12°C exceeded warning threshold (-15°C to -5°C).');
    });

    it('should join several alerts raised by the same reading', () => {
        const second = alert({ reason: 'Second.' });

        expect(ReportUtils.buildNote(reading(), context([alert({ reason: 'First.' }), second]))).toBe('First. Second.');
    });

    it('should fall back to the new state when an alert has no text', () => {
        expect(ReportUtils.buildNote(reading(), context([alert({ reason: null })]))).toBe('State changed to WARNING.');
    });

    it('should not attach an alert of another moment', () => {
        const other = alert({ at: new Date(T0.getTime() + 30_000) });

        expect(ReportUtils.buildNote(reading(), context([other]))).toBeNull();
    });

    it('should say a WARNING or CRITICAL reading without an alert is a continuation', () => {
        expect(ReportUtils.buildNote(reading({ state: 'WARNING' }), context())).toContain('Still WARNING');
        expect(ReportUtils.buildNote(reading({ state: 'CRITICAL' }), context())).toContain('Still CRITICAL');
    });

    it('should keep DEFROST quiet: it is not an incident', () => {
        expect(ReportUtils.buildNote(reading({ state: 'DEFROST' }), context())).toBeNull();
    });

    describe('when the alert logic did not look at the reading', () => {
        it('should name the planned pause and its window: this is the "why no alert" answer', () => {
            const note = ReportUtils.buildNote(
                reading({ state: 'CRITICAL', evaluation: 'PAUSED', pauseId: 'p1' }),
                context([], [pause()]),
            );

            expect(note).toBe(
                'Alerts suppressed: machine-off period from 15-OCT-2026 08:00:00 to 15-OCT-2026 12:00:00.',
            );
        });

        it('should say "until further notice" for a pause without an end', () => {
            const note = ReportUtils.buildNote(
                reading({ evaluation: 'PAUSED', pauseId: 'p1' }),
                context([], [pause({ kind: 'MAINTENANCE', endsAt: null })]),
            );

            expect(note).toBe('Alerts suppressed: maintenance since 15-OCT-2026 08:00:00, until further notice.');
        });

        it('should describe the pull-down after a pause', () => {
            const note = ReportUtils.buildNote(
                reading({ state: 'WARNING', evaluation: 'PULLING_DOWN', pauseId: 'p1' }),
                context([], [pause()]),
            );

            expect(note).toBe(
                'Alerts suppressed: pulling down after the machine-off period that ended at 15-OCT-2026 12:00:00 (up to 30 min allowed).',
            );
        });

        it('should stay total when the pause row is not in the period lists', () => {
            expect(ReportUtils.buildNote(reading({ evaluation: 'PAUSED', pauseId: 'gone' }), context())).toBe(
                'Alerts suppressed: planned pause.',
            );
            expect(ReportUtils.buildNote(reading({ evaluation: 'PULLING_DOWN', pauseId: 'gone' }), context())).toBe(
                'Alerts suppressed: pull-down after a planned pause.',
            );
        });

        it('should explain a switched-off device', () => {
            expect(ReportUtils.buildNote(reading({ evaluation: 'DEVICE_INACTIVE' }), context())).toContain(
                'monitoring is switched off',
            );
        });

        it('should explain a late arrival', () => {
            expect(ReportUtils.buildNote(reading({ evaluation: 'LATE_ARRIVAL' }), context())).toContain('Late arrival');
        });
    });

    it('should never print null, undefined or NaN', () => {
        const states = ['NORMAL', 'DEFROST', 'WARNING', 'CRITICAL'] as const;
        const evaluations = ['EVALUATED', 'PAUSED', 'PULLING_DOWN', 'DEVICE_INACTIVE', 'LATE_ARRIVAL'] as const;

        for (const state of states) {
            for (const evaluation of evaluations) {
                for (const ctx of [
                    context(),
                    context([alert({ reason: null })], [pause()]),
                    context([], [pause({ endsAt: null })]),
                ]) {
                    const note = ReportUtils.buildNote(reading({ state, evaluation, pauseId: 'p1' }), ctx);

                    expect(/null|undefined|NaN/.test(note ?? '')).toBe(false);
                }
            }
        }
    });
});

describe('ReportUtils.toRow', () => {
    it('should keep the raw reading untouched and add the note', () => {
        const row = ReportUtils.toRow(reading({ temperature: -3.5, state: 'CRITICAL' }), context());

        expect(row).toMatchObject({ recordedAt: T0, temperature: -3.5, state: 'CRITICAL', evaluation: 'EVALUATED' });
        expect(row.note).toContain('Still CRITICAL');
    });
});

describe('ReportUtils.mergeEvents', () => {
    it('should order alerts and pauses by time, a pause first when they start at the same moment', () => {
        const early = alert({ at: new Date('2026-10-15T00:00:00.000Z') });
        const samePause = pause({ at: T0 });
        const sameAlert = alert({ at: T0 });
        const late = alert({ at: new Date('2026-10-15T09:00:00.000Z') });

        const merged = ReportUtils.mergeEvents([late, sameAlert, early], [samePause]);

        expect(merged).toEqual([early, samePause, sameAlert, late]);
    });

    it('should not change the input lists', () => {
        const alerts = [alert({ at: new Date(T0.getTime() + 5) }), alert()];
        const copy = [...alerts];

        ReportUtils.mergeEvents(alerts, []);

        expect(alerts).toEqual(copy);
    });
});

describe('ReportUtils.summarize', () => {
    it('should count per state and per evaluation, with zeros for what did not occur', () => {
        const summary = ReportUtils.summarize([
            { state: 'NORMAL', evaluation: 'EVALUATED', total: 90 },
            { state: 'CRITICAL', evaluation: 'PAUSED', total: 8 },
            { state: 'CRITICAL', evaluation: 'EVALUATED', total: 2 },
        ]);

        expect(summary.total).toBe(100);
        expect(summary.byState).toEqual({ NORMAL: 90, DEFROST: 0, WARNING: 0, CRITICAL: 10 });
        expect(summary.byEvaluation).toEqual({
            EVALUATED: 92,
            PAUSED: 8,
            PULLING_DOWN: 0,
            DEVICE_INACTIVE: 0,
            LATE_ARRIVAL: 0,
        });
    });

    it('should be all zeros for an empty period', () => {
        expect(ReportUtils.summarize([]).total).toBe(0);
    });
});

describe('ReportUtils.describeEvent', () => {
    it('should use the alert text, or the transition when there is none', () => {
        expect(ReportUtils.describeEvent(alert())).toContain('exceeded warning threshold');
        expect(ReportUtils.describeEvent(alert({ reason: null }))).toBe('State changed from NORMAL to WARNING.');
    });

    it('should describe a pause with its target, end and pull-down allowance', () => {
        expect(ReportUtils.describeEvent(pause())).toBe(
            'Planned machine-off period on this device, until 15-OCT-2026 12:00:00, then up to 30 min pull-down allowance. Alerts are suppressed.',
        );
        expect(
            ReportUtils.describeEvent(
                pause({ kind: 'MAINTENANCE', scope: 'COLD_STORAGE', endsAt: null, maxPulldownMinutes: 0 }),
            ),
        ).toBe('Planned maintenance on whole cold storage, until further notice. Alerts are suppressed.');
    });
});

describe('ReportUtils.buildHourly', () => {
    // the period is 15 OCT 2026 in WIB: 00:00 WIB = 17:00 UTC the day before
    const range = { from: new Date('2026-10-14T17:00:00.000Z'), to: new Date('2026-10-15T17:00:00.000Z') };
    const hourAt = (utcHour: number) => new Date(Date.UTC(2026, 9, 15, utcHour));

    // 08:30 WIB: the hour 08:00-09:00 WIB (01:00 UTC) is half over
    const NOW = new Date('2026-10-15T01:30:00.000Z');

    const aggregate = (overrides: Partial<HourlyAggregate> = {}): HourlyAggregate => ({
        hour: hourAt(0),
        readings: 120,
        min: -23,
        avg: -22.1,
        max: -20.5,
        worstState: 'NORMAL',
        warningCount: 0,
        criticalCount: 0,
        pausedCount: 0,
        pullingDownCount: 0,
        inactiveCount: 0,
        lateCount: 0,
        evaluatedExcursions: 0,
        ...overrides,
    });

    const build = (aggregates: HourlyAggregate[], alerts: ReportAlertEvent[] = [], now: Date = NOW) =>
        ReportUtils.buildHourly({ aggregates, alerts, range, heartbeatSeconds: 30, now });

    it('should list every hour of the period up to now, also the ones without readings', () => {
        const rows = build([aggregate()]);

        // 00:00 WIB (17:00 UTC) up to and including the hour in progress
        expect(rows.length).toBe(9);
        expect(rows[0].hour).toEqual(range.from);
        expect(rows[8].hour).toEqual(hourAt(1));
        expect(rows.map((row) => row.hour.getTime())).toEqual(
            [...rows].map((row) => row.hour.getTime()).sort((a, b) => a - b),
        );
    });

    it('should show an hour without readings as a gap with null temperatures, not skip it', () => {
        const [first] = build([]);

        expect(first).toMatchObject({
            readings: 0,
            coverage: 0,
            minTemperature: null,
            avgTemperature: null,
            maxTemperature: null,
            worstState: null,
            notEvaluated: 0,
            note: 'No readings received.',
        });
    });

    it('should carry min, avg, max and the worst state of an hour', () => {
        const rows = build([aggregate({ min: -23, avg: -18.4, max: -4, worstState: 'CRITICAL', criticalCount: 3 })]);
        const hour = rows.find((row) => row.hour.getTime() === hourAt(0).getTime());

        expect(hour).toMatchObject({
            minTemperature: -23,
            avgTemperature: -18.4,
            maxTemperature: -4,
            worstState: 'CRITICAL',
            criticalCount: 3,
        });
    });

    describe('coverage', () => {
        it('should be readings against what the heartbeat says should arrive', () => {
            // 30 s heartbeat: 120 an hour
            expect(build([aggregate({ hour: range.from, readings: 120 })])[0]).toMatchObject({
                expectedReadings: 120,
                coverage: 100,
            });
            expect(build([aggregate({ hour: range.from, readings: 90 })])[0].coverage).toBe(75);
        });

        it('should never go above 100 (the heartbeat was changed after the readings were taken)', () => {
            expect(build([aggregate({ hour: range.from, readings: 300 })])[0].coverage).toBe(100);
        });

        it('should measure the hour in progress against the time that has passed', () => {
            // 30 minutes have passed: 60 readings are all that could have arrived
            const [current] = build([aggregate({ hour: hourAt(1), readings: 60 })]).slice(-1);

            expect(current).toMatchObject({ inProgress: true, expectedReadings: 60, coverage: 100 });
            expect(current.note).toBe('Hour in progress: numbers may still change.');
        });

        it('should be null when nothing was expected yet', () => {
            const now = new Date(range.from.getTime() + 1);
            const [first] = ReportUtils.buildHourly({ aggregates: [], alerts: [], range, heartbeatSeconds: 3600, now });

            expect(first.coverage).toBeNull();
        });

        it('should add a low coverage note, but not for an hour that is not over', () => {
            const thin = build([aggregate({ hour: range.from, readings: 40 })])[0];

            expect(thin.note).toBe(
                'Low coverage: 40 of about 120 expected readings (device offline or reporting late).',
            );

            const current = build([aggregate({ hour: hourAt(1), readings: 5 })]).slice(-1)[0];

            expect(current.note).not.toContain('Low coverage');
        });
    });

    describe('alerts of the hour', () => {
        const alert = (at: string, toState: ReportAlertEvent['toState'] = 'WARNING'): ReportAlertEvent => ({
            type: 'ALERT',
            at: new Date(at),
            fromState: 'NORMAL',
            toState,
            reasonCode: 'WARNING_TEMPERATURE',
            reason: 'x',
            temperature: -12,
        });

        it('should list them with the clock time in the plant time zone', () => {
            // 03:12 UTC = 10:12 WIB, in the hour that starts at 03:00 UTC
            const rows = ReportUtils.buildHourly({
                aggregates: [aggregate({ hour: hourAt(3), readings: 120 })],
                alerts: [alert('2026-10-15T03:12:00.000Z'), alert('2026-10-15T03:40:00.000Z', 'CRITICAL')],
                range,
                heartbeatSeconds: 30,
                now: new Date('2026-10-15T10:00:00.000Z'),
            });

            expect(rows.find((row) => row.hour.getTime() === hourAt(3).getTime())?.note).toBe(
                '2 alerts: WARNING at 10:12, CRITICAL at 10:40.',
            );
        });

        it('should explain an hour with no readings by the offline alert', () => {
            const rows = ReportUtils.buildHourly({
                aggregates: [],
                alerts: [alert('2026-10-15T03:05:00.000Z', 'OFFLINE')],
                range,
                heartbeatSeconds: 30,
                now: new Date('2026-10-15T10:00:00.000Z'),
            });

            expect(rows.find((row) => row.hour.getTime() === hourAt(3).getTime())?.note).toBe(
                'No readings received. 1 alert: OFFLINE at 10:05.',
            );
        });

        it('should not put an alert in the neighbouring hour', () => {
            const rows = ReportUtils.buildHourly({
                aggregates: [],
                alerts: [alert('2026-10-15T03:59:59.000Z')],
                range,
                heartbeatSeconds: 30,
                now: new Date('2026-10-15T10:00:00.000Z'),
            });

            expect(rows.find((row) => row.hour.getTime() === hourAt(4).getTime())?.note).toBe('No readings received.');
        });
    });

    describe('readings the alert logic did not look at', () => {
        it('should count them and name why: this answers "above the threshold but no alert" for the hour', () => {
            const rows = build([
                aggregate({
                    hour: range.from,
                    readings: 120,
                    worstState: 'CRITICAL',
                    criticalCount: 12,
                    pausedCount: 8,
                    pullingDownCount: 4,
                }),
            ]);

            expect(rows[0].notEvaluated).toBe(12);
            expect(rows[0].note).toBe('Alerts not evaluated for 12 of 120 readings (planned pause 8, pull-down 4).');
        });

        it('should name every cause', () => {
            const [first] = build([
                aggregate({ hour: range.from, pausedCount: 1, pullingDownCount: 2, inactiveCount: 3, lateCount: 4 }),
            ]);

            expect(first.note).toBe(
                'Alerts not evaluated for 10 of 120 readings (planned pause 1, pull-down 2, monitoring off 3, late arrival 4).',
            );
        });

        it('should say an excursion went on without a state change when it was looked at and raised nothing', () => {
            const [first] = build([
                aggregate({ hour: range.from, worstState: 'WARNING', warningCount: 120, evaluatedExcursions: 120 }),
            ]);

            expect(first.note).toBe('WARNING/CRITICAL continued without a state change, so no new alert.');
        });

        it('should not say that when an alert was raised in the hour', () => {
            const [first] = ReportUtils.buildHourly({
                aggregates: [aggregate({ hour: range.from, worstState: 'WARNING', evaluatedExcursions: 5 })],
                alerts: [
                    {
                        type: 'ALERT',
                        at: new Date(range.from.getTime() + 60_000),
                        fromState: 'NORMAL',
                        toState: 'WARNING',
                        reasonCode: 'WARNING_TEMPERATURE',
                        reason: null,
                        temperature: -12,
                    },
                ],
                range,
                heartbeatSeconds: 30,
                now: NOW,
            });

            expect(first.note).not.toContain('continued');
            expect(first.note).toContain('1 alert: WARNING at 00:01.');
        });
    });

    describe('the edges of the period', () => {
        it('should stop at the end of the period when it is over', () => {
            const rows = build([], [], new Date('2026-10-20T00:00:00.000Z'));

            expect(rows.length).toBe(24);
            expect(rows.some((row) => row.inProgress)).toBe(false);
        });

        it('should be empty for a period that has not started', () => {
            expect(build([], [], new Date('2026-10-10T00:00:00.000Z'))).toEqual([]);
        });

        it('should be fine with a heartbeat of zero: nothing is expected, nothing is divided', () => {
            const [first] = ReportUtils.buildHourly({
                aggregates: [aggregate({ hour: range.from })],
                alerts: [],
                range,
                heartbeatSeconds: 0,
                now: NOW,
            });

            expect(first).toMatchObject({ expectedReadings: 0, coverage: null });
        });
    });

    it('should never print null, undefined or NaN in a note', () => {
        const rows = build([
            aggregate({ hour: range.from, readings: 10, pausedCount: 1, evaluatedExcursions: 2 }),
            aggregate({ hour: hourAt(0), readings: 0 }),
        ]);

        for (const row of rows) expect(/null|undefined|NaN/.test(row.note ?? '')).toBe(false);
    });
});
