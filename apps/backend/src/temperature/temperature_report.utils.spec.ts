import type { ReportAlertEvent, ReportPauseEvent, TemperatureReading } from '@workspace/shared';
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
