import { describe, expect, it, vi, beforeEach } from 'vitest';

const { queueAddMock, broadcastMock } = vi.hoisted(() => ({
  queueAddMock: vi.fn(),
  broadcastMock: vi.fn(),
}));

vi.mock('../../../../src/shared/whatsapp/whatsapp.queue', () => ({
  whatsappQueue: { add: queueAddMock },
}));

vi.mock('../../../../src/sse/device-events', () => ({
  deviceEventBus: { broadcast: broadcastMock },
}));

import { TemperatureService } from '../../../../src/features/temperature/temperature.service';
import { NotFoundError } from '../../../../src/shared/errors';
import type { TemperatureRepository } from '../../../../src/features/temperature/temperature.repository';
import type { DevicesRepository } from '../../../../src/features/devices/devices.repository';
import type { AlertsRepository } from '../../../../src/features/alerts/alerts.repository';
import type { NotificationsRecipientsRepository } from '../../../../src/features/notifications-recipients/notifications-recipients.repository';
import type { DeviceDiagnosticLogsRepository } from '../../../../src/features/device-diagnostic-logs/device-diagnostic-logs.repository';

const baseDevice = {
  id: 'device-1',
  code: 'DEV-001',
  name: 'Fridge A',
  location: 'WH1',
  defrostThreshold: 0,
  warningThreshold: 5,
  criticalThreshold: 10,
  state: 'NORMAL' as const,
  isActive: true,
  stateChangedAt: null,
  lastSeenAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const basePayload = {
  deviceCode: 'DEV-001',
  timestamp: '2026-01-15T10:00:00.000Z',
  temperature: 2,
  sensorFailCount: 0,
  wifiFailCount: 0,
  httpFailCount: 0,
  rssi: null,
  reason: null,
};

function makeTx() {
  return {} as any;
}

function setup() {
  const tx = makeTx();

  const temperatureRepo = {
    withTransaction: vi.fn(async (cb: any) => cb(tx)),
    create: vi.fn(async (data: any) => ({ id: 'log-1', ...data })),
  } as unknown as TemperatureRepository;

  const deviceRepo = {
    findByCode: vi.fn(async () => baseDevice),
    updateLastSeen: vi.fn(async () => ({ ...baseDevice, lastSeenAt: new Date() })),
    updateState: vi.fn(async (_id: string, state: string) => ({ ...baseDevice, state })),
  } as unknown as DevicesRepository;

  const alertRepo = {
    create: vi.fn(async () => ({})),
  } as unknown as AlertsRepository;

  const notificationRepo = {
    findActiveByChannel: vi.fn(async () => []),
  } as unknown as NotificationsRecipientsRepository;

  const diagnosticsRepo = {
    create: vi.fn(async () => ({})),
  } as unknown as DeviceDiagnosticLogsRepository;

  const service = new TemperatureService(temperatureRepo, deviceRepo, alertRepo, notificationRepo, diagnosticsRepo);

  return { service, temperatureRepo, deviceRepo, alertRepo, notificationRepo, diagnosticsRepo };
}

describe('TemperatureService.create', () => {
  beforeEach(() => {
    queueAddMock.mockReset();
    broadcastMock.mockReset();
  });

  it('should throw NotFoundError when the device code does not exist', async () => {
    const { service, deviceRepo } = setup();
    vi.mocked(deviceRepo.findByCode).mockResolvedValue(undefined);

    await expect(service.create(basePayload)).rejects.toThrow(NotFoundError);
  });

  it('should insert the temperature log and update lastSeenAt without changing state when temperature stays NORMAL', async () => {
    const { service, temperatureRepo, deviceRepo, alertRepo } = setup();

    const result = await service.create({ ...basePayload, temperature: -5 });

    expect(temperatureRepo.create).toHaveBeenCalledOnce();
    expect(deviceRepo.updateLastSeen).toHaveBeenCalledWith('device-1', expect.anything());
    expect(deviceRepo.updateState).not.toHaveBeenCalled();
    expect(alertRepo.create).not.toHaveBeenCalled();
    expect(queueAddMock).not.toHaveBeenCalled();
    expect(result.deviceId).toBe('device-1');
  });

  it('should not create a diagnostics log entry when there is no diagnostic issue', async () => {
    const { service, diagnosticsRepo } = setup();

    await service.create(basePayload);

    expect(diagnosticsRepo.create).not.toHaveBeenCalled();
  });

  it('should create a diagnostics log entry when sensorFailCount is greater than 0', async () => {
    const { service, diagnosticsRepo } = setup();

    await service.create({ ...basePayload, sensorFailCount: 3 });

    expect(diagnosticsRepo.create).toHaveBeenCalledOnce();
  });

  it('should transition device state, create an alert, and enqueue a WhatsApp job on entering WARNING with active recipients', async () => {
    const { service, deviceRepo, alertRepo, notificationRepo } = setup();
    vi.mocked(notificationRepo.findActiveByChannel).mockResolvedValue([
      { id: 'r1', name: 'Ops', channel: 'whatsapp', target: '081234567890', isActive: true, createdAt: new Date() },
    ]);

    await service.create({ ...basePayload, temperature: 6 }); // >= warningThreshold(5), < critical(10)

    expect(deviceRepo.updateState).toHaveBeenCalledWith('device-1', 'WARNING', expect.anything());
    expect(alertRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ fromState: 'NORMAL', toState: 'WARNING', reasonCode: 'WARNING_TEMPERATURE' }),
      expect.anything()
    );
    expect(queueAddMock).toHaveBeenCalledWith(
      'bulk-alert',
      expect.objectContaining({ severity: 'WARNING', recipients: ['6281234567890@s.whatsapp.net'] }),
      expect.objectContaining({ priority: 5 })
    );
  });

  it('should use priority 1 for a CRITICAL alert job (higher than WARNING priority 5)', async () => {
    const { service, notificationRepo } = setup();
    vi.mocked(notificationRepo.findActiveByChannel).mockResolvedValue([
      { id: 'r1', name: 'Ops', channel: 'whatsapp', target: '081234567890', isActive: true, createdAt: new Date() },
    ]);

    await service.create({ ...basePayload, temperature: 12 }); // >= criticalThreshold(10)

    expect(queueAddMock).toHaveBeenCalledWith(
      'bulk-alert',
      expect.objectContaining({ severity: 'CRITICAL' }),
      expect.objectContaining({ priority: 1 })
    );
  });

  it('should not enqueue a WhatsApp job when there are no active recipients, even on a CRITICAL transition', async () => {
    const { service, alertRepo, notificationRepo } = setup();
    vi.mocked(notificationRepo.findActiveByChannel).mockResolvedValue([]);

    await service.create({ ...basePayload, temperature: 12 });

    // alert row is still created...
    expect(alertRepo.create).toHaveBeenCalledOnce();
    // ...but no WhatsApp job, since there's nobody to send to.
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it('should broadcast a device-update SSE event on every ingested reading', async () => {
    const { service } = setup();

    await service.create(basePayload);

    expect(broadcastMock).toHaveBeenCalledWith(
      'device-update',
      expect.objectContaining({ id: 'device-1', lastTemperature: basePayload.temperature })
    );
  });

  it('should not enqueue any WhatsApp job when the state does not change (e.g. NORMAL -> NORMAL)', async () => {
    const { service } = setup();

    await service.create({ ...basePayload, temperature: -10 });

    expect(queueAddMock).not.toHaveBeenCalled();
  });
});
