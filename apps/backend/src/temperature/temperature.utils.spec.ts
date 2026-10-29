import type { AlertReason, DevicesState } from '../database/schema';
import { NOTIFIABLE_STATES, TemperatureState } from './temperature.type';
import { TemperatureUtils } from './temperature.utils';

const ALL_STATES: DevicesState[] = ['NORMAL', 'DEFROST', 'WARNING', 'CRITICAL', 'OFFLINE'];

describe('TemperatureUtils.getTemperatureState (device with a defrost state)', () => {
    const device = { defrostThreshold: 0, warningThreshold: 5, criticalThreshold: 10 };

    it('should return NORMAL when temperature is at or below the defrost threshold', () => {
        expect(TemperatureUtils.getTemperatureState(device, -5)).toBe(TemperatureState.NORMAL);
        expect(TemperatureUtils.getTemperatureState(device, 0)).toBe(TemperatureState.NORMAL);
    });

    it('should return DEFROST when temperature is strictly above defrost but below warning', () => {
        expect(TemperatureUtils.getTemperatureState(device, 0.01)).toBe(TemperatureState.DEFROST);
        expect(TemperatureUtils.getTemperatureState(device, 4.99)).toBe(TemperatureState.DEFROST);
    });

    it('should return WARNING from the warning threshold (inclusive) up to critical (exclusive)', () => {
        expect(TemperatureUtils.getTemperatureState(device, 5)).toBe(TemperatureState.WARNING);
        expect(TemperatureUtils.getTemperatureState(device, 9.99)).toBe(TemperatureState.WARNING);
    });

    it('should return CRITICAL from the critical threshold (inclusive) upwards', () => {
        expect(TemperatureUtils.getTemperatureState(device, 10)).toBe(TemperatureState.CRITICAL);
        expect(TemperatureUtils.getTemperatureState(device, 100)).toBe(TemperatureState.CRITICAL);
    });

    it('should prioritize CRITICAL over WARNING/DEFROST when thresholds overlap in value', () => {
        const tight = { defrostThreshold: 5, warningThreshold: 5, criticalThreshold: 5 };
        expect(TemperatureUtils.getTemperatureState(tight, 5)).toBe(TemperatureState.CRITICAL);
    });

    it('should handle negative thresholds correctly', () => {
        const freezer = { defrostThreshold: -20, warningThreshold: -15, criticalThreshold: -10 };
        expect(TemperatureUtils.getTemperatureState(freezer, -25)).toBe(TemperatureState.NORMAL);
        expect(TemperatureUtils.getTemperatureState(freezer, -18)).toBe(TemperatureState.DEFROST);
        expect(TemperatureUtils.getTemperatureState(freezer, -15)).toBe(TemperatureState.WARNING);
        expect(TemperatureUtils.getTemperatureState(freezer, -10)).toBe(TemperatureState.CRITICAL);
    });

    it('should classify a reading equal to a decimal threshold the same way every time', () => {
        // threshold (numeric(5,2) -> Number) and reading (JSON -> Number) come from the same decimal literal
        const decimal = { defrostThreshold: -20.1, warningThreshold: -15.3, criticalThreshold: -5.7 };
        expect(TemperatureUtils.getTemperatureState(decimal, -15.3)).toBe(TemperatureState.WARNING);
        expect(TemperatureUtils.getTemperatureState(decimal, -5.7)).toBe(TemperatureState.CRITICAL);
        expect(TemperatureUtils.getTemperatureState(decimal, -20.1)).toBe(TemperatureState.NORMAL);
    });
});

describe('TemperatureUtils.getTemperatureState (spiral: no defrost threshold)', () => {
    const spiral = { defrostThreshold: null, warningThreshold: -10, criticalThreshold: -5 };

    it('should be NORMAL for everything below the warning threshold', () => {
        expect(TemperatureUtils.getTemperatureState(spiral, -40)).toBe(TemperatureState.NORMAL);
        expect(TemperatureUtils.getTemperatureState(spiral, -10.01)).toBe(TemperatureState.NORMAL);
    });

    it('should never return DEFROST', () => {
        for (let t = -50; t <= 50; t += 0.5) {
            expect(TemperatureUtils.getTemperatureState(spiral, t)).not.toBe(TemperatureState.DEFROST);
        }
    });

    it('should keep the WARNING and CRITICAL boundaries', () => {
        expect(TemperatureUtils.getTemperatureState(spiral, -10)).toBe(TemperatureState.WARNING);
        expect(TemperatureUtils.getTemperatureState(spiral, -5.01)).toBe(TemperatureState.WARNING);
        expect(TemperatureUtils.getTemperatureState(spiral, -5)).toBe(TemperatureState.CRITICAL);
    });
});

describe('TemperatureUtils.getTemperatureState (invalid input)', () => {
    const device = { defrostThreshold: 0, warningThreshold: 5, criticalThreshold: 10 };

    it('should refuse non-finite readings instead of silently reporting NORMAL', () => {
        expect(() => TemperatureUtils.getTemperatureState(device, Number.NaN)).toThrow(RangeError);
        expect(() => TemperatureUtils.getTemperatureState(device, Number.POSITIVE_INFINITY)).toThrow(RangeError);
        expect(() => TemperatureUtils.getTemperatureState(device, Number.NEGATIVE_INFINITY)).toThrow(RangeError);
    });
});

describe('TemperatureUtils state helpers', () => {
    it('should detect escalation between temperature states only', () => {
        expect(TemperatureUtils.isEscalation('NORMAL', 'DEFROST')).toBe(true);
        expect(TemperatureUtils.isEscalation('WARNING', 'CRITICAL')).toBe(true);
        expect(TemperatureUtils.isEscalation('CRITICAL', 'WARNING')).toBe(false);
        expect(TemperatureUtils.isEscalation('WARNING', 'WARNING')).toBe(false);
        expect(TemperatureUtils.isEscalation('OFFLINE', 'CRITICAL')).toBe(false);
        expect(TemperatureUtils.isEscalation('CRITICAL', 'OFFLINE')).toBe(false);
    });

    it('should notify only for WARNING and CRITICAL', () => {
        expect([...NOTIFIABLE_STATES]).toEqual(['WARNING', 'CRITICAL']);
        expect(ALL_STATES.filter((state) => TemperatureUtils.shouldNotify(state))).toEqual(['WARNING', 'CRITICAL']);
    });

    it('should work when a method is passed around as a plain callback (no `this`)', () => {
        const { shouldNotify } = TemperatureUtils;
        expect(ALL_STATES.filter(shouldNotify)).toEqual(['WARNING', 'CRITICAL']);
    });
});

describe('TemperatureUtils.getAlertReason', () => {
    it('should return the expected reason for every one of the 25 transitions', () => {
        const byTarget: Record<Exclude<DevicesState, 'OFFLINE'>, AlertReason> = {
            NORMAL: 'TEMPERATURE_RECOVERED',
            DEFROST: 'DEFROST_DETECTED',
            WARNING: 'WARNING_TEMPERATURE',
            CRITICAL: 'CRITICAL_TEMPERATURE',
        };

        for (const from of ALL_STATES) {
            for (const to of ALL_STATES) {
                const expected: AlertReason =
                    to === 'OFFLINE'
                        ? 'DEVICE_OFFLINE'
                        : from === 'OFFLINE' && (to === 'NORMAL' || to === 'DEFROST')
                          ? 'DEVICE_RECOVERED'
                          : byTarget[to];

                expect(TemperatureUtils.getAlertReason(from, to)).toBe(expected);
            }
        }
    });

    it('should report the temperature when an offline device comes back already WARNING or CRITICAL', () => {
        expect(TemperatureUtils.getAlertReason('OFFLINE', 'WARNING')).toBe('WARNING_TEMPERATURE');
        expect(TemperatureUtils.getAlertReason('OFFLINE', 'CRITICAL')).toBe('CRITICAL_TEMPERATURE');
    });
});

describe('TemperatureUtils.buildAlertReason', () => {
    const lastSeenAt = new Date('2026-10-14T20:00:00.000Z');

    const baseDevice = { defrostThreshold: 0, warningThreshold: 5, criticalThreshold: 10, lastSeenAt };
    const spiralDevice = { ...baseDevice, defrostThreshold: null, warningThreshold: -10, criticalThreshold: -5 };

    it('should describe a defrost detection with the defrost-to-warning range', () => {
        const reason = TemperatureUtils.buildAlertReason('DEFROST_DETECTED', { temperature: 2, device: baseDevice });
        expect(reason).toContain('2°C');
        expect(reason).toContain('defrost range');
        expect(reason).toContain('0°C to 5°C');
    });

    it('should word a drop into the defrost range as an improvement', () => {
        const reason = TemperatureUtils.buildAlertReason('DEFROST_DETECTED', {
            temperature: 3,
            device: baseDevice,
            fromState: 'WARNING',
        });
        expect(reason).toContain('fell from WARNING into the defrost range');
    });

    it('should not print "null" for a device without a defrost threshold', () => {
        const reason = TemperatureUtils.buildAlertReason('DEFROST_DETECTED', { temperature: 1, device: spiralDevice });
        expect(reason).not.toContain('null');
    });

    it('should describe warning, critical and the CRITICAL -> WARNING improvement', () => {
        const warning = TemperatureUtils.buildAlertReason('WARNING_TEMPERATURE', {
            temperature: 6,
            device: baseDevice,
        });
        expect(warning).toContain('exceeded warning threshold (5°C to 10°C)');

        const critical = TemperatureUtils.buildAlertReason('CRITICAL_TEMPERATURE', {
            temperature: 12,
            device: baseDevice,
        });
        expect(critical).toContain('exceeded critical threshold (above 10°C)');

        const improving = TemperatureUtils.buildAlertReason('WARNING_TEMPERATURE', {
            temperature: 7,
            device: baseDevice,
            fromState: 'CRITICAL',
        });
        expect(improving).toContain('dropped below the critical threshold');
        expect(improving).not.toContain('exceeded');
    });

    it('should describe recovery as "up to defrost" or, for a spiral, "below warning"', () => {
        expect(
            TemperatureUtils.buildAlertReason('TEMPERATURE_RECOVERED', { temperature: -1, device: baseDevice }),
        ).toContain('up to 0°C');
        const spiral = TemperatureUtils.buildAlertReason('TEMPERATURE_RECOVERED', {
            temperature: -15,
            device: spiralDevice,
        });
        expect(spiral).toContain('below -10°C');
        expect(spiral).not.toContain('null');
    });

    it('should explain an alert raised after a planned pause ran out of pull-down time', () => {
        const reason = TemperatureUtils.buildAlertReason('CRITICAL_TEMPERATURE', {
            temperature: -2,
            device: spiralDevice,
            fromState: 'NORMAL',
            pause: { kind: 'MACHINE_OFF', endedAt: new Date('2026-01-01T07:00:00.000Z') },
        });
        expect(reason).toContain('machine-off period');
        expect(reason).toContain('pull-down time has passed');

        const maintenance = TemperatureUtils.buildAlertReason('WARNING_TEMPERATURE', {
            temperature: -8,
            device: spiralDevice,
            pause: { kind: 'MAINTENANCE', endedAt: new Date('2026-01-01T07:00:00.000Z') },
        });
        expect(maintenance).toContain('after the maintenance ended');
    });

    it('should print clean numbers (no float noise, no "-0")', () => {
        const noisy = { ...baseDevice, warningThreshold: 4.1000000001, criticalThreshold: 10 };
        const reason = TemperatureUtils.buildAlertReason('WARNING_TEMPERATURE', { temperature: -0, device: noisy });
        expect(reason).toContain('Temperature 0°C');
        expect(reason).toContain('4.1°C to 10°C');
    });

    describe('a device that comes back after an outage', () => {
        // went silent at 20:00 UTC while at -21°C, came back 2 h 15 min later
        const device = {
            ...baseDevice,
            defrostThreshold: -20,
            warningThreshold: -15,
            criticalThreshold: -5,
            lastTemperature: -21,
        };
        const occurredAt = new Date('2026-10-14T22:15:00.000Z');

        it('should say how long it was offline and what it read before, when it returns CRITICAL', () => {
            const reason = TemperatureUtils.buildAlertReason('CRITICAL_TEMPERATURE', {
                device,
                temperature: -3,
                fromState: 'OFFLINE',
                occurredAt,
            });
            expect(reason).toContain('exceeded critical threshold');
            expect(reason).toContain('after being offline for 2 h 15 min');
            expect(reason).toContain('Last reading before that: -21°C');
        });

        it('should do the same when it returns WARNING', () => {
            const reason = TemperatureUtils.buildAlertReason('WARNING_TEMPERATURE', {
                device,
                temperature: -12,
                fromState: 'OFFLINE',
                occurredAt,
            });
            expect(reason).toContain('exceeded warning threshold');
            expect(reason).toContain('after being offline for 2 h 15 min');
        });

        it('should report a healthy comeback with the current temperature', () => {
            const reason = TemperatureUtils.buildAlertReason('DEVICE_RECOVERED', {
                device,
                temperature: -22,
                fromState: 'OFFLINE',
                occurredAt,
            });
            expect(reason).toContain('Device resumed sending data after being offline for 2 h 15 min.');
            expect(reason).toContain('Temperature now -22°C.');
        });

        it('should leave the duration out instead of inventing one when times are missing or inconsistent', () => {
            const noTime = TemperatureUtils.buildAlertReason('CRITICAL_TEMPERATURE', {
                device,
                temperature: -3,
                fromState: 'OFFLINE',
            });
            expect(noTime).toContain('after being offline.');
            expect(noTime).not.toContain(' for ');

            // row already touched: lastSeenAt is not earlier than the reading
            const touched = TemperatureUtils.buildAlertReason('CRITICAL_TEMPERATURE', {
                device: { ...device, lastSeenAt: new Date('2026-10-14T22:15:30.000Z') },
                temperature: -3,
                fromState: 'OFFLINE',
                occurredAt,
            });
            expect(touched).toContain('after being offline.');
        });

        it('should keep the plain wording when no extra context is given', () => {
            expect(TemperatureUtils.buildAlertReason('DEVICE_RECOVERED', { device: baseDevice })).toBe(
                'Device resumed sending data.',
            );
        });
    });

    describe('a device that goes offline', () => {
        it('should say when it was last seen, plus its last reading and state', () => {
            const reason = TemperatureUtils.buildAlertReason('DEVICE_OFFLINE', {
                device: { ...baseDevice, lastTemperature: 7.5 },
                fromState: 'WARNING',
            });
            expect(reason).toContain('stopped sending data');
            expect(reason).toContain('Last seen at');
            expect(reason).toContain('Last reading 7.5°C (WARNING)');
        });

        it('should stay short when the last reading is unknown', () => {
            const reason = TemperatureUtils.buildAlertReason('DEVICE_OFFLINE', { device: baseDevice });
            expect(reason).not.toContain('Last reading');
        });
    });

    describe('formatting of outage length', () => {
        const back = (ms: number) =>
            TemperatureUtils.buildAlertReason('DEVICE_RECOVERED', {
                device: { ...baseDevice, lastSeenAt },
                fromState: 'OFFLINE',
                occurredAt: new Date(lastSeenAt.getTime() + ms),
            });

        it('should format seconds, minutes, hours and days', () => {
            expect(back(30_000)).toContain('for less than a minute');
            expect(back(59 * 60_000)).toContain('for 59 min');
            expect(back(60 * 60_000)).toContain('for 1 h.');
            expect(back((25 * 60 + 5) * 60_000)).toContain('for 1 d 1 h 5 min');
        });
    });

    it('should never print null / undefined / NaN for any transition, device type or amount of context', () => {
        const devices = [
            { ...baseDevice, defrostThreshold: -20, warningThreshold: -15, criticalThreshold: -5 },
            { ...baseDevice, defrostThreshold: null, warningThreshold: -15, criticalThreshold: -5 },
            {
                ...baseDevice,
                defrostThreshold: null,
                warningThreshold: -15,
                criticalThreshold: -5,
                lastTemperature: -21,
            },
        ];
        const occurredAt = new Date(lastSeenAt.getTime() + 3_600_000);

        for (const device of devices) {
            for (const from of ALL_STATES) {
                for (const to of ALL_STATES) {
                    const code = TemperatureUtils.getAlertReason(from, to);

                    for (const temperature of [undefined, -12]) {
                        for (const extra of [
                            {},
                            { occurredAt },
                            { occurredAt, pause: { kind: 'MACHINE_OFF' as const, endedAt: occurredAt } },
                        ]) {
                            const text = TemperatureUtils.buildAlertReason(code, {
                                device,
                                temperature,
                                fromState: from,
                                ...extra,
                            });
                            expect(/null|undefined|NaN/.test(text)).toBe(false);
                        }
                    }
                }
            }
        }
    });
});

describe('TemperatureUtils.getEvaluation', () => {
    const active = { status: 'ACTIVE' as const, pause: null };

    it('should be EVALUATED for a monitored device with no pause', () => {
        expect(TemperatureUtils.getEvaluation({ isActive: true, monitoring: active })).toEqual({
            evaluation: 'EVALUATED',
            pauseId: null,
        });
    });

    it('should name the pause for PAUSED and PULLING_DOWN', () => {
        expect(
            TemperatureUtils.getEvaluation({ isActive: true, monitoring: { status: 'PAUSED', pause: { id: 'p1' } } }),
        ).toEqual({ evaluation: 'PAUSED', pauseId: 'p1' });
        expect(
            TemperatureUtils.getEvaluation({
                isActive: true,
                monitoring: { status: 'PULLING_DOWN', pause: { id: 'p1' } },
            }),
        ).toEqual({ evaluation: 'PULLING_DOWN', pauseId: 'p1' });
    });

    it('should be DEVICE_INACTIVE, without a pause, when monitoring is switched off', () => {
        expect(TemperatureUtils.getEvaluation({ isActive: false, monitoring: active })).toEqual({
            evaluation: 'DEVICE_INACTIVE',
            pauseId: null,
        });
    });

    it('should prefer the pause over a switched-off device, because it names the reason', () => {
        expect(
            TemperatureUtils.getEvaluation({ isActive: false, monitoring: { status: 'PAUSED', pause: { id: 'p1' } } }),
        ).toEqual({ evaluation: 'PAUSED', pauseId: 'p1' });
    });
});

describe('TemperatureUtils.pauseLabel', () => {
    it('should give the words alert texts use', () => {
        expect(TemperatureUtils.pauseLabel('MAINTENANCE')).toBe('maintenance');
        expect(TemperatureUtils.pauseLabel('MACHINE_OFF')).toBe('machine-off period');
    });
});
