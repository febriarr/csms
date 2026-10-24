import { BaseRepository } from '@/common/abstracts/base.repository';
import { containsPattern } from '@/common/utils/like.util';
import { DatabaseService } from '@/database/database.service';
import { DatabaseTransaction } from '@/database/database.type';
import {
    coldStorages,
    devices,
    DevicesState,
    divisions,
    InsertDevices,
    locations,
    SelectDevices,
} from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { DeviceWithPlace } from '@workspace/shared';
import type { DeviceQuery } from '@workspace/validator';
import { and, asc, eq, getTableColumns, ilike, isNotNull, isNull, ne, or, sql, SQL } from 'drizzle-orm';
import { OFFLINE_AFTER_MISSED_HEARTBEATS } from './device.constant';

type PlaceRow = {
    device: SelectDevices;
    coldStorageName: string;
    locationId: string;
    locationName: string;
    divisionId: string;
    divisionName: string;
};

@Injectable()
export class DeviceRepository extends BaseRepository<typeof devices> {
    constructor(db: DatabaseService) {
        super(db, devices);
    }

    /** Active (not soft-deleted) devices, filtered, by name. */
    async findMany(query: DeviceQuery): Promise<DeviceWithPlace[]> {
        const rows = await this.selectWithPlace()
            .where(
                and(
                    isNull(devices.deletedAt),
                    query.search
                        ? or(
                              ilike(devices.name, containsPattern(query.search)),
                              ilike(devices.code, containsPattern(query.search)),
                          )
                        : undefined,
                    query.divisionId ? eq(locations.divisionId, query.divisionId) : undefined,
                    query.locationId ? eq(coldStorages.locationId, query.locationId) : undefined,
                    query.coldStorageId ? eq(devices.coldStorageId, query.coldStorageId) : undefined,
                ),
            )
            .orderBy(asc(devices.name));

        return rows.map(toDeviceWithPlace);
    }

    async findOneWithPlace(id: string, tx?: DatabaseTransaction): Promise<DeviceWithPlace | null> {
        const [row] = await this.selectWithPlace(tx)
            .where(and(eq(devices.id, id), isNull(devices.deletedAt)))
            .limit(1);

        return row ? toDeviceWithPlace(row) : null;
    }

    /**
     * Reads a device by its code AND locks its row until the transaction ends (SELECT ... FOR UPDATE). Two readings
     * of the same device are therefore processed one after the other, which is what keeps the state transition and
     * its alert from being created twice. Only the device row is locked, not the places joined to it.
     */
    async findByCodeForUpdate(code: string, tx: DatabaseTransaction): Promise<DeviceWithPlace | null> {
        const [row] = await this.selectWithPlace(tx)
            .where(and(eq(devices.code, code), isNull(devices.deletedAt)))
            .limit(1)
            .for('update', { of: devices });

        return row ? toDeviceWithPlace(row) : null;
    }

    async findByIdForUpdate(id: string, tx: DatabaseTransaction): Promise<DeviceWithPlace | null> {
        const [row] = await this.selectWithPlace(tx)
            .where(and(eq(devices.id, id), isNull(devices.deletedAt)))
            .limit(1)
            .for('update', { of: devices });

        return row ? toDeviceWithPlace(row) : null;
    }

    async findPlain(id: string, tx?: DatabaseTransaction): Promise<SelectDevices | null> {
        const [row] = await this.executor(tx)
            .select()
            .from(devices)
            .where(and(eq(devices.id, id), isNull(devices.deletedAt)))
            .limit(1);

        return row ?? null;
    }

    /** Like findPlain, but a soft-deleted device is found too: reports about the past must still resolve it. */
    async findAnyById(id: string): Promise<SelectDevices | null> {
        const [row] = await this.db.select().from(devices).where(eq(devices.id, id)).limit(1);

        return row ?? null;
    }

    async coldStorageExists(id: string): Promise<boolean> {
        const [row] = await this.db
            .select({ id: coldStorages.id })
            .from(coldStorages)
            .where(eq(coldStorages.id, id))
            .limit(1);

        return row !== undefined;
    }

    async updateById(id: string, input: Partial<InsertDevices>): Promise<SelectDevices | undefined> {
        return this.update(and(eq(devices.id, id), isNull(devices.deletedAt)) as SQL, input);
    }

    /** Soft delete: the row stays (its readings and alerts are audit data), but it frees its code and disappears. */
    async softDelete(id: string, deletedBy: string, now: Date): Promise<boolean> {
        const rows = await this.db
            .update(devices)
            .set({ deletedAt: now, deletedBy })
            .where(and(eq(devices.id, id), isNull(devices.deletedAt)))
            .returning({ id: devices.id });

        return rows.length > 0;
    }

    /**
     * Records that the device just reported: `last_seen_at` always moves; the last reading (`last_temperature`,
     * `last_recorded_at`) only moves when this reading is newer than the stored one, so a late arrival cannot turn
     * the screen back. PostgreSQL evaluates every SET expression against the OLD row, so both CASE expressions see
     * the same `last_recorded_at`. `updated_at` is kept: a heartbeat is not an edit of the device.
     */
    async touch(
        id: string,
        reading: { temperature: number; recordedAt: Date },
        tx?: DatabaseTransaction,
    ): Promise<void> {
        const isNewer = sql`(${devices.lastRecordedAt} IS NULL OR ${devices.lastRecordedAt} < ${reading.recordedAt}::timestamptz)`;

        await this.executor(tx)
            .update(devices)
            .set({
                lastSeenAt: sql`now()`,
                lastTemperature: sql`CASE WHEN ${isNewer} THEN ${reading.temperature}::real ELSE ${devices.lastTemperature} END`,
                lastRecordedAt: sql`CASE WHEN ${isNewer} THEN ${reading.recordedAt}::timestamptz ELSE ${devices.lastRecordedAt} END`,
                updatedAt: sql`${devices.updatedAt}`,
            })
            .where(eq(devices.id, id));
    }

    async updateState(
        id: string,
        state: DevicesState,
        at: Date,
        tx?: DatabaseTransaction,
    ): Promise<SelectDevices | undefined> {
        return this.update(eq(devices.id, id), { state, stateChangedAt: at }, tx);
    }

    /**
     * Ids of the devices that look silent: monitored, not deleted, not already OFFLINE, and not heard from for more
     * than heartbeat x OFFLINE_AFTER_MISSED_HEARTBEATS. It is only a shortlist: each one is re-checked under a lock
     * before it is marked offline.
     */
    async findStaleIds(now: Date): Promise<string[]> {
        const rows = await this.db
            .select({ id: devices.id })
            .from(devices)
            .where(
                and(
                    eq(devices.isActive, true),
                    isNull(devices.deletedAt),
                    ne(devices.state, 'OFFLINE'),
                    isNotNull(devices.lastSeenAt),
                    sql`${devices.lastSeenAt} < ${now}::timestamptz - make_interval(secs => ${devices.heartbeatIntervalSeconds} * ${OFFLINE_AFTER_MISSED_HEARTBEATS})`,
                ),
            );

        return rows.map((row) => row.id);
    }

    private selectWithPlace(tx?: DatabaseTransaction) {
        return this.executor(tx)
            .select({
                device: getTableColumns(devices),
                coldStorageName: coldStorages.name,
                locationId: locations.id,
                locationName: locations.name,
                divisionId: divisions.id,
                divisionName: divisions.name,
            })
            .from(devices)
            .innerJoin(coldStorages, eq(coldStorages.id, devices.coldStorageId))
            .innerJoin(locations, eq(locations.id, coldStorages.locationId))
            .innerJoin(divisions, eq(divisions.id, locations.divisionId));
    }
}

function toDeviceWithPlace({ device, ...place }: PlaceRow): DeviceWithPlace {
    return { ...device, ...place };
}
