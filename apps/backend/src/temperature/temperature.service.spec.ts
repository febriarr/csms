import type { AlertService } from '@/alert/alert.service';
import { EntityNotFoundException, ValidationException } from '@/common/exception/app.exception';
import type { InserAlert } from '@/database/schema';
import type { DeviceRepository } from '@/device/device.repository';
import { aDevice } from '@/device/device.fixture';
import type { DiagnosticService } from '@/diagnostic/diagnostic.service';
import type { DeviceEventService } from '@/event/device_event.service';
import type { MonitoringPauseService } from '@/monitoring_pause/monitoring_pause.service';
import type { NotificationOutboxService } from '@/notification/notification_outbox.service';
import { TemperatureService } from './temperature.service';
import type { TemperatureRepository } from './temperature.repository';
import type { DeviceUpdateEvent, DeviceWithPlace, ExpiredPause, TemperatureReading } from '@workspace/shared';
import type { TelemetryInput } from '@workspace/validator';

const TX = { tx: true };

type Options = {
    device?: DeviceWithPlace | null;
    stored?: boolean;
    paused?: boolean;
    expiredPause?: ExpiredPause | null;
    failAlertRecord?: boolean;
    page?: { items: TemperatureReading[]; total: number };
};

/** Fakes for every collaborator, plus a record of what the service did and in which order. */
function setup(options: Options = {}) {
    const device = options.device === undefined ? aDevice() : options.device;
    const calls: string[] = [];
    let committed = false;

    const touches: { temperature: number; recordedAt: Date }[] = [];
    const alerts: InserAlert[] = [];
    const states: { state: string; at: Date }[] = [];
    const diagnosticCalls: unknown[] = [];
    const enqueued: { alertId: string; deviceId: string; message: string }[] = [];
    const published: { event: DeviceUpdateEvent; afterCommit: boolean }[] = [];
    const pageCalls: unknown[][] = [];
    let alertInput: unknown;

    const temperatures = {
        withTransaction: async <T>(callback: (tx: object) => Promise<T>): Promise<T> => {
            const result = await callback(TX);
            committed = true;

            return result;
        },
        insertIgnoreDuplicate: () => {
            calls.push('store');

            return Promise.resolve(options.stored ?? true);
        },
        findPage: (...args: unknown[]) => {
            pageCalls.push(args);

            return Promise.resolve(options.page ?? { items: [], total: 0 });
        },
    };

    const devices = {
        findByCodeForUpdate: () => Promise.resolve(device),
        findAnyById: () => Promise.resolve(device),
        touch: (_id: string, reading: { temperature: number; recordedAt: Date }) => {
            calls.push('touch');
            touches.push(reading);

            return Promise.resolve();
        },
        updateState: (_id: string, state: string, at: Date) => {
            states.push({ state, at });

            return Promise.resolve({ stateChangedAt: at });
        },
    };

    const pauses = {
        isPaused: () => Promise.resolve(options.paused ?? false),
        findJustExpired: () => Promise.resolve(options.expiredPause ?? null),
    };

    const alertService = {
        record: (input: InserAlert) => {
            if (options.failAlertRecord) return Promise.reject(new Error('database went away'));

            alertInput = input;
            alerts.push(input);

            return Promise.resolve({ id: 'alert-1', ...input });
        },
    };

    const diagnostics = {
        record: (...args: unknown[]) => {
            diagnosticCalls.push(args);

            return Promise.resolve(true);
        },
    };

    const notifications = {
        enqueue: (input: { alertId: string; deviceId: string; message: string }) => {
            enqueued.push(input);

            return Promise.resolve([]);
        },
    };

    const events = {
        publish: (event: DeviceUpdateEvent) => void published.push({ event, afterCommit: committed }),
    };

    const service = new TemperatureService(
        temperatures as unknown as TemperatureRepository,
        devices as unknown as DeviceRepository,
        pauses as unknown as MonitoringPauseService,
        alertService as unknown as AlertService,
        diagnostics as unknown as DiagnosticService,
        notifications as unknown as NotificationOutboxService,
        events as unknown as DeviceEventService,
    );

    return {
        service,
        calls,
        touches,
        alerts,
        states,
        diagnosticCalls,
        enqueued,
        published,
        pageCalls,
        alertInput: () => alertInput,
    };
}

/** A reading 30 seconds newer than the fixture device's last one. */
function reading(overrides: Partial<TelemetryInput> = {}): TelemetryInput {
    return {
        deviceCode: 'FRZ-01',
        timestamp: '2026-10-15T00:00:30.000Z',
        temperature: -22,
        sensorFailCount: 0,
        wifiFailCount: 0,
        httpFailCount: 0,
        rssi: null,
        ...overrides,
    };
}

describe('TemperatureService.ingest: accepting a reading', () => {
    it('should reject a reading from an unknown device with a 404 that names the code', async () => {
        const { service } = setup({ device: null });

        await expect(service.ingest(reading({ deviceCode: 'NOPE-9' }))).rejects.toThrow(EntityNotFoundException);
        await expect(service.ingest(reading({ deviceCode: 'NOPE-9' }))).rejects.toThrow('NOPE-9');
    });

    it('should store the reading, move last seen forward and publish the live update', async () => {
        const { service, calls, touches, alerts, published } = setup();

        const ack = await service.ingest(reading({ temperature: -21.5 }));

        expect(ack).toEqual({
            deviceId: 'device-1',
            recordedAt: new Date('2026-10-15T00:00:30.000Z'),
            temperature: -21.5,
            duplicate: false,
        });
        expect(calls).toEqual(['store', 'touch']);
        expect(touches[0].temperature).toBe(-21.5);
        expect(alerts.length).toBe(0);
        expect(published.length).toBe(1);
        expect(published[0].event.state).toBe('NORMAL');
        expect(published[0].event.lastTemperature).toBe(-21.5);
        expect(published[0].event.paused).toBe(false);
    });

    it('should treat a retry of the same moment as a successful duplicate and do nothing else', async () => {
        const { service, calls, alerts, published, diagnosticCalls } = setup({ stored: false });

        const ack = await service.ingest(reading());

        expect(ack.duplicate).toBe(true);
        expect(calls).toEqual(['store']);
        expect(alerts.length).toBe(0);
        expect(published.length).toBe(0);
        expect(diagnosticCalls.length).toBe(0);
    });

    it('should hand the diagnostics the device sent to the diagnostic service', async () => {
        const { service, diagnosticCalls } = setup();

        await service.ingest(reading({ wifiFailCount: 3, rssi: -71 }));

        expect(diagnosticCalls.length).toBe(1);
    });
});

describe('TemperatureService.ingest: state changes', () => {
    it('should record an alert, queue a notification and publish when the device turns WARNING', async () => {
        const { service, alerts, states, enqueued, published } = setup();

        await service.ingest(reading({ temperature: -12 }));

        expect(alerts.length).toBe(1);
        expect(alerts[0]).toMatchObject({
            deviceId: 'device-1',
            fromState: 'NORMAL',
            toState: 'WARNING',
            reasonCode: 'WARNING_TEMPERATURE',
            temperature: -12,
        });
        expect(states[0].state).toBe('WARNING');

        expect(enqueued.length).toBe(1);
        expect(enqueued[0].alertId).toBe('alert-1');
        expect(enqueued[0].deviceId).toBe('device-1');
        expect(enqueued[0].message).toContain('*WARNING*');
        expect(enqueued[0].message).toContain('Gudang A / Chiller 1 (Pintu)');
        expect(enqueued[0].message).toContain('-12°C');

        expect(published[0].event.state).toBe('WARNING');
    });

    it('should queue a notification for CRITICAL as well', async () => {
        const { service, enqueued } = setup({ device: aDevice({ state: 'WARNING' }) });

        await service.ingest(reading({ temperature: -3 }));

        expect(enqueued[0].message).toContain('*CRITICAL*');
    });

    it('should record the alert but notify nobody for a state that is not WARNING or CRITICAL', async () => {
        const { service, alerts, enqueued } = setup({ device: aDevice({ state: 'WARNING' }) });

        await service.ingest(reading({ temperature: -17 }));

        expect(alerts[0]).toMatchObject({ fromState: 'WARNING', toState: 'DEFROST' });
        expect(enqueued.length).toBe(0);
    });

    it('should not touch state or alerts when the state stays the same', async () => {
        const { service, alerts, states, published } = setup({ device: aDevice({ state: 'WARNING' }) });

        await service.ingest(reading({ temperature: -12 }));

        expect(alerts.length).toBe(0);
        expect(states.length).toBe(0);
        expect(published[0].event.state).toBe('WARNING');
    });

    it('should report the temperature, with an offline note, when a silent device comes back critical', async () => {
        const { service, alerts, enqueued } = setup({
            device: aDevice({
                state: 'OFFLINE',
                lastSeenAt: new Date('2026-10-14T20:00:00.000Z'),
                lastTemperature: -21,
            }),
        });

        await service.ingest(reading({ temperature: -3 }));

        expect(alerts[0]).toMatchObject({
            fromState: 'OFFLINE',
            toState: 'CRITICAL',
            reasonCode: 'CRITICAL_TEMPERATURE',
        });
        expect(String(alerts[0].reason)).toContain('after being offline');
        expect(enqueued.length).toBe(1);
    });

    it('should explain an alert that comes right after a planned pause ran out of pull-down time', async () => {
        const { service, alerts } = setup({
            expiredPause: { kind: 'MACHINE_OFF', endedAt: new Date('2026-10-15T00:00:00.000Z') },
        });

        await service.ingest(reading({ temperature: -3 }));

        expect(String(alerts[0].reason)).toContain('machine-off period');
    });

    it('should use the device time of the reading as the moment of the alert', async () => {
        const { service, alerts } = setup();

        await service.ingest(reading({ temperature: -3 }));

        expect(alerts[0].occurredAt).toEqual(new Date('2026-10-15T00:00:30.000Z'));
    });
});

describe('TemperatureService.ingest: when alerts must not be raised', () => {
    it('should keep storing readings during a planned pause but change no state and raise no alert', async () => {
        const { service, calls, alerts, states, enqueued, published } = setup({ paused: true });

        await service.ingest(reading({ temperature: -3 }));

        expect(calls).toEqual(['store', 'touch']);
        expect(alerts.length).toBe(0);
        expect(states.length).toBe(0);
        expect(enqueued.length).toBe(0);
        expect(published[0].event.paused).toBe(true);
        expect(published[0].event.state).toBe('NORMAL');
    });

    it('should do the same for a device whose monitoring is switched off', async () => {
        const { service, alerts, states } = setup({ device: aDevice({ isActive: false }) });

        await service.ingest(reading({ temperature: -3 }));

        expect(alerts.length).toBe(0);
        expect(states.length).toBe(0);
    });

    it('should treat a late arrival as history only: stored, but no state change and no live update', async () => {
        const { service, calls, alerts, published } = setup({ device: aDevice({ state: 'CRITICAL' }) });

        // older than the device's last reading (00:00:00)
        const ack = await service.ingest(reading({ timestamp: '2026-10-14T23:59:00.000Z', temperature: -22 }));

        expect(ack.duplicate).toBe(false);
        expect(calls).toEqual(['store', 'touch']);
        expect(alerts.length).toBe(0);
        expect(published.length).toBe(0);
    });

    it('should treat the very first reading of a new device as the newest', async () => {
        const { service, alerts } = setup({
            device: aDevice({ lastRecordedAt: null, lastSeenAt: null, lastTemperature: null }),
        });

        await service.ingest(reading({ temperature: -3 }));

        expect(alerts.length).toBe(1);
    });
});

describe('TemperatureService.ingest: consistency', () => {
    it('should publish only after the transaction has committed', async () => {
        const { service, published } = setup();

        await service.ingest(reading({ temperature: -12 }));

        expect(published.every((entry) => entry.afterCommit)).toBe(true);
    });

    it('should publish nothing and let the error through when the transaction fails', async () => {
        const { service, published } = setup({ failAlertRecord: true });

        await expect(service.ingest(reading({ temperature: -12 }))).rejects.toThrow('database went away');
        expect(published.length).toBe(0);
    });
});

describe('TemperatureService.findReport', () => {
    const query = { deviceId: 'device-1', from: '2026-10-01', to: '2026-10-07', page: 2, pageSize: 50 };

    it('should say which of device, from and to is missing', async () => {
        const { service } = setup();

        const error = await service
            .findReport({ page: 1, pageSize: 50 })
            .then(() => null)
            .catch((e: unknown) => e);

        expect(error instanceof ValidationException).toBe(true);
        expect(Object.keys((error as ValidationException).errors ?? {}).sort()).toEqual(['deviceId', 'from', 'to']);
    });

    it('should return the readings of the page with the pagination metadata', async () => {
        const items: TemperatureReading[] = [
            {
                recordedAt: new Date('2026-10-15T00:00:30.000Z'),
                temperature: -22,
                receivedAt: new Date('2026-10-15T00:00:31.000Z'),
            },
        ];
        const { service, pageCalls } = setup({ page: { items, total: 101 } });

        const result = await service.findReport(query);

        expect(result.data).toEqual(items);
        expect(result.metadata).toEqual({ page: 2, pageSize: 50, totalItems: 101, totalPages: 3 });

        // findPage(deviceId, range, page, pageSize)
        expect(pageCalls[0][0]).toBe('device-1');
        expect(pageCalls[0][2]).toBe(2);
        expect(pageCalls[0][3]).toBe(50);
    });

    it('should report zero pages when nothing was recorded in the period', async () => {
        const { service } = setup();

        const result = await service.findReport(query);

        expect(result.data).toEqual([]);
        expect(result.metadata.totalItems).toBe(0);
        expect(result.metadata.totalPages).toBe(0);
    });

    it('should reject an unknown device with a 404 instead of an empty report', async () => {
        const { service, pageCalls } = setup({ device: null });

        await expect(service.findReport(query)).rejects.toThrow(EntityNotFoundException);
        expect(pageCalls.length).toBe(0);
    });
});
