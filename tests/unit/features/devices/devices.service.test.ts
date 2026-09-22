import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DevicesService } from '../../../../src/features/devices/devices.service';
import { NotFoundError, BadRequestError } from '../../../../src/shared/errors';
import type { DevicesRepository } from '../../../../src/features/devices/devices.repository';

function makeRepo(): DevicesRepository {
  return {
    create: vi.fn(),
    updateDevices: vi.fn(),
    findAllWithLatestTemperature: vi.fn(),
    findDeviceByIdWithAlert: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    deleteDevice: vi.fn(),
  } as unknown as DevicesRepository;
}

const device = {
  id: 'device-1',
  code: 'DEV-001',
  name: 'Fridge A',
  location: null,
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

describe('DevicesService', () => {
  let repo: DevicesRepository;
  let service: DevicesService;

  beforeEach(() => {
    repo = makeRepo();
    service = new DevicesService(repo);
  });

  describe('updateDevices', () => {
    it('should throw NotFoundError when the repository returns no updated row', async () => {
      vi.mocked(repo.updateDevices).mockResolvedValue(null);

      await expect(service.updateDevices('missing-id', { name: 'x' })).rejects.toThrow(NotFoundError);
    });

    it('should return the updated device when found', async () => {
      vi.mocked(repo.updateDevices).mockResolvedValue(device);

      const result = await service.updateDevices('device-1', { name: 'Fridge A' });

      expect(result).toEqual(device);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundError when the device does not exist', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(NotFoundError);
    });

    it('should return the device when found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(device);

      await expect(service.findById('device-1')).resolves.toEqual(device);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundError when the device does not exist', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.delete('missing-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError when the device is already inactive', async () => {
      vi.mocked(repo.findById).mockResolvedValue({ ...device, isActive: false });

      await expect(service.delete('device-1')).rejects.toThrow(BadRequestError);
    });

    it('should soft-delete an active device', async () => {
      vi.mocked(repo.findById).mockResolvedValue(device);
      vi.mocked(repo.deleteDevice).mockResolvedValue({ ...device, isActive: false });

      const result = await service.delete('device-1');

      expect(repo.deleteDevice).toHaveBeenCalledWith('device-1');
      expect(result.isActive).toBe(false);
    });
  });

  describe('renderStatusPage', () => {
    it('should flatten the latest temperature log onto each device, defaulting to null when absent', async () => {
      vi.mocked(repo.findAllWithLatestTemperature).mockResolvedValue([
        { ...device, temperatureLogs: [{ temperature: 4.2 }] } as any,
        { ...device, id: 'device-2', temperatureLogs: [] } as any,
      ]);

      const result = await service.renderStatusPage();

      expect(result[0].lastTemperature).toBe(4.2);
      expect(result[1].lastTemperature).toBeNull();
    });
  });
});
