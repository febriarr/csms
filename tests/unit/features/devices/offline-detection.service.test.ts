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

import { OfflineDetectionService } from '../../../../src/features/devices/offline-detection.service';
import type { DevicesRepository } from '../../../../src/features/devices/devices.repository';
import type { AlertsRepository } from '../../../../src/features/alerts/alerts.repository';
import type { NotificationsRecipientsRepository } from '../../../../src/features/notifications-recipients/notifications-recipients.repository';

const staleDevice = {
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
  lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setup() {
  const deviceRepo = {
    findStaleDevices: vi.fn(),
    withTransaction: vi.fn(async (cb: any) => cb({} as any)),
    updateState: vi.fn(async (_id: string, state: string) => ({ ...staleDevice, state })),
  } as unknown as DevicesRepository;

  const alertRepo = { create: vi.fn(async () => ({})) } as unknown as AlertsRepository;
  const notificationRepo = { findActiveByChannel: vi.fn(async () => []) } as unknown as NotificationsRecipientsRepository;

  const service = new OfflineDetectionService(deviceRepo, alertRepo, notificationRepo);
  return { service, deviceRepo, alertRepo, notificationRepo };
}

describe('OfflineDetectionService.run', () => {
  beforeEach(() => {
    queueAddMock.mockReset();
    broadcastMock.mockReset();
  });

  it('should do nothing when there are no stale devices', async () => {
    const { service, deviceRepo, alertRepo } = setup();
    vi.mocked(deviceRepo.findStaleDevices).mockResolvedValue([]);

    await service.run();

    expect(alertRepo.create).not.toHaveBeenCalled();
    expect(broadcastMock).not.toHaveBeenCalled();
  });

  it('should mark a stale device OFFLINE and create an alert with reason DEVICE_OFFLINE', async () => {
    const { service, deviceRepo, alertRepo } = setup();
    vi.mocked(deviceRepo.findStaleDevices).mockResolvedValue([staleDevice]);

    await service.run();

    expect(deviceRepo.updateState).toHaveBeenCalledWith('device-1', 'OFFLINE', expect.anything());
    expect(alertRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ fromState: 'NORMAL', toState: 'OFFLINE', reasonCode: 'DEVICE_OFFLINE' }),
      expect.anything()
    );
  });

  it('should enqueue a WhatsApp job with priority 1 when active recipients exist', async () => {
    const { service, deviceRepo, notificationRepo } = setup();
    vi.mocked(deviceRepo.findStaleDevices).mockResolvedValue([staleDevice]);
    vi.mocked(notificationRepo.findActiveByChannel).mockResolvedValue([
      { id: 'r1', name: 'Ops', channel: 'whatsapp', target: '081234567890', isActive: true, createdAt: new Date() },
    ]);

    await service.run();

    expect(queueAddMock).toHaveBeenCalledWith(
      'bulk-alert',
      expect.objectContaining({ severity: 'OFFLINE' }),
      expect.objectContaining({ priority: 1 })
    );
  });

  it('should not enqueue a WhatsApp job when there are no active recipients', async () => {
    const { service, deviceRepo } = setup();
    vi.mocked(deviceRepo.findStaleDevices).mockResolvedValue([staleDevice]);

    await service.run();

    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it('should continue processing remaining devices when one device fails', async () => {
    const { service, deviceRepo } = setup();
    const secondDevice = { ...staleDevice, id: 'device-2', code: 'DEV-002' };
    vi.mocked(deviceRepo.findStaleDevices).mockResolvedValue([staleDevice, secondDevice]);
    vi.mocked(deviceRepo.withTransaction)
      .mockRejectedValueOnce(new Error('DB error for device-1'))
      .mockImplementationOnce(async (cb: any) => cb({} as any));

    await expect(service.run()).resolves.not.toThrow();
    expect(deviceRepo.withTransaction).toHaveBeenCalledTimes(2);
  });

  it('should not include lastTemperature in the SSE broadcast payload', async () => {
    const { service, deviceRepo } = setup();
    vi.mocked(deviceRepo.findStaleDevices).mockResolvedValue([staleDevice]);

    await service.run();

    const payload = broadcastMock.mock.calls[0][1];
    expect(payload).not.toHaveProperty('lastTemperature');
  });
});
