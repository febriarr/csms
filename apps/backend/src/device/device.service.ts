import { EntityNotFoundException, ValidationException } from '@/common/exception/app.exception';
import { InsertDevices } from '@/database/schema';

import { Injectable } from '@nestjs/common';
import {
    thresholdOrderIssues,
    type CreateDeviceInput,
    type DeviceQuery,
    type UpdateDeviceInput,
} from '@workspace/validator';

import { DeviceRepository } from './device.repository';
import { DeviceMonitoring, DeviceView, SuppressingPause } from '@workspace/shared';
import { MonitoringPauseService } from '@/monitoring_pause/monitoring_pause.service';

@Injectable()
export class DeviceService {
    constructor(
        private readonly repo: DeviceRepository,
        private readonly pauses: MonitoringPauseService,
    ) {}

    /** Devices with whether they are currently paused, judged by the same rule the telemetry service uses. */
    async findAll(query: DeviceQuery): Promise<DeviceView[]> {
        const devices = await this.repo.findMany(query);
        const suppressing = await this.pauses.findSuppressing(
            devices.map((device) => device.id),
            new Date(),
        );

        return devices.map((device) => ({ ...device, monitoring: this.monitoringOf(suppressing.get(device.id)) }));
    }

    async findOne(id: string): Promise<DeviceView> {
        const device = await this.repo.findOneWithPlace(id);

        if (!device) throw new EntityNotFoundException('Device', id);

        const suppressing = await this.pauses.findSuppressing([id], new Date());

        return { ...device, monitoring: this.monitoringOf(suppressing.get(id)) };
    }

    /**
     * A duplicate code is not checked here: the unique index is the only check that cannot lose a race, and the
     * exception filter turns its violation into a 409 on the `code` field.
     */
    async create(input: CreateDeviceInput): Promise<DeviceView> {
        if (!(await this.repo.coldStorageExists(input.coldStorageId))) {
            throw new EntityNotFoundException('Cold storage', input.coldStorageId);
        }

        const created = await this.repo.create({
            code: input.code,
            name: input.name,
            coldStorageId: input.coldStorageId,
            pointLabel: input.pointLabel ?? null,
            defrostThreshold: input.defrostThreshold ?? null,
            warningThreshold: input.warningThreshold,
            criticalThreshold: input.criticalThreshold,
            heartbeatIntervalSeconds: input.heartbeatIntervalSeconds,
            firmwareVersion: input.firmwareVersion ?? null,
        });

        return this.findOne(created.id);
    }

    /**
     * A partial update can break the threshold order only in combination with the stored values (sending just a new
     * warning threshold that lands above the stored critical one), which the validator cannot see. So the order is
     * checked again here on the merged result, with a message that names the field, before the database CHECK
     * would refuse it with a generic one.
     */
    async update(id: string, input: UpdateDeviceInput): Promise<DeviceView> {
        const existing = await this.repo.findPlain(id);

        if (!existing) throw new EntityNotFoundException('Device', id);

        const issues = thresholdOrderIssues({
            defrostThreshold: input.defrostThreshold !== undefined ? input.defrostThreshold : existing.defrostThreshold,
            warningThreshold: input.warningThreshold ?? existing.warningThreshold,
            criticalThreshold: input.criticalThreshold ?? existing.criticalThreshold,
        });

        if (issues.length > 0) {
            throw new ValidationException(Object.fromEntries(issues.map((issue) => [issue.path, [issue.message]])));
        }

        if (
            input.coldStorageId !== undefined &&
            input.coldStorageId !== existing.coldStorageId &&
            !(await this.repo.coldStorageExists(input.coldStorageId))
        ) {
            throw new EntityNotFoundException('Cold storage', input.coldStorageId);
        }

        const changes: Partial<InsertDevices> = { ...input };
        const updated = await this.repo.updateById(id, changes);

        if (!updated) throw new EntityNotFoundException('Device', id);

        return this.findOne(id);
    }

    /**
     * Soft delete. Readings, alerts and diagnostics stay (they are kept for audit), the device disappears from the
     * lists and its code can be reused. Pauses and subscriptions that point at it are left alone: nothing evaluates
     * a deleted device, so they are inert.
     */
    async remove(id: string, userId: string): Promise<void> {
        if (!(await this.repo.softDelete(id, userId, new Date()))) {
            throw new EntityNotFoundException('Device', id);
        }
    }

    private monitoringOf(suppressing: SuppressingPause | undefined): DeviceMonitoring {
        return this.pauses.toMonitoring(suppressing);
    }
}
